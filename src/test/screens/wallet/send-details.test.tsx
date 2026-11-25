import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import SendDetails from '../../../screens/Wallet/Send/Details'
import { MUTINYNET_USDT_ASSET_ID } from '../../../lib/accountAssets'
import { Currencies } from '../../../lib/types'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'

vi.mock('sonner', async (importOriginal) => ({
  ...(await importOriginal<typeof import('sonner')>()),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))

const metadata = { decimals: 2, name: 'Tether USD', ticker: 'USDT' }

describe('Send details amount hierarchy', () => {
  const renderSendDetails = (sendInfo: SendInfo) =>
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue}>
          <FiatContext.Provider
            value={{
              ...mockFiatContextValue,
              fromFiatAmount: (amount, currency) => (currency === Currencies.USD ? amount * 1_000 : 0),
              toFiatAmount: (satoshis, currency) =>
                currency === Currencies.EUR ? satoshis * 0.000875 : currency === Currencies.USD ? satoshis / 1_000 : 0,
            }}
          >
            <AspContext.Provider
              value={{
                ...mockAspContextValue,
                aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' },
              }}
            >
              <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo }}>
                <WalletContext.Provider
                  value={{
                    ...mockWalletContextValue,
                    assetMetadataCache: new Map([
                      [
                        MUTINYNET_USDT_ASSET_ID,
                        {
                          assetId: MUTINYNET_USDT_ASSET_ID,
                          cachedAt: 0,
                          metadata,
                          supply: BigInt(1_000),
                        },
                      ],
                    ]),
                    isVerifiedAsset: (assetId) => assetId === MUTINYNET_USDT_ASSET_ID,
                    svcWallet: mockSvcWallet as any,
                  }}
                >
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <SendDetails />
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </AspContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>,
    )

  it('shows the configured currency first and the USD account amount second', async () => {
    renderSendDetails({
      account: {
        amount: BigInt(200),
        assetId: MUTINYNET_USDT_ASSET_ID,
        balance: BigInt(1_000),
        decimals: 2,
        source: { assetId: MUTINYNET_USDT_ASSET_ID, balance: BigInt(1_000), decimals: 2 },
        ticker: 'USD',
      },
      arkAddress: 'tark1destination',
      assets: [{ assetId: MUTINYNET_USDT_ASSET_ID, amount: BigInt(200) }],
      satoshis: 0,
    })

    await waitFor(() => expect(screen.getByTestId('primary-amount')).toHaveTextContent('€1.75'))
    expect(screen.getByTestId('Asset amount')).toHaveTextContent('2.00 USD')
    expect(screen.getByTestId('Value')).toHaveTextContent('€1.75')
    expect(screen.queryByText(/USDT/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('Total')).not.toBeInTheDocument()
  })
})

describe('Send details refresh', () => {
  const renderArkSend = (reloadWallet: () => Promise<void>, send: () => Promise<string>) =>
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue}>
          <FiatContext.Provider value={mockFiatContextValue}>
            <AspContext.Provider value={mockAspContextValue}>
              <FlowContext.Provider
                value={{ ...mockFlowContextValue, sendInfo: { arkAddress: 'tark1destination', satoshis: 1_000 } }}
              >
                <WalletContext.Provider
                  value={{
                    ...mockWalletContextValue,
                    balance: 10_000,
                    reloadWallet,
                    svcWallet: { ...mockSvcWallet, send } as any,
                  }}
                >
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <SendDetails />
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </AspContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>,
    )

  // The worker only broadcasts VTXO_UPDATE off the indexer subscription, which
  // can arrive late or never for a transaction this wallet submitted itself —
  // leaving the balance and the history a payment behind (#LN-send-stale).
  it('refreshes the wallet once the send returns a txid', async () => {
    const reloadWallet = vi.fn(() => Promise.resolve())
    const send = vi.fn(() => Promise.resolve('sent-txid'))

    renderArkSend(reloadWallet, send)

    fireEvent.click(await screen.findByText('Tap to Sign'))

    await waitFor(() => expect(send).toHaveBeenCalled())
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
  })

  it('does not refresh when the send fails', async () => {
    const reloadWallet = vi.fn(() => Promise.resolve())
    const send = vi.fn(() => Promise.reject(new Error('boom')))

    renderArkSend(reloadWallet, send)

    fireEvent.click(await screen.findByText('Tap to Sign'))

    await waitFor(() => expect(send).toHaveBeenCalled())
    expect(reloadWallet).not.toHaveBeenCalled()
  })
})

describe('Send details, a payment that outlives the screen', () => {
  const deferred = <T,>() => {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }

  const start = async (showBalance = true) => {
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
    const pending = deferred<string>()
    const reloadWallet = vi.fn(() => Promise.resolve())
    const setSendInfo = vi.fn()
    const send = vi.fn(() => pending.promise)
    const view = render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider
          value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, showBalance } }}
        >
          <FiatContext.Provider value={mockFiatContextValue}>
            <AspContext.Provider value={mockAspContextValue}>
              <FlowContext.Provider
                value={{
                  ...mockFlowContextValue,
                  sendInfo: { arkAddress: 'tark1destination', satoshis: 1_000 },
                  setSendInfo,
                }}
              >
                <WalletContext.Provider
                  value={{
                    ...mockWalletContextValue,
                    balance: 10_000,
                    reloadWallet,
                    svcWallet: { ...mockSvcWallet, send } as any,
                  }}
                >
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <SendDetails />
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </AspContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>,
    )
    return { ...view, pending, reloadWallet, setSendInfo, send }
  }

  const sign = async (send: ReturnType<typeof vi.fn>) => {
    fireEvent.click(await screen.findByText('Tap to Sign'))
    await waitFor(() => expect(send).toHaveBeenCalled())
  }

  it('cannot be dismissed from the sheet or the keyboard while it is being signed', async () => {
    const goBack = vi.spyOn(mockNavigationContextValue, 'goBack')
    const { send, container } = await start()
    await screen.findByText('Tap to Sign')
    expect(container.querySelector('button.sheet-page__scrim')).toBeInTheDocument()

    await sign(send)

    await waitFor(() => expect(container.querySelector(".sheet-page[data-busy='true']")).toBeInTheDocument())
    expect(container.querySelector('button.sheet-page__scrim')).not.toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(goBack).not.toHaveBeenCalled()
    goBack.mockRestore()
  })

  it('writes its result into the Send flow while its own screen is still up', async () => {
    const { send, pending, setSendInfo } = await start()
    await sign(send)

    pending.resolve('sent-txid')

    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ txid: 'sent-txid' })))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('still refreshes the wallet after the screen is gone, and leaves the Send flow alone', async () => {
    const { send, pending, reloadWallet, setSendInfo, unmount } = await start()
    await sign(send)
    setSendInfo.mockClear()

    unmount()
    pending.resolve('sent-txid')

    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
    expect(setSendInfo).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Payment sent')
  })

  it('reports a failure that lands after the screen is gone', async () => {
    const { send, pending, setSendInfo, unmount } = await start()
    await sign(send)
    setSendInfo.mockClear()

    unmount()
    pending.reject(new Error('boom'))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('boom')))
    expect(setSendInfo).not.toHaveBeenCalled()
  })

  it('hides the amount behind the sheet when balances are hidden', async () => {
    const { container } = await start(false)
    await screen.findByText('Tap to Sign')

    const backdrop = container.querySelector('.sheet-page__backdrop')
    expect(backdrop).toBeInTheDocument()
    expect(backdrop).not.toHaveTextContent(/1,000/)
    expect(screen.getByTestId('primary-amount')).not.toHaveTextContent(/1,000/)
  })

  it('shows it there when balances are shown', async () => {
    const { container } = await start(true)
    await screen.findByText('Tap to Sign')

    expect(container.querySelector('.sheet-page__backdrop')).toHaveTextContent(/1,000/)
  })
})
