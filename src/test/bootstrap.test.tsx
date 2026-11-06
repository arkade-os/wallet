import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  pendingRestore: false,
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
    return <main>Wallet providers ready</main>
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
  hasPendingNativeStateRestore: () => mocks.pendingRestore,
}))
vi.mock('../components/NativeStateBackup', () => ({ default: () => <div>Encrypted backup picker</div> }))
vi.mock('../lib/serviceWorkerTakeover', () => ({ reloadOnWorkerTakeover: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  mocks.initialize.mockReset()
  mocks.pendingRestore = false
  mocks.appMounts = 0
  localStorage.clear()
  document.body.innerHTML = '<div id="root"></div>'
})

afterEach(async () => {
  await act(async () => mocks.roots.splice(0).forEach((root) => root.unmount()))
  document.body.innerHTML = ''
})

const start = () =>
  act(async () => {
    await import('../index')
  })

describe('secure storage bootstrap recovery', () => {
  it('preserves an unsupported stored wallet before opening secrets or mounting onboarding', async () => {
    const wallet = JSON.stringify({
      nextRollover: 0,
      pubkey: `02${'11'.repeat(32)}`,
      signer: { type: 'native', publicKey: `02${'11'.repeat(32)}`, name: 'External signer' },
    })
    localStorage.setItem('wallet', wallet)
    localStorage.setItem('encrypted_mnemonic', 'existing encrypted credential')
    mocks.initialize.mockResolvedValue(undefined)

    await start()

    expect(mocks.initialize).not.toHaveBeenCalled()
    expect(mocks.appMounts).toBe(0)
    expect(screen.getByRole('alert')).toHaveTextContent('This build does not support the stored wallet')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(localStorage.getItem('wallet')).toBe(wallet)
    expect(localStorage.getItem('encrypted_mnemonic')).toBe('existing encrypted credential')
  })

  it('retries storage in place and keeps wallet providers closed until access succeeds', async () => {
    let unlock!: () => void
    const unlocked = new Promise<void>((resolve) => {
      unlock = resolve
    })
    mocks.initialize.mockRejectedValueOnce(new Error('private native diagnostic')).mockReturnValueOnce(unlocked)
    await start()
    expect(await screen.findByRole('alert')).toHaveTextContent('Wallet storage unavailable')
    expect(mocks.appMounts).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(mocks.initialize).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent('Opening secure storage')
    expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Checking…' }))
    expect(mocks.initialize).toHaveBeenCalledTimes(2)
    expect(mocks.appMounts).toBe(0)
    await act(async () => unlock())
    expect(await screen.findByText('Wallet providers ready')).toBeInTheDocument()
    expect(mocks.appMounts).toBe(1)
  })

  it('retains a retryable error after another failure without displaying native diagnostics', async () => {
    mocks.initialize.mockRejectedValue(new Error('private native diagnostic'))
    await start()
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unlock your device’s secure storage or desktop keyring')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
    expect(document.body).not.toHaveTextContent('private native diagnostic')
    expect(mocks.initialize).toHaveBeenCalledTimes(2)
    expect(mocks.appMounts).toBe(0)
  })

  it('returns to the interrupted backup restore after retry instead of opening the wallet', async () => {
    mocks.initialize.mockRejectedValueOnce(new Error('locked')).mockResolvedValueOnce(undefined)
    mocks.pendingRestore = true
    await start()
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'Finish restoring your wallet' })).toBeInTheDocument()
    expect(screen.getByText('Encrypted backup picker')).toBeInTheDocument()
    expect(mocks.appMounts).toBe(0)
  })

  it('opens the normal wallet after successful initialization', async () => {
    mocks.initialize.mockResolvedValue(undefined)
    await start()
    expect(await screen.findByText('Wallet providers ready')).toBeInTheDocument()
    expect(mocks.initialize).toHaveBeenCalledOnce()
    expect(mocks.appMounts).toBe(1)
  })
})
