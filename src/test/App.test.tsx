import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { appReloader } from '../App'
import { AspContext } from '../providers/asp'
import { ConfigContext } from '../providers/config'
import { FlowContext } from '../providers/flow'
import { NavigationContext, Pages } from '../providers/navigation'
import { OptionsContext } from '../providers/options'
import { WalletContext, type WalletAuthState } from '../providers/wallet'
import {
  mockAspContextValue,
  mockConfigContextValue,
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
  unlockWallet = vi.fn().mockResolvedValue(undefined),
  screen: screenOverride = Pages.Init,
  option,
  flow = {},
  outcomeOf = () => undefined,
}: {
  authState: WalletAuthState
  initialized: boolean
  unlockWallet?: ReturnType<typeof vi.fn>
  screen?: Pages
  option?: SettingsOptions
  flow?: Partial<typeof mockFlowContextValue>
  outcomeOf?: (id: string) => Outcome | undefined
}) {
  const navigate = vi.fn()

  render(
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate, screen: screenOverride }}>
      <AspContext.Provider value={mockAspContextValue as any}>
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
                  dataReady: initialized,
                  unlockWallet,
                  walletLoaded: true,
                  wallet: { nextRollover: 0, pubkey: 'stored-pubkey' },
                }}
              >
                <SwapsContext.Provider value={{ outcomeOf } as never}>
                  <App />
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

describe('Navbar visibility', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('hides navbar on unlock screen even when navigation context has Wallet tab', async () => {
    renderApp({ authState: 'locked', initialized: false, screen: Pages.Wallet })

    await screen.findByText('Unlock')
    const ionApp = screen.getByTestId('app')
    expect(ionApp.className).not.toContain('has-pill-navbar')
  })

  it('hides navbar during loading hold', async () => {
    renderApp({ authState: 'authenticated', initialized: false, screen: Pages.Wallet })

    const ionApp = await screen.findByTestId('app')
    expect(ionApp.className).not.toContain('has-pill-navbar')
  })

  it('hides navbar on wallet root when authenticated and initialized', async () => {
    const user = userEvent.setup()
    const { navigate } = renderApp({ authState: 'authenticated', initialized: true, screen: Pages.Wallet })

    const ionApp = await screen.findByTestId('app')
    expect(ionApp.className).not.toContain('has-pill-navbar')
    expect(screen.getByRole('main')).toHaveClass('desktop-wallet-main--root')
    expect(screen.getByText('Arkade')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-nav-home')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByLabelText('Wallet navigation').parentElement).toBe(screen.getByRole('main').parentElement)
    expect(screen.getByRole('main')).not.toContainElement(screen.getByLabelText('Wallet navigation'))

    await user.click(screen.getByTestId('desktop-nav-activity'))
    expect(navigate).toHaveBeenCalledWith(Pages.Activity)
  })

  it('hides navbar on settings menu when authenticated and initialized', async () => {
    renderApp({
      authState: 'authenticated',
      initialized: true,
      screen: Pages.Settings,
      option: SettingsOptions.Menu,
    })

    const ionApp = await screen.findByTestId('app')
    expect(ionApp.className).not.toContain('has-pill-navbar')
    expect(screen.getByRole('main')).toHaveClass('desktop-wallet-main--root')
    expect(screen.getByTestId('desktop-nav-settings')).toHaveAttribute('aria-current', 'page')
  })

  it('hides navbar on settings sub-page when authenticated and initialized', async () => {
    renderApp({
      authState: 'authenticated',
      initialized: true,
      screen: Pages.Settings,
      option: SettingsOptions.Password,
    })

    const ionApp = await screen.findByTestId('app')
    expect(ionApp.className).not.toContain('has-pill-navbar')
    expect(screen.getByRole('main')).toHaveClass('desktop-wallet-main--panel')
  })

  it('hides navbar on app detail pages when authenticated and initialized', async () => {
    renderApp({ authState: 'authenticated', initialized: true, screen: Pages.BitcoinDetail })

    const ionApp = await screen.findByTestId('app')
    expect(ionApp.className).not.toContain('has-pill-navbar')
    expect(screen.getByRole('main')).toHaveClass('desktop-wallet-main--panel')
    expect(screen.getByTestId('desktop-nav-home')).toHaveAttribute('aria-current', 'page')
  })

  it('keeps Activity active on transaction details', async () => {
    renderApp({ authState: 'authenticated', initialized: true, screen: Pages.Transaction })

    expect(await screen.findByRole('main')).toHaveClass('desktop-wallet-main--panel')
    expect(screen.getByTestId('desktop-nav-activity')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('desktop-nav-home')).not.toHaveAttribute('aria-current')
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
