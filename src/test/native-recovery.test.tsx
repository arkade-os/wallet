import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  restore: vi.fn(),
  appMounts: 0,
  roots: [] as { unmount(): void }[],
}))
vi.mock('react-dom/client', async (original) => {
  const client = await original<typeof import('react-dom/client')>()
  return {
    ...client,
    default: {
      createRoot: (container: HTMLElement) => {
        const root = client.createRoot(container)
        mocks.roots.push(root)
        return root
      },
    },
  }
})
vi.mock('../App', () => ({ default: () => null }))
vi.mock('../providers/devMode', () => ({
  DevModeProvider: () => {
    mocks.appMounts++
    return <main>Wallet providers mounted</main>
  },
}))
vi.mock('../providers/language', async (original) => ({
  ...(await original<typeof import('../providers/language')>()),
  LanguageProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('../lib/secretStore', async (original) => ({
  ...(await original<typeof import('../lib/secretStore')>()),
  initializeSecretStore: mocks.initialize,
}))
vi.mock('../lib/nativeStateBackup', async (original) => ({
  ...(await original<typeof import('../lib/nativeStateBackup')>()),
  hasPendingNativeStateRestore: () => true,
  importNativeStateBackup: mocks.restore,
}))
vi.mock('../lib/serviceWorkerTakeover', () => ({ reloadOnWorkerTakeover: vi.fn() }))

const host = window as any
const invoke = vi.fn()
const listeners = new Map<string, (value: any) => void>()
const unregister = vi.fn()
beforeEach(() => {
  vi.resetModules()
  mocks.initialize.mockReset().mockResolvedValue(undefined)
  mocks.restore.mockReset().mockRejectedValue(new Error('USER_CANCELLED'))
  mocks.appMounts = 0
  invoke.mockReset().mockResolvedValue(null)
  unregister.mockReset()
  listeners.clear()
  localStorage.clear()
  document.body.innerHTML = '<div id="root"></div>'
  host.__ARKADE_NATIVE__ = { version: 1, platform: 'android' }
  host.__TAURI__ = {
    core: {
      invoke,
      addPluginListener: vi.fn(async (_plugin: string, event: string, callback: (value: any) => void) => {
        listeners.set(event, callback)
        return {
          unregister: async () => {
            unregister(event)
            if (listeners.get(event) === callback) listeners.delete(event)
          },
        }
      }),
    },
  }
})
afterEach(async () => {
  await act(async () => mocks.roots.splice(0).forEach((root) => root.unmount()))
  delete host.__ARKADE_NATIVE__
  delete host.__TAURI__
  document.body.innerHTML = ''
})
const start = () =>
  act(async () => {
    await import('../index')
  })
const open = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Restore encrypted wallet backup' }))
  await screen.findByLabelText('Backup password')
}

it('dismisses an idle recovery sheet on Android Back and clears the form without opening the wallet', async () => {
  await start()
  await open()
  await waitFor(() => expect(invoke).toHaveBeenLastCalledWith('plugin:wallet|set_back_handler', { enabled: true }))
  fireEvent.change(screen.getByLabelText('Backup password'), { target: { value: 'fixture restore password' } })
  fireEvent.click(screen.getByRole('checkbox'))
  act(() => listeners.get('back')?.({}))
  await waitFor(() => expect(invoke).toHaveBeenLastCalledWith('plugin:wallet|set_back_handler', { enabled: false }))
  await open()
  expect(screen.getByLabelText('Backup password')).toHaveValue('')
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(mocks.restore).not.toHaveBeenCalled()
  expect(mocks.appMounts).toBe(0)
  expect([...listeners.keys()].sort()).toEqual(['back', 'lifecycle'])
  expect(invoke.mock.calls.every(([command]) => command === 'plugin:wallet|set_back_handler')).toBe(true)
})

it('consumes Back while an import is busy and retains the submitted operation', async () => {
  let cancel!: (error: Error) => void
  mocks.restore.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      cancel = reject
    }),
  )
  await start()
  await open()
  await waitFor(() => expect(listeners.has('back')).toBe(true))
  fireEvent.change(screen.getByLabelText('Backup password'), { target: { value: 'fixture restore password' } })
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Choose backup and restore' }))
  await waitFor(() => expect(mocks.restore).toHaveBeenCalledOnce())
  act(() => listeners.get('back')?.({}))
  expect(screen.getByLabelText('Backup password')).toBeDisabled()
  expect(screen.getByRole('checkbox')).toBeChecked()
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  expect(invoke).toHaveBeenLastCalledWith('plugin:wallet|set_back_handler', { enabled: true })
  await act(async () => cancel(new Error('USER_CANCELLED')))
  await waitFor(() => expect(invoke).toHaveBeenLastCalledWith('plugin:wallet|set_back_handler', { enabled: false }))
  expect(mocks.restore).toHaveBeenCalledExactlyOnceWith('fixture restore password')
  expect(mocks.appMounts).toBe(0)
})

it('forwards mobile lifecycle before wallet providers exist and stops forwarding after cleanup', async () => {
  const paused = vi.fn()
  const resumed = vi.fn()
  window.addEventListener('arkade-native-paused', paused)
  window.addEventListener('arkade-native-resumed', resumed)
  try {
    await start()
    await open()
    await waitFor(() => expect(listeners.has('lifecycle')).toBe(true))
    fireEvent.change(screen.getByLabelText('Backup password'), { target: { value: 'fixture restore password' } })
    fireEvent.click(screen.getByRole('checkbox'))
    const lifecycle = listeners.get('lifecycle')!
    const back = listeners.get('back')!
    act(() => lifecycle({ state: 'paused' }))
    expect(screen.getByLabelText('Backup password')).toHaveValue('')
    expect(screen.getByRole('checkbox')).toBeChecked()
    act(() => lifecycle({ state: 'resumed' }))
    expect(paused).toHaveBeenCalledOnce()
    expect(resumed).toHaveBeenCalledOnce()
    await act(async () => mocks.roots.splice(0).forEach((root) => root.unmount()))
    expect(unregister.mock.calls.map(([event]) => event).sort()).toEqual(['back', 'lifecycle'])
    expect(invoke).toHaveBeenLastCalledWith('plugin:wallet|set_back_handler', { enabled: false })
    const closeOtherSheet = vi.fn()
    const { registerNativeBack } = await import('../lib/nativeBack')
    const dispose = registerNativeBack(closeOtherSheet)
    try {
      act(() => {
        back({})
        lifecycle({ state: 'paused' })
        lifecycle({ state: 'resumed' })
      })
      expect(closeOtherSheet).not.toHaveBeenCalled()
      expect(paused).toHaveBeenCalledOnce()
      expect(resumed).toHaveBeenCalledOnce()
    } finally {
      dispose()
    }
    expect(mocks.appMounts).toBe(0)
  } finally {
    window.removeEventListener('arkade-native-paused', paused)
    window.removeEventListener('arkade-native-resumed', resumed)
  }
})

it('disposes mobile listeners that finish registering after recovery unmounts', async () => {
  const finish: (() => void)[] = []
  host.__TAURI__.core.addPluginListener.mockImplementation(
    async (_plugin: string, event: string, callback: (value: any) => void) => {
      listeners.set(event, callback)
      return new Promise<{ unregister(): Promise<void> }>((resolve) => {
        finish.push(() =>
          resolve({
            unregister: async () => {
              unregister(event)
            },
          }),
        )
      })
    },
  )
  await start()
  await open()
  expect(finish).toHaveLength(2)
  await act(async () => mocks.roots.splice(0).forEach((root) => root.unmount()))
  const closeOtherSheet = vi.fn()
  const { registerNativeBack } = await import('../lib/nativeBack')
  const dispose = registerNativeBack(closeOtherSheet)
  try {
    await act(async () => finish.forEach((resolve) => resolve()))
    expect(unregister.mock.calls.map(([event]) => event).sort()).toEqual(['back', 'lifecycle'])
    act(() => listeners.get('back')?.({}))
    expect(closeOtherSheet).not.toHaveBeenCalled()
    expect(invoke).toHaveBeenLastCalledWith('plugin:wallet|set_back_handler', { enabled: false })
  } finally {
    dispose()
  }
})

it.each(['ios', 'desktop'])('keeps Android Back and payment intake out of %s recovery', async (platform) => {
  host.__ARKADE_NATIVE__.platform = platform
  await start()
  await open()
  expect(listeners.has('back')).toBe(false)
  expect(invoke).not.toHaveBeenCalled()
  if (platform === 'ios') await waitFor(() => expect(listeners.has('lifecycle')).toBe(true))
  else expect(listeners.size).toBe(0)
  expect(mocks.appMounts).toBe(0)
})
