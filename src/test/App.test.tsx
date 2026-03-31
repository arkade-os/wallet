import { act, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { appReloader } from '../App'
import { AspContext } from '../providers/asp'
import { ConfigContext } from '../providers/config'
import { FlowContext } from '../providers/flow'
import { NavigationContext, Pages, Tabs } from '../providers/navigation'
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
import { defaultPassword } from '../lib/constants'
import { detectJSCapabilities } from '../lib/jsCapabilities'
import { SettingsOptions } from '../lib/types'

const PASSWORDLESS_AUTO_RELOAD_KEY = 'passwordless-auto-reload-attempted'

vi.mock('../lib/jsCapabilities', () => ({
  detectJSCapabilities: vi.fn().mockResolvedValue({ isSupported: true }),
}))

vi.mock('@ionic/react', async (importOriginal) => {
  const React = await import('react')
  const actual = await importOriginal<typeof import('@ionic/react')>()

  const IonTab = React.forwardRef(function MockIonTab(
    { children }: { children: ReactNode },
    ref: React.ForwardedRef<{ setActive: () => void; classList: { add: () => void; remove: () => void } }>,
  ) {
    React.useImperativeHandle(ref, () => ({
      setActive: () => {},
      classList: {
        add: () => {},
        remove: () => {},
      },
    }))

    return <div>{children}</div>
  })

  return {
    ...actual,
    IonApp: ({ children, className }: { children: ReactNode; className?: string }) => (
      <div data-testid='ion-app' className={className}>
        {children}
      </div>
    ),
    IonPage: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    IonTab,
    IonTabBar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    IonTabButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
      <button onClick={onClick}>{children}</button>
    ),
    IonTabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    setupIonicReact: vi.fn(),
  }
})

function renderApp({
  authState,
  initialized,
  unlockWallet = vi.fn().mockResolvedValue(undefined),
  screen: screenOverride = Pages.Init,
  tab: tabOverride = Tabs.None,
  option,
}: {
  authState: WalletAuthState
  initialized: boolean
  unlockWallet?: ReturnType<typeof vi.fn>
  screen?: Pages
  tab?: Tabs
  option?: SettingsOptions
}) {
  const navigate = vi.fn()

  render(
    <NavigationContext.Provider
      value={{ ...mockNavigationContextValue, navigate, screen: screenOverride, tab: tabOverride }}
    >
      <AspContext.Provider value={mockAspContextValue as any}>
        <ConfigContext.Provider value={{ ...mockConfigContextValue, configLoaded: true } as any}>
          <FlowContext.Provider value={mockFlowContextValue as any}>
            <OptionsContext.Provider
              value={{ ...mockOptionsContextValue, ...(option !== undefined && { option }) } as any}
            >
              <WalletContext.Provider
                value={{
                  ...mockWalletContextValue,
                  authState,
                  initialized,
                  unlockWallet,
                  walletLoaded: true,
                  wallet: { nextRollover: 0, pubkey: 'stored-pubkey' },
                }}
              >
                <App />
              </WalletContext.Provider>
            </OptionsContext.Provider>
          </FlowContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )

  return { navigate, unlockWallet }
}

describe('App startup routing', () => {
  beforeEach(() => {
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
    vi.stubEnv('VITE_DEV_NSEC', '')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('keeps passwordless wallets on loading and boots them in the background', async () => {
    const { navigate, unlockWallet } = renderApp({ authState: 'passwordless', initialized: false })

    expect(await screen.findByText('Loading...')).toBeInTheDocument()
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

    expect(await screen.findByText('Loading...')).toBeInTheDocument()
    expect(unlockWallet).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalledWith(Pages.Unlock)
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
    vi.stubEnv('VITE_DEV_NSEC', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('hides navbar on unlock screen even when navigation context has Wallet tab', async () => {
    renderApp({ authState: 'locked', initialized: false, screen: Pages.Wallet, tab: Tabs.Wallet })

    await screen.findByText('Unlock')
    const ionApp = screen.getByTestId('ion-app')
    expect(ionApp.className).not.toContain('has-pill-navbar')
  })

  it('hides navbar during loading hold', async () => {
    renderApp({ authState: 'authenticated', initialized: false, screen: Pages.Wallet, tab: Tabs.Wallet })

    await screen.findByText('Loading...')
    const ionApp = screen.getByTestId('ion-app')
    expect(ionApp.className).not.toContain('has-pill-navbar')
  })

  it('shows navbar on wallet root when authenticated and initialized', async () => {
    renderApp({ authState: 'authenticated', initialized: true, screen: Pages.Wallet, tab: Tabs.Wallet })

    const ionApp = await screen.findByTestId('ion-app')
    expect(ionApp.className).toContain('has-pill-navbar')
  })

  it('shows navbar on apps root when authenticated and initialized', async () => {
    renderApp({ authState: 'authenticated', initialized: true, screen: Pages.Apps, tab: Tabs.Apps })

    const ionApp = await screen.findByTestId('ion-app')
    expect(ionApp.className).toContain('has-pill-navbar')
  })

  it('shows navbar on settings menu when authenticated and initialized', async () => {
    renderApp({
      authState: 'authenticated',
      initialized: true,
      screen: Pages.Settings,
      tab: Tabs.Settings,
      option: SettingsOptions.Menu,
    })

    const ionApp = await screen.findByTestId('ion-app')
    expect(ionApp.className).toContain('has-pill-navbar')
  })
})
