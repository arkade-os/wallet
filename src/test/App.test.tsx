import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { appReloader } from '../App'
import { AspContext } from '../providers/asp'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { FlowContext } from '../providers/flow'
import { NavigationContext, Pages } from '../providers/navigation'
import { OptionsContext } from '../providers/options'
import { WalletContext, type WalletAuthState } from '../providers/wallet'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockOptionsContextValue,
  mockWalletContextValue,
} from './screens/mocks'
import { SwapsContext } from '../providers/swaps'
import type { Outcome } from '@arkade-os/swap'
import { redirectToCallback } from '../lib/appIntent'
import { defaultPassword } from '../lib/constants'
import { detectJSCapabilities } from '../lib/jsCapabilities'
import { SettingsOptions } from '@/lib/types'

vi.mock('../lib/appIntent', async (original) => ({
  ...(await original<typeof import('../lib/appIntent')>()),
  redirectToCallback: vi.fn(),
}))

const PASSWORDLESS_AUTO_RELOAD_KEY = 'passwordless-auto-reload-attempted'

vi.mock('../lib/jsCapabilities', () => ({
  detectJSCapabilities: vi.fn().mockResolvedValue({ isSupported: true }),
}))

function renderApp({
  authState,
  initialized,
  unlockWallet = vi.fn<(password: string) => Promise<void>>().mockResolvedValue(undefined),
  screen: screenOverride = Pages.Init,
  option,
  flow = {},
  outcomeOf = () => undefined,
  dataReady,
  storedHome,
  fiatReady,
  loadError = null,
  asp = {},
}: {
  authState: WalletAuthState
  initialized: boolean
  unlockWallet?: (password: string) => Promise<void>
  screen?: Pages
  option?: SettingsOptions
  flow?: Partial<typeof mockFlowContextValue>
  outcomeOf?: (id: string) => Outcome | undefined
  dataReady?: boolean
  storedHome?: boolean
  fiatReady?: boolean
  loadError?: string | null
  asp?: Partial<typeof mockAspContextValue.aspInfo>
}) {
  const navigate = vi.fn()

  render(
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate, screen: screenOverride }}>
      <AspContext.Provider
        value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, ...asp } } as any}
      >
        <ConfigContext.Provider value={{ ...mockConfigContextValue, configLoaded: true } as any}>
          <FlowContext.Provider value={{ ...mockFlowContextValue, ...flow } as any}>
            <OptionsContext.Provider
              value={{ ...mockOptionsContextValue, ...(option !== undefined && { option }) } as any}
            >
              <WalletContext.Provider
                value={{
                  ...mockWalletContextValue,
                  authState,
                  initialized,
                  dataReady: dataReady ?? initialized,
                  storedHome,
                  loadError,
                  unlockWallet,
                  walletLoaded: true,
                  wallet: { nextRollover: 0, pubkey: 'stored-pubkey' },
                }}
              >
                <SwapsContext.Provider value={{ outcomeOf } as never}>
                  <FiatContext.Provider value={{ ...mockFiatContextValue, fiatReady }}>
                    <App />
                  </FiatContext.Provider>
                </SwapsContext.Provider>
              </WalletContext.Provider>
            </OptionsContext.Provider>
          </FlowContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )

  return { navigate, unlockWallet }
}

function setupTestEnvironment() {
  sessionStorage.clear()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  vi.mocked(detectJSCapabilities).mockResolvedValue({ isSupported: true })
  vi.stubEnv('VITE_DEV_MNEMONIC', '')
  vi.stubEnv('VITE_DEV_NSEC', '')
}

describe('App startup routing', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('keeps passwordless wallets on loading and boots them in the background', async () => {
    const { navigate, unlockWallet } = renderApp({ authState: 'passwordless', initialized: false })

    await waitFor(() => expect(unlockWallet).toHaveBeenCalledWith(defaultPassword))
    expect(navigate).not.toHaveBeenCalledWith(Pages.Unlock)
  })

  it('shows unlock when authentication is required', async () => {
    const { navigate } = renderApp({ authState: 'locked', initialized: false })

    expect(await screen.findByText('Unlock')).toBeInTheDocument()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.Unlock))
  })

  it('shows unlock even when the wallet remains initialized', async () => {
    const { navigate } = renderApp({ authState: 'locked', initialized: true })

    expect(await screen.findByText('Unlock')).toBeInTheDocument()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.Unlock))
  })

  it('keeps authenticated but uninitialized wallets on loading', async () => {
    const { navigate, unlockWallet } = renderApp({ authState: 'authenticated', initialized: false })

    await waitFor(() => expect(screen.getByTestId('app')).toBeInTheDocument())
    expect(unlockWallet).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalledWith(Pages.Unlock)
  })

  it('never mounts onboarding for a wallet that already exists', async () => {
    renderApp({ authState: 'authenticated', initialized: true })

    await waitFor(() => expect(screen.getByTestId('app')).toBeInTheDocument())
    expect(screen.queryByText(/Welcome to Arkade/i)).toBeNull()
    expect(screen.queryByText(/Create wallet/i)).toBeNull()
  })

  it('holds on loading during dev auto-init from VITE_DEV_MNEMONIC instead of redirecting', async () => {
    vi.stubEnv('VITE_DEV_MNEMONIC', 'abandon abandon abandon abandon abandon about')
    const { navigate } = renderApp({ authState: 'locked', initialized: false })

    await waitFor(() => expect(screen.getByTestId('app')).toBeInTheDocument())
    // while VITE_DEV_MNEMONIC auto-initializes the wallet we stay on loading, not unlock/init
    expect(navigate).not.toHaveBeenCalledWith(Pages.Unlock)
    expect(navigate).not.toHaveBeenCalledWith(Pages.Init)
  })

  it('schedules a single reload after passwordless auto-init failure', async () => {
    vi.useFakeTimers()
    const reloadSpy = vi.spyOn(appReloader, 'reload').mockImplementation(() => {})
    const unlockWallet = vi.fn().mockRejectedValue(new Error('backend init failed'))

    renderApp({ authState: 'passwordless', initialized: false, unlockWallet })

    await act(async () => {})
    await Promise.resolve()
    expect(unlockWallet).toHaveBeenCalledWith(defaultPassword)
    expect(sessionStorage.getItem(PASSWORDLESS_AUTO_RELOAD_KEY)).toBe('true')
    await vi.advanceTimersByTimeAsync(1000)
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('does not schedule a second reload if one was already attempted in this session', async () => {
    vi.useFakeTimers()
    sessionStorage.setItem(PASSWORDLESS_AUTO_RELOAD_KEY, 'true')
    const reloadSpy = vi.spyOn(appReloader, 'reload').mockImplementation(() => {})
    const unlockWallet = vi.fn().mockRejectedValue(new Error('backend init failed'))

    renderApp({ authState: 'passwordless', initialized: false, unlockWallet })

    await act(async () => {})
    await Promise.resolve()
    expect(unlockWallet).toHaveBeenCalledWith(defaultPassword)
    await vi.advanceTimersByTimeAsync(1000)
    expect(reloadSpy).not.toHaveBeenCalled()
  })
})

describe('Home from what it showed last time', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // A returning wallet whose worker has not started: the provider is serving the stored figures.
  const returning = { initialized: false, storedHome: true, fiatReady: true } as const
  const home = () => screen.findByTestId('home-action-send')
  const noHome = async () => {
    await screen.findByTestId('app')
    await act(async () => {})
    expect(screen.queryByTestId('home-action-send')).toBeNull()
  }

  it('draws Home for a passwordless wallet while it boots in the background', async () => {
    const { unlockWallet } = renderApp({ ...returning, authState: 'passwordless' })

    expect(await home()).toBeInTheDocument()
    expect(screen.getByTestId('app')).toHaveAttribute('aria-busy', 'true')
    await waitFor(() => expect(unlockWallet).toHaveBeenCalledWith(defaultPassword))
  })

  it('draws Home once a password has been accepted, before the wallet has loaded', async () => {
    renderApp({ ...returning, authState: 'authenticated', screen: Pages.Unlock })

    expect(await home()).toBeInTheDocument()
  })

  it('shows nothing of a locked wallet', async () => {
    renderApp({ ...returning, authState: 'locked' })

    expect(await screen.findByText('Unlock')).toBeInTheDocument()
    expect(screen.queryByTestId('home-action-send')).toBeNull()
  })

  it('keeps Home up when a tap navigates before the wallet has loaded', async () => {
    // The tap is kept in `screen`. The screen it names needs the wallet, so it opens once
    // the load lands, not on the stored figures.
    renderApp({ ...returning, authState: 'authenticated', screen: Pages.SendForm })

    expect(await home()).toBeInTheDocument()
    expect(document.querySelector('[name="send-address"]')).toBeNull()
  })

  it('waits for a price rather than drawing the balance as zero', async () => {
    renderApp({ ...returning, authState: 'authenticated', fiatReady: false })

    await noHome()
  })

  it('gives way to an app request', async () => {
    renderApp({
      ...returning,
      authState: 'authenticated',
      flow: { appIntent: { status: 'connect', callback: 'https://example.com/cb' } },
    })

    await noHome()
  })

  it('gives way to an unreachable server', async () => {
    const { navigate } = renderApp({ ...returning, authState: 'authenticated', asp: { unreachable: true } })

    await noHome()
    expect(navigate).toHaveBeenCalledWith(Pages.Unavailable)
  })

  it('gives way to a first load that failed', async () => {
    renderApp({ ...returning, authState: 'authenticated', loadError: 'Unable to load wallet data.' })

    await noHome()
    expect((await screen.findAllByText('Unable to load wallet data.')).length).toBeGreaterThan(0)
  })

  it('puts up no loading cover ahead of it, unless it does not come', async () => {
    vi.useFakeTimers()
    try {
      // The password state is still being read, so Home cannot be drawn yet.
      renderApp({ ...returning, authState: 'unknown' })
      await act(async () => {})
      expect(screen.queryByTestId('loading-logo')).toBeNull()

      await act(() => vi.advanceTimersByTimeAsync(400))
      expect(screen.getByTestId('loading-logo')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('covers at once when there is nothing stored to draw', async () => {
    renderApp({ authState: 'unknown', initialized: false, storedHome: false, fiatReady: true })

    expect(await screen.findByTestId('loading-logo')).toBeInTheDocument()
  })

  it('is not used once the wallet has loaded', async () => {
    renderApp({
      authState: 'authenticated',
      initialized: true,
      storedHome: false,
      fiatReady: true,
      screen: Pages.Wallet,
    })

    expect(await home()).toBeInTheDocument()
    expect(screen.getByTestId('app')).not.toHaveAttribute('aria-busy')
  })
})

describe('leaving the unlock screen', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sends the wallet home as soon as the password is accepted', async () => {
    // Not when the wallet has loaded: Home may be on screen by then, and a redirect that late
    // would undo a tap made on it.
    const { navigate } = renderApp({ authState: 'authenticated', initialized: false, screen: Pages.Unlock })

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.Wallet))
  })

  it('stays on unlock while the wallet is locked', async () => {
    const { navigate } = renderApp({ authState: 'locked', initialized: false, screen: Pages.Unlock })

    await screen.findByText('Unlock')
    expect(navigate).not.toHaveBeenCalledWith(Pages.Wallet)
  })
})

describe('App intents', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('connect intent: verify navigate was called with Pages.AppIntent', async () => {
    const { navigate } = renderApp({
      authState: 'authenticated',
      initialized: true,
      dataReady: false,
      flow: { appIntent: { status: 'connect', callback: 'https://example.com/cb' } },
    })
    await screen.findByTestId('app')
    expect(navigate).toHaveBeenCalledWith(Pages.AppIntent)
  })

  it('keeps the loading screen up when returning to the wallet with a connect intent pending', async () => {
    renderApp({
      authState: 'authenticated',
      initialized: true,
      dataReady: false,
      screen: Pages.Wallet,
      flow: { appIntent: { status: 'connect', callback: 'https://example.com/cb' } },
    })

    await screen.findByTestId('app')
    expect(screen.queryByTestId('desktop-nav-home')).not.toBeInTheDocument()
  })

  it('send intent: verify navigate was called with Pages.Wallet', async () => {
    const { navigate } = renderApp({
      authState: 'authenticated',
      initialized: true,
      dataReady: false,
      flow: {
        appIntent: {
          status: 'send',
          request:
            'bitcoin:?ark=tark1qplnj2gett9j483fchy6chaxn4y52c4g7n5djh9xua3ywdxw0ldatc3e9xcj9xpx0r5tmr0dgvu2f4s352muklg0tcxx0scnnkraajy9jgz4xl&amount=0.001',
          callback: 'https://example.com/cb',
        },
      },
    })
    await screen.findByTestId('app')
    expect(navigate).toHaveBeenCalledWith(Pages.Wallet)
    expect(navigate).not.toHaveBeenCalledWith(Pages.SendForm)
  })
})

describe('Escape during an onchain app send', () => {
  beforeEach(() => {
    setupTestEnvironment()
    vi.mocked(redirectToCallback).mockClear()
  })
  afterEach(() => vi.unstubAllEnvs())

  const appIntent = {
    status: 'send' as const,
    request: 'bitcoin:bcrt1qrecipient',
    callback: 'https://app.example/return',
    started: true,
  }
  const committedIntent = { ...appIntent, committedOnchain: { swapId: 'rfq:owned', fundingTxid: 'funding-txid' } }
  const sendInfo = {
    address: 'bcrt1qrecipient',
    railId: 'onchain-swap',
    swapId: 'rfq:owned',
    txid: 'funding-txid',
    total: 1000,
  }

  it('navigates inside the wallet and retains the funded handoff until its own claim completes', async () => {
    let outcome: Outcome = 'funded'
    const resetFlow = vi.fn()
    const { navigate } = renderApp({
      authState: 'authenticated',
      initialized: true,
      screen: Pages.SendSuccess,
      flow: { appIntent, sendInfo, resetFlow },
      outcomeOf: () => outcome,
    })
    await screen.findByTestId('app')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(navigate).toHaveBeenCalledWith(Pages.Wallet)
    expect(resetFlow).not.toHaveBeenCalled()
    expect(redirectToCallback).not.toHaveBeenCalled()
    outcome = 'claimed'
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(redirectToCallback).toHaveBeenCalledWith(appIntent.callback, { status: 'sent', txid: 'funding-txid' })
    expect(resetFlow).toHaveBeenCalledOnce()
  })

  it('retains B through Escape after manual C replaces the editable send', async () => {
    let outcome: Outcome = 'funded'
    const resetFlow = vi.fn()
    renderApp({
      authState: 'authenticated',
      initialized: true,
      screen: Pages.Wallet,
      flow: { appIntent: committedIntent, sendInfo: { arkAddress: 'ark1manual', txid: 'manual-txid' }, resetFlow },
      outcomeOf: () => outcome,
    })
    await screen.findByTestId('app')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(redirectToCallback).not.toHaveBeenCalled()
    expect(resetFlow).not.toHaveBeenCalled()
    outcome = 'claimed'
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(redirectToCallback).toHaveBeenCalledWith(appIntent.callback, { status: 'sent', txid: 'funding-txid' })
  })

  it('reports sent from the wallet after returning internally from a claimed swap', async () => {
    const resetFlow = vi.fn()
    renderApp({
      authState: 'authenticated',
      initialized: true,
      screen: Pages.Wallet,
      flow: { appIntent, sendInfo, resetFlow },
      outcomeOf: () => 'claimed',
    })
    await screen.findByTestId('app')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(redirectToCallback).toHaveBeenCalledWith(appIntent.callback, { status: 'sent', txid: 'funding-txid' })
    expect(resetFlow).toHaveBeenCalledOnce()
  })
})
