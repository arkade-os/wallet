import { StrictMode, useState, type ReactNode, type SetStateAction } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import NativeAppShell from '../../components/NativeAppShell'
import SheetModal from '../../components/SheetModal'
import NativeScanner from '../../components/NativeScanner'
import { DrawerDescription, DrawerTitle } from '../../components/ui/drawer'
import { getNativeBackCount } from '../../lib/nativeBack'
import type { AppIntentState } from '../../lib/appIntent'
import { ConfigContext } from '../../providers/config'
import { FlowContext } from '../../providers/flow'
import { WalletContext } from '../../providers/wallet'
import { NavigationContext, Pages } from '../../providers/navigation'
import {
  mockConfigContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from './mocks'

vi.mock('@tauri-apps/plugin-barcode-scanner', () => ({
  checkPermissions: vi.fn(async () => 'granted'),
  scan: vi.fn(() => new Promise(() => {})),
  cancel: vi.fn(async () => {}),
  Format: { QRCode: 'QR_CODE' },
}))
const host = window as any
const invoke = vi.fn()
const listeners = new Map<string, (value: any) => void>()
beforeEach(() => {
  invoke.mockReset().mockResolvedValue(null)
  listeners.clear()
  host.__ARKADE_NATIVE__ = { version: 1, platform: 'android' }
  host.__TAURI__ = {
    core: {
      invoke,
      addPluginListener: vi.fn(async (_: string, name: string, callback: (value: any) => void) => {
        listeners.set(name, callback)
        return {
          unregister: async () => {
            if (listeners.get(name) === callback) listeners.delete(name)
          },
        }
      }),
    },
    event: {
      listen: vi.fn(async (name: string, callback: (value: any) => void) => {
        listeners.set(name, callback)
        return () => {
          if (listeners.get(name) === callback) listeners.delete(name)
        }
      }),
    },
  }
})
afterEach(() => {
  cleanup()
  delete host.__ARKADE_NATIVE__
  delete host.__TAURI__
})

function shell(
  configLoaded: boolean,
  dataReady: boolean,
  appIntent = mockFlowContextValue.appIntent,
  goBack = vi.fn(),
  children: ReactNode = <div>Wallet</div>,
  page: Pages = Pages.Settings,
  setAppIntent: (intent: SetStateAction<AppIntentState | undefined>) => void = mockFlowContextValue.setAppIntent,
) {
  return (
    <ConfigContext.Provider
      value={{
        ...mockConfigContextValue,
        configLoaded,
        config: { ...mockConfigContextValue.config, notifications: true },
      }}
    >
      <WalletContext.Provider
        value={{ ...mockWalletContextValue, dataReady, wallet: { nextRollover: dataReady ? 1800000000 : 0 } }}
      >
        <FlowContext.Provider value={{ ...mockFlowContextValue, appIntent, setAppIntent }}>
          <NavigationContext.Provider value={{ ...mockNavigationContextValue, screen: page, goBack }}>
            <NativeAppShell>{children}</NativeAppShell>
          </NavigationContext.Provider>
        </FlowContext.Provider>
      </WalletContext.Provider>
    </ConfigContext.Provider>
  )
}

function requestWallet(page: Pages, overlay = false) {
  const accepted = vi.fn()
  let updatePage!: (page: Pages) => void
  let updateOverlay!: (open: boolean) => void
  let clearRequest!: () => void
  function Wallet() {
    const [screen, setScreen] = useState(page)
    const [open, setOpen] = useState(overlay)
    const [intent, setIntent] = useState<AppIntentState>()
    clearRequest = () => setIntent(undefined)
    updatePage = setScreen
    updateOverlay = setOpen
    return shell(
      true,
      true,
      intent,
      vi.fn(),
      <SheetModal isOpen={open} onClose={() => setOpen(false)}>
        <DrawerTitle>Current task</DrawerTitle>
        <DrawerDescription>Finish this task before opening a request.</DrawerDescription>
      </SheetModal>,
      screen,
      (next) => {
        accepted(next)
        setIntent(next)
      },
    )
  }
  const view = render(<Wallet />)
  return {
    ...view,
    accepted,
    returnToWallet: () => act(() => updatePage(Pages.Wallet)),
    closeOverlay: () => act(() => updateOverlay(false)),
    finishRequest: () => act(clearRequest),
  }
}

const payment = 'bitcoin:tb1qtest?amount=0.00000123'

it('consumes a cold desktop batch through the existing request UI without mobile services', async () => {
  host.__ARKADE_NATIVE__.platform = 'desktop'
  const batches = [[payment], []]
  invoke.mockImplementation(async (command) => (command.endsWith('|pending_intents') ? (batches.shift() ?? []) : null))
  const wallet = requestWallet(Pages.Wallet)
  await waitFor(() =>
    expect(wallet.accepted).toHaveBeenCalledExactlyOnceWith({ status: 'send', request: payment, callback: undefined }),
  )
  expect(listeners.has('wallet:intent')).toBe(true)
  expect(listeners.has('back')).toBe(false)
  expect(listeners.has('lifecycle')).toBe(false)
  expect(invoke).not.toHaveBeenCalledWith('plugin:wallet|initial_intent')
  expect(invoke).not.toHaveBeenCalledWith('plugin:wallet|set_back_handler', expect.anything())
  expect(invoke).not.toHaveBeenCalledWith('plugin:wallet|configure_background', expect.anything())
})

it('queues desktop links behind a native sheet until the user closes it and opens the request', async () => {
  host.__ARKADE_NATIVE__.platform = 'desktop'
  const batches: string[][] = [[]]
  invoke.mockImplementation(async (command) => (command.endsWith('|pending_intents') ? (batches.shift() ?? []) : null))
  const wallet = requestWallet(Pages.Wallet, true)
  await waitFor(() => expect(listeners.has('wallet:intent')).toBe(true))
  expect(getNativeBackCount()).toBe(1)
  batches.push([payment])
  act(() => listeners.get('wallet:intent')?.({ payload: null }))
  await screen.findByText('A new wallet request is waiting.')
  expect(wallet.accepted).not.toHaveBeenCalled()
  expect(screen.getByText('Open request').closest('button')).toBeDisabled()
  wallet.closeOverlay()
  fireEvent.click(screen.getByRole('button', { name: 'Open request' }))
  expect(wallet.accepted).toHaveBeenCalledExactlyOnceWith({ status: 'send', request: payment, callback: undefined })
})

it('serializes desktop cold and warm drains and preserves first-active/latest-incoming order', async () => {
  host.__ARKADE_NATIVE__.platform = 'desktop'
  let release!: (urls: string[]) => void
  let reads = 0
  const second = 'bitcoin:tb1qsecond?amount=0.00000456'
  const latest = 'bitcoin:tb1qlatest?amount=0.00000789'
  invoke.mockImplementation(async (command) => {
    if (!command.endsWith('|pending_intents')) return null
    reads++
    if (reads === 1)
      return new Promise<string[]>((resolve) => {
        release = resolve
      })
    return reads === 2 ? [second, latest] : []
  })
  const wallet = requestWallet(Pages.Wallet)
  await waitFor(() => expect(reads).toBe(1))
  act(() => listeners.get('wallet:intent')?.({ payload: null }))
  await act(async () => Promise.resolve())
  expect(reads).toBe(1)
  await act(async () => release([payment]))
  await waitFor(() => expect(reads).toBe(2))
  expect(wallet.accepted).toHaveBeenCalledExactlyOnceWith({ status: 'send', request: payment, callback: undefined })
  expect(screen.getByRole('button', { name: 'Open request' })).toBeDisabled()
  wallet.finishRequest()
  fireEvent.click(screen.getByRole('button', { name: 'Open request' }))
  expect(wallet.accepted).toHaveBeenLastCalledWith({ status: 'send', request: latest, callback: undefined })
})

it('does not let late StrictMode desktop listener registration consume the cold request again', async () => {
  host.__ARKADE_NATIVE__.platform = 'desktop'
  const accepted = vi.fn()
  let finishFirst!: () => void
  const staleDispose = vi.fn()
  let registrations = 0
  host.__TAURI__.event.listen.mockImplementation(async () => {
    registrations++
    if (registrations === 1)
      return new Promise<() => void>((resolve) => {
        finishFirst = () => resolve(staleDispose)
      })
    return vi.fn()
  })
  invoke.mockImplementation(async (command) => (command.endsWith('|pending_intents') ? [payment] : null))
  render(<StrictMode>{shell(true, true, undefined, vi.fn(), <div>Wallet</div>, Pages.Wallet, accepted)}</StrictMode>)
  await waitFor(() => expect(accepted).toHaveBeenCalledOnce())
  await act(async () => finishFirst())
  expect(staleDispose).toHaveBeenCalledOnce()
  expect(invoke.mock.calls.filter(([command]) => command.endsWith('|pending_intents'))).toHaveLength(1)
})

it('ignores desktop malformed batches and refuses further reads after unmount', async () => {
  host.__ARKADE_NATIVE__.platform = 'desktop'
  invoke.mockImplementation(async (command) =>
    command.endsWith('|pending_intents') ? ['javascript:alert(1)', 'https://evil.example/', null] : null,
  )
  const wallet = requestWallet(Pages.Wallet)
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('plugin:wallet|pending_intents', undefined))
  expect(wallet.accepted).not.toHaveBeenCalled()
  const signal = listeners.get('wallet:intent')!
  wallet.unmount()
  const reads = invoke.mock.calls.length
  await act(async () => signal({ payload: null }))
  expect(invoke.mock.calls).toHaveLength(reads)
})

it('handles iOS links and lifecycle without Android Back or background scheduling', async () => {
  host.__ARKADE_NATIVE__.platform = 'ios'
  const paused = vi.fn()
  const resumed = vi.fn()
  window.addEventListener('arkade-native-paused', paused)
  window.addEventListener('arkade-native-resumed', resumed)
  try {
    const wallet = requestWallet(Pages.Wallet)
    await waitFor(() => expect(listeners.has('intent')).toBe(true))
    expect(listeners.has('back')).toBe(false)
    act(() => listeners.get('intent')?.({ url: payment }))
    expect(wallet.accepted).toHaveBeenCalledWith({ status: 'send', request: payment, callback: undefined })
    act(() => listeners.get('lifecycle')?.({ state: 'paused' }))
    act(() => listeners.get('lifecycle')?.({ state: 'resumed' }))
    expect(paused).toHaveBeenCalledOnce()
    expect(resumed).toHaveBeenCalledOnce()
    expect(invoke).not.toHaveBeenCalledWith('plugin:wallet|set_back_handler', expect.anything())
    expect(invoke).not.toHaveBeenCalledWith('plugin:wallet|configure_background', expect.anything())
  } finally {
    window.removeEventListener('arkade-native-paused', paused)
    window.removeEventListener('arkade-native-resumed', resumed)
  }
})

it('queues iOS links behind a sheet until it is dismissed', async () => {
  host.__ARKADE_NATIVE__.platform = 'ios'
  const wallet = requestWallet(Pages.Wallet, true)
  await waitFor(() => expect(getNativeBackCount()).toBe(1))
  await waitFor(() => expect(listeners.has('intent')).toBe(true))
  act(() => listeners.get('intent')?.({ url: payment }))
  expect(wallet.accepted).not.toHaveBeenCalled()
  expect(screen.getByText('Open request').closest('button')).toBeDisabled()
  wallet.closeOverlay()
  await waitFor(() => expect(getNativeBackCount()).toBe(0))
  expect(screen.getByRole('button', { name: 'Open request' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Open request' }))
  expect(wallet.accepted).toHaveBeenCalledWith({ status: 'send', request: payment, callback: undefined })
})

it.each([Pages.SendForm, Pages.SendDetails])(
  'queues a link on manual send page %s until the user returns and opens it',
  async (page) => {
    const wallet = requestWallet(page)
    await waitFor(() => expect(listeners.has('intent')).toBe(true))
    act(() => listeners.get('intent')?.({ url: payment }))
    expect(wallet.accepted).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Open request' })).toBeDisabled()
    expect(screen.getByText(/return to your wallet/i)).toBeInTheDocument()
    wallet.returnToWallet()
    expect(wallet.accepted).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Open request' }))
    expect(wallet.accepted).toHaveBeenCalledExactlyOnceWith({ status: 'send', request: payment, callback: undefined })
  },
)

it('queues a link behind a root overlay and permits dismissal after closing the overlay', async () => {
  const wallet = requestWallet(Pages.Wallet, true)
  await waitFor(() => expect(getNativeBackCount()).toBe(1))
  await waitFor(() => expect(listeners.has('intent')).toBe(true))
  act(() => listeners.get('intent')?.({ url: payment }))
  expect(wallet.accepted).not.toHaveBeenCalled()
  expect(screen.getByText('Open request').closest('button')).toBeDisabled()
  expect(screen.getByText('Dismiss').closest('button')).toBeEnabled()
  wallet.closeOverlay()
  expect(wallet.accepted).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Open request' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
  expect(screen.queryByText('A new wallet request is waiting.')).not.toBeInTheDocument()
  expect(wallet.accepted).not.toHaveBeenCalled()
})

it.each([Pages.Init, Pages.Unlock, Pages.Loading])('accepts a cold launch link on root page %s', async (page) => {
  invoke.mockImplementation(async (command) => (command.endsWith('|initial_intent') ? payment : null))
  const wallet = requestWallet(page)
  await waitFor(() =>
    expect(wallet.accepted).toHaveBeenCalledExactlyOnceWith({ status: 'send', request: payment, callback: undefined }),
  )
})

it('accepts an idle root link immediately and queues a successive request in the same tick', async () => {
  const wallet = requestWallet(Pages.Wallet)
  await waitFor(() => expect(listeners.has('intent')).toBe(true))
  act(() => {
    listeners.get('intent')?.({ url: payment })
    listeners.get('intent')?.({ url: 'bitcoin:tb1qother?amount=0.00000456' })
  })
  expect(wallet.accepted).toHaveBeenCalledExactlyOnceWith({ status: 'send', request: payment, callback: undefined })
  expect(screen.getByRole('button', { name: 'Open request' })).toBeDisabled()
})

it('preserves durable reminders through config boot and locked wallet states', async () => {
  const view = render(shell(false, false))
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('plugin:wallet|set_back_handler', { enabled: true }))
  expect(invoke.mock.calls.some(([name]) => name.endsWith('configure_background'))).toBe(false)
  view.rerender(shell(true, false))
  expect(invoke.mock.calls.some(([name]) => name.endsWith('configure_background'))).toBe(false)
  view.rerender(shell(true, true))
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith('plugin:wallet|configure_background', {
      enabled: true,
      nextExpiryMs: 1800000000000,
    }),
  )
  const count = invoke.mock.calls.filter(([name]) => name.endsWith('configure_background')).length
  view.rerender(shell(true, false))
  expect(invoke.mock.calls.filter(([name]) => name.endsWith('configure_background'))).toHaveLength(count)
})

it('rearms opted-in reminders after system permission is restored with unchanged wallet data', async () => {
  let permissionGranted = false
  let scheduled = false
  invoke.mockImplementation(async (command, args) => {
    if (command === 'plugin:wallet|configure_background') {
      scheduled = args.enabled && permissionGranted
      return { enabled: args.enabled, permissionGranted, scheduled }
    }
    return null
  })
  const view = render(shell(true, true))
  const configurations = () => invoke.mock.calls.filter(([name]) => name === 'plugin:wallet|configure_background')
  await waitFor(() => expect(configurations()).toHaveLength(1))
  await waitFor(() => expect(listeners.has('lifecycle')).toBe(true))
  expect(scheduled).toBe(false)
  permissionGranted = true
  view.rerender(shell(true, true))
  expect(configurations()).toHaveLength(1)
  act(() => listeners.get('lifecycle')?.({ state: 'paused' }))
  expect(configurations()).toHaveLength(1)
  act(() => listeners.get('lifecycle')?.({ state: 'resumed' }))
  await waitFor(() => expect(scheduled).toBe(true))
  expect(configurations()).toHaveLength(2)
  expect(configurations()[1][1]).toEqual({ enabled: true, nextExpiryMs: 1800000000000 })
})

it.each([
  [false, true],
  [true, false],
])('preserves reminder state on resume until config loaded=%s and wallet ready=%s', async (loaded, ready) => {
  render(shell(loaded, ready))
  await waitFor(() => expect(listeners.has('lifecycle')).toBe(true))
  await act(async () => listeners.get('lifecycle')?.({ state: 'resumed' }))
  expect(invoke.mock.calls.some(([name]) => name === 'plugin:wallet|configure_background')).toBe(false)
})

it('uses normal Back navigation while requests retain the existing safe Escape handoff', async () => {
  const goBack = vi.fn()
  const escape = vi.fn()
  window.addEventListener('keydown', escape)
  const view = render(shell(true, true, undefined, goBack))
  await waitFor(() => expect(listeners.has('back')).toBe(true))
  await act(async () => listeners.get('back')?.({}))
  expect(goBack).toHaveBeenCalledOnce()
  view.rerender(shell(true, true, { status: 'connect', callback: 'https://example.com/' }, goBack))
  await act(async () => listeners.get('back')?.({}))
  expect(escape).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
  expect(goBack).toHaveBeenCalledOnce()
  window.removeEventListener('keydown', escape)
})

it('keeps root Back active for a busy task sheet and closes it before navigation', async () => {
  const goBack = vi.fn()
  const closed = vi.fn()
  let updateBusy!: (busy: boolean) => void
  function RootWallet() {
    const [open, setOpen] = useState(true)
    const [busy, setBusy] = useState(true)
    updateBusy = setBusy
    return shell(
      true,
      true,
      undefined,
      goBack,
      <SheetModal
        isOpen={open}
        onClose={() => {
          if (busy) return
          closed()
          setOpen(false)
        }}
      >
        <DrawerTitle>Current task</DrawerTitle>
        <DrawerDescription>Finish the current task before continuing.</DrawerDescription>
      </SheetModal>,
      Pages.Wallet,
    )
  }
  render(<RootWallet />)
  const backEnabled = () => invoke.mock.calls.filter(([name]) => name.endsWith('set_back_handler')).at(-1)?.[1]?.enabled
  await waitFor(() => expect(backEnabled()).toBe(true))
  await waitFor(() => expect(listeners.has('back')).toBe(true))
  await act(async () => listeners.get('back')?.({}))
  expect(screen.getByRole('dialog', { name: 'Current task' })).toBeVisible()
  expect(closed).not.toHaveBeenCalled()
  expect(goBack).not.toHaveBeenCalled()
  await act(async () => updateBusy(false))
  await act(async () => listeners.get('back')?.({}))
  expect(closed).toHaveBeenCalledOnce()
  expect(getNativeBackCount()).toBe(0)
  await waitFor(() => expect(backEnabled()).toBe(false))
  expect(goBack).not.toHaveBeenCalled()
})

it('closes the camera overlay on Back without navigating or handing off an app request', async () => {
  const goBack = vi.fn()
  const closed = vi.fn()
  const escape = vi.fn()
  window.addEventListener('keydown', escape)
  function CameraWallet() {
    const [scanning, setScanning] = useState(true)
    return shell(
      true,
      true,
      { status: 'connect', callback: 'https://example.com/' },
      goBack,
      scanning ? (
        <NativeScanner
          label='Scan payment'
          close={() => {
            closed()
            setScanning(false)
          }}
          onData={vi.fn()}
          onError={vi.fn()}
        />
      ) : (
        <div>Wallet</div>
      ),
    )
  }
  render(<CameraWallet />)
  await waitFor(() => expect(document.documentElement).toHaveClass('native-qr-active'))
  await waitFor(() => expect(listeners.has('back')).toBe(true))
  await act(async () => listeners.get('back')?.({}))
  expect(closed).toHaveBeenCalledOnce()
  expect(document.documentElement).not.toHaveClass('native-qr-active')
  expect(screen.queryByRole('region', { name: 'Scan payment' })).not.toBeInTheDocument()
  expect(goBack).not.toHaveBeenCalled()
  expect(escape).not.toHaveBeenCalled()
  window.removeEventListener('keydown', escape)
})
