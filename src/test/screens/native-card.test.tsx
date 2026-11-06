import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WalletContext } from '../../providers/wallet'
import { NavigationContext, Pages } from '../../providers/navigation'
import { AspContext } from '../../providers/asp'
import { FlowContext } from '../../providers/flow'
import Init from '../../screens/Init/Init'
import Unlock from '../../screens/Wallet/Unlock'
import Backup from '../../screens/Settings/Backup'
import Password from '../../screens/Settings/Password'
import Lnurl from '../../screens/Settings/Lnurl'
import NativePayments from '../../components/NativePayments'
import NativeCardStatus from '../../components/NativeCardStatus'
import { SwapsContext } from '../../providers/swaps'
import { mockAspContextValue, mockFlowContextValue, mockNavigationContextValue, mockWalletContextValue } from './mocks'

const mocks = vi.hoisted(() => ({
  native: true,
  connect: vi.fn(),
  inspect: vi.fn(),
  unlock: vi.fn(),
  navigate: vi.fn(),
  cardState: { status: 'disconnected' as 'connected' | 'connecting' | 'disconnected', publicKey: '' },
  listeners: new Set<() => void>(),
}))
vi.mock('../../lib/nativeBridge', () => ({
  isNativeHost: () => mocks.native,
  connectNativeIdentity: vi.fn(),
  disconnectNativeIdentity: vi.fn(async () => {}),
  inspectNativeCard: mocks.inspect,
  setupNativeCard: vi.fn(),
  getNativeCardState: () => mocks.cardState,
  subscribeNativeCardState: (callback: () => void) => {
    mocks.listeners.add(callback)
    return () => mocks.listeners.delete(callback)
  },
}))
vi.mock('../../components/OnboardingLogo', () => ({ default: () => null }))
vi.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))

const cardWallet = {
  nextRollover: 0,
  pubkey: `02${'11'.repeat(32)}`,
  signer: { type: 'native' as const, name: 'Satochip', publicKey: `02${'11'.repeat(32)}` },
}

function show(children: React.ReactNode, nativeWallet = false, readable = false) {
  return render(
    <AspContext.Provider value={mockAspContextValue}>
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate: mocks.navigate }}>
        <FlowContext.Provider value={mockFlowContextValue}>
          <WalletContext.Provider
            value={{
              ...mockWalletContextValue,
              wallet: nativeWallet ? cardWallet : { nextRollover: 0 },
              authState: nativeWallet && !readable ? 'locked' : 'authenticated',
              connectHardwareWallet: mocks.connect,
              unlockWallet: mocks.unlock,
            }}
          >
            {children}
          </WalletContext.Provider>
        </FlowContext.Provider>
      </NavigationContext.Provider>
    </AspContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.native = true
  mocks.connect.mockResolvedValue(undefined)
  mocks.inspect.mockResolvedValue({
    present: true,
    version: '0.16-0.1',
    setupDone: true,
    seeded: true,
    needs2FA: false,
    schnorrEnabled: true,
    untweakedSchnorrEnabled: true,
    ready: true,
  })
  mocks.unlock.mockResolvedValue(undefined)
  mocks.cardState = { status: 'disconnected', publicKey: '' }
})

describe('native card access in existing wallet screens', () => {
  it('offers card connection only inside a native host and preserves software onboarding', async () => {
    const view = show(<Init />)
    expect(screen.getByText('+ Create wallet')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Connect Satochip'))
    expect(mocks.connect).not.toHaveBeenCalled()
    fireEvent.change(await screen.findByLabelText('Card PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByText('Connect and continue'))
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(Pages.Wallet))
    view.unmount()
    mocks.native = false
    show(<Init />)
    expect(screen.queryByText('Connect Satochip')).not.toBeInTheDocument()
  })

  it('shows a rejected connection without navigating and clears the app PIN', async () => {
    mocks.connect.mockRejectedValueOnce(new Error('Card is not initialized'))
    show(<Init />)
    fireEvent.click(screen.getByText('Connect Satochip'))
    fireEvent.change(await screen.findByLabelText('Card PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByText('Connect and continue'))
    expect(await screen.findByText('Card is not initialized')).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Card PIN')).toHaveValue('')
  })

  it('opens a stored wallet for viewing with no card or web password form', async () => {
    const view = show(<Unlock />, true)
    fireEvent.click(screen.getByText('Open wallet'))
    await waitFor(() => expect(mocks.unlock).toHaveBeenCalledWith(''))
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(view.container.querySelector('input[type=password]')).toBeNull()
  })

  it.each([
    ['disconnected', '', 'Satochip disconnected', 'var(--neutral-500)'],
    ['connecting', '', 'Connecting your Satochip', 'var(--warning)'],
    ['connected', `02${'22'.repeat(32)}`, 'Satochip disconnected', 'var(--neutral-500)'],
  ] as const)(
    'shows %s card health as a quiet dot without a banner or reconnect button',
    (status, publicKey, label, color) => {
      mocks.cardState = { status, publicKey }
      show(<NativeCardStatus />, true, true)
      const dot = screen.getByRole('status', { name: label })
      expect(dot).toHaveAttribute('title', label)
      expect(dot).toHaveStyle({ backgroundColor: color })
      expect(dot).toBeEmptyDOMElement()
      expect(screen.queryByText(/Your wallet stays available/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
      expect(mocks.connect).not.toHaveBeenCalled()
    },
  )

  it('shows the same-card connected state without offering another PIN prompt', () => {
    mocks.cardState = { status: 'connected', publicKey: cardWallet.pubkey }
    show(<NativeCardStatus />, true, true)
    expect(screen.getByRole('status', { name: 'Satochip connected' })).toHaveStyle({
      backgroundColor: 'var(--success)',
    })
    expect(screen.queryByText('Reconnect Satochip')).not.toBeInTheDocument()
    expect(mocks.connect).not.toHaveBeenCalled()
    act(() => {
      mocks.cardState = { status: 'disconnected', publicKey: '' }
      mocks.listeners.forEach((listener) => listener())
    })
    expect(screen.getByRole('status', { name: 'Satochip disconnected' })).toHaveStyle({
      backgroundColor: 'var(--neutral-500)',
    })
  })

  it.each([Backup, Password])('keeps card secrets and password controls out of settings', (Page) => {
    show(<Page />, true)
    expect(screen.getByText('Satochip recovery')).toBeInTheDocument()
    expect(screen.getByText(/Your card backup alone does not include/)).toBeInTheDocument()
    expect(screen.queryByTestId('toggle-backup')).not.toBeInTheDocument()
    expect(document.querySelector('input[type=password]')).toBeNull()
  })

  it('explains unavailable server LNURL accounts without constructing an authenticated account', () => {
    show(<Lnurl />, true)
    expect(screen.getByText('Lightning addresses are unavailable with this card.')).toBeInTheDocument()
  })

  it('only resumes pending hardware payments after an explicit action', async () => {
    mocks.cardState = { status: 'connected', publicKey: cardWallet.pubkey }
    const resumePendingPayments = vi.fn().mockResolvedValue(undefined)
    show(
      <SwapsContext.Provider value={{ paymentsPaused: true, resumePendingPayments } as never}>
        <NativePayments />
      </SwapsContext.Provider>,
      true,
    )
    expect(resumePendingPayments).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Resume pending payments'))
    await waitFor(() => expect(resumePendingPayments).toHaveBeenCalledTimes(1))
  })

  it('guides reconnection before resuming payments and requires another explicit resume', async () => {
    const resumePendingPayments = vi.fn().mockResolvedValue(undefined)
    show(
      <SwapsContext.Provider value={{ paymentsPaused: true, resumePendingPayments } as never}>
        <NativePayments />
      </SwapsContext.Provider>,
      true,
    )
    fireEvent.click(screen.getByText('Resume pending payments'))
    fireEvent.change(await screen.findByLabelText('Card PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByText('Connect and continue'))
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledOnce())
    expect(resumePendingPayments).not.toHaveBeenCalled()
    mocks.cardState = { status: 'connected', publicKey: cardWallet.pubkey }
    fireEvent.click(screen.getByText('Resume pending payments'))
    await waitFor(() => expect(resumePendingPayments).toHaveBeenCalledOnce())
  })
})
