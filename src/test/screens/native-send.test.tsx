import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomeQuickActions from '../../screens/Wallet/HomeQuickActions'
import SendDetails from '../../screens/Wallet/Send/Details'
import { WalletContext } from '../../providers/wallet'
import { NavigationContext, Pages } from '../../providers/navigation'
import { FlowContext, type SendInfo } from '../../providers/flow'
import { readAllTransactionActivityMetadata } from '../../lib/storage'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { LimitsContext } from '../../providers/limits'
import {
  mockWalletContextValue,
  mockNavigationContextValue,
  mockFlowContextValue,
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockLimitsContextValue,
  mockSvcWallet,
} from './mocks'

const publicKey = `02${'11'.repeat(32)}`
const mocks = vi.hoisted(() => ({
  card: { status: 'disconnected', publicKey: '' },
  navigate: vi.fn(),
  send: vi.fn(),
}))
vi.mock('../../lib/nativeBridge', async (original) => ({
  ...(await original<typeof import('../../lib/nativeBridge')>()),
  getNativeCardState: () => mocks.card,
}))
vi.mock('../../components/NativeCardConnectSheet', () => ({
  default: ({ isOpen, onClose, onConnected }: { isOpen: boolean; onClose: () => void; onConnected: () => void }) =>
    isOpen ? (
      <div role='dialog' aria-label='Connect Satochip'>
        <button onClick={onClose}>Cancel connection</button>
        <button onClick={onConnected}>Connection complete</button>
      </div>
    ) : null,
}))
vi.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.card = { status: 'disconnected', publicKey: '' }
  mocks.send.mockResolvedValue('fixture-txid')
  localStorage.removeItem('transactionActivityMetadata')
})

function show(
  page: React.ReactNode,
  hardware = true,
  options: {
    flow?: Partial<React.ContextType<typeof FlowContext>>
    reloadWallet?: () => Promise<void>
    screen?: Pages
  } = {},
) {
  return render(
    <NavigationContext.Provider
      value={{ ...mockNavigationContextValue, navigate: mocks.navigate, screen: options.screen ?? Pages.Init }}
    >
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <FlowContext.Provider
              value={{
                ...mockFlowContextValue,
                sendInfo: { arkAddress: 'tark1destination', satoshis: 1000 },
                ...options.flow,
              }}
            >
              <WalletContext.Provider
                value={{
                  ...mockWalletContextValue,
                  wallet: hardware
                    ? { nextRollover: 0, pubkey: publicKey, signer: { type: 'native', publicKey, name: 'Satochip' } }
                    : { nextRollover: 0 },
                  balance: 10000,
                  svcWallet: { ...mockSvcWallet, send: mocks.send } as never,
                  reloadWallet: options.reloadWallet ?? mockWalletContextValue.reloadWallet,
                }}
              >
                <LimitsContext.Provider value={mockLimitsContextValue}>{page}</LimitsContext.Provider>
              </WalletContext.Provider>
            </FlowContext.Provider>
          </AspContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )
}

describe('card connection during Send', () => {
  it('guides a disconnected wallet before entering Send and supports cancellation', () => {
    show(<HomeQuickActions />)
    fireEvent.click(screen.getByTestId('home-action-send'))
    expect(screen.getByRole('dialog', { name: 'Connect Satochip' })).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Cancel connection'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('continues into Send only after connection completes', () => {
    show(<HomeQuickActions />)
    fireEvent.click(screen.getByTestId('home-action-send'))
    mocks.card = { status: 'connected', publicKey }
    fireEvent.click(screen.getByText('Connection complete'))
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith(Pages.SendForm)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('keeps connected cards and software wallets on the normal Send path', () => {
    mocks.card = { status: 'connected', publicKey }
    const view = show(<HomeQuickActions />)
    fireEvent.click(screen.getByTestId('home-action-send'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.navigate).toHaveBeenCalledWith(Pages.SendForm)
    view.unmount()
    mocks.card = { status: 'disconnected', publicKey: '' }
    show(<HomeQuickActions />, false)
    fireEvent.click(screen.getByTestId('home-action-send'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.navigate).toHaveBeenCalledTimes(2)
  })

  it('does not require the card to receive', () => {
    show(<HomeQuickActions />)
    fireEvent.click(screen.getByTestId('home-action-receive'))
    expect(mocks.navigate).toHaveBeenCalledWith(Pages.ReceiveQRCode)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('rechecks the card before signing and requires a new confirmation after reconnect', async () => {
    show(<SendDetails />)
    fireEvent.click(await screen.findByText('Tap to Sign'))
    expect(screen.getByRole('dialog', { name: 'Connect Satochip' })).toBeInTheDocument()
    expect(mocks.send).not.toHaveBeenCalled()
    mocks.card = { status: 'connected', publicKey }
    fireEvent.click(screen.getByText('Connection complete'))
    expect(mocks.send).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Tap to Sign'))
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce())
  })

  it('requires the wallet’s own card even when another card is connected', () => {
    mocks.card = { status: 'connected', publicKey: `02${'22'.repeat(32)}` }
    show(<HomeQuickActions />)
    fireEvent.click(screen.getByTestId('home-action-send'))
    expect(screen.getByRole('dialog', { name: 'Connect Satochip' })).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})

describe('deferred direct-send completion', () => {
  it.each([
    ['active', false],
    ['replaced after unmount', true],
  ] as const)('retains the payment result while respecting the %s flow', async (_label, replaced) => {
    let finish!: (txid: string) => void
    mocks.send.mockImplementationOnce(() => new Promise<string>((resolve) => (finish = resolve)))
    const first: SendInfo = { arkAddress: 'tark1destination', recipient: 'manual-A', satoshis: 1000 }
    const second: SendInfo = { arkAddress: 'tark1other', recipient: 'manual-B', satoshis: 2000 }
    let current = first
    const reloadWallet = vi.fn(async () => {})
    const view = show(<SendDetails />, false, {
      screen: Pages.SendDetails,
      reloadWallet,
      flow: {
        sendInfo: first,
        setSendInfo: (next) => {
          current = typeof next === 'function' ? next(current) : next
        },
      },
    })
    fireEvent.click(await screen.findByText('Tap to Sign'))
    await waitFor(() => expect(mocks.send).toHaveBeenCalledExactlyOnceWith({ address: first.arkAddress, amount: 1000 }))
    if (replaced) {
      view.unmount()
      current = second
    }
    await act(async () => finish('deferred-A-txid'))
    await waitFor(() => expect(reloadWallet).toHaveBeenCalledOnce())
    expect(readAllTransactionActivityMetadata()['deferred-A-txid']).toMatchObject({
      destination: first.arkAddress,
      networkFee: 0,
    })
    if (replaced) {
      expect(current).toBe(second)
      expect(mocks.navigate).not.toHaveBeenCalled()
    } else {
      expect(current).toEqual({ ...first, total: 1000, txid: 'deferred-A-txid' })
      await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(Pages.SendSuccess))
    }
  })

  it('leaves the new flow and navigation unchanged when the old unmounted send fails', async () => {
    let fail!: (error: Error) => void
    mocks.send.mockImplementationOnce(() => new Promise<string>((_resolve, reject) => (fail = reject)))
    const second: SendInfo = { arkAddress: 'tark1other', recipient: 'manual-B', satoshis: 2000 }
    let current: SendInfo = { arkAddress: 'tark1destination', recipient: 'manual-A', satoshis: 1000 }
    const reloadWallet = vi.fn(async () => {})
    const view = show(<SendDetails />, false, {
      screen: Pages.SendDetails,
      reloadWallet,
      flow: {
        sendInfo: current,
        setSendInfo: (next) => {
          current = typeof next === 'function' ? next(current) : next
        },
      },
    })
    fireEvent.click(await screen.findByText('Tap to Sign'))
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce())
    view.unmount()
    current = second
    await act(async () => fail(new Error('Fixture send failed')))
    expect(current).toBe(second)
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(reloadWallet).not.toHaveBeenCalled()
    expect(readAllTransactionActivityMetadata()).toEqual({})
  })
})
