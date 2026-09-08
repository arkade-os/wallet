import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import { getEmulatorPubkeyForNetwork } from '../../../lib/constants'
import { makeHandle } from '@arkade-os/sdk'
import SendDetails from '../../../screens/Wallet/Send/Details'
import SendForm from '../../../screens/Wallet/Send/Form'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FeesContext } from '../../../providers/fees'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { SwapsContext } from '../../../providers/swaps'
import { NavigationContext } from '../../../providers/navigation'
import { OptionsContext } from '../../../providers/options'
import { WalletContext } from '../../../providers/wallet'
import fixtures from '../../fixtures.json'
import { decodeInvoice } from '../../../lib/bolt11'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockOptionsContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'

const consoleError = vi.fn()
vi.mock('../../../lib/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/logs')>()),
  consoleError: (...args: unknown[]) => consoleError(...args),
}))

let optionsFor: (req: { raw: string; amount?: number }) => unknown[] = () => []
let routerAsked = 0
/** The router the driving tab hands the screen, stubbed at the context seam. */
const swaps = {
  sendRouter: async () => {
    routerAsked += 1
    return { options: async (req: any) => optionsFor(req) }
  },
}

/** The cards the form discovers once and hands to both the router and the
 *  refusal. `discovered` counts the calls; `marketsThrow` is the cold-cache
 *  registry failure. */
let markets: unknown[] = []
let marketsThrow = false
const discovered = vi.fn()
vi.mock('../../../lib/swapMarkets', () => ({
  discoverMarkets: async () => {
    discovered()
    if (marketsThrow) throw new Error('registry unreachable')
    return markets
  },
}))

const INVOICE = fixtures.lib.bolt11.invoice
const ARK_ADDRESS = fixtures.lib.address.ark[0].address
const INVOICE_SATS = fixtures.lib.bolt11.amountSats

/** A negotiated Lightning route, as the send form hands it to the sign screen. */
const lnQuote = (over: { paymentHash?: string; total?: number } = {}, sent = vi.fn()) => ({
  railId: 'lightning',
  amount: INVOICE_SATS,
  fee: (over.total ?? INVOICE_SATS) - INVOICE_SATS,
  total: over.total ?? INVOICE_SATS,
  meta: { paymentHash: over.paymentHash ?? decodeInvoice(INVOICE).paymentHash },
  send: async () => {
    sent()
    // `sent` and nothing after it: the screen must return on that alone.
    return makeHandle('lightning', async (emit) => {
      emit({ status: 'sent', result: { railId: 'lightning', txid: 'funding-txid', swapId: 'rfq-1' } })
      return await new Promise<any>(() => {})
    })
  },
})

const setSendInfo = vi.fn()

const renderSign = (sendInfo: SendInfo) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <FeesContext.Provider value={{ calcOnchainOutputFee: () => 500 } as never}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo, setSendInfo }}>
                <WalletContext.Provider
                  value={{ ...mockWalletContextValue, balance: 1_000_000, svcWallet: mockSvcWallet as never }}
                >
                  <SwapsContext.Provider value={swaps as never}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <SendDetails />
                    </LimitsContext.Provider>
                  </SwapsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </FeesContext.Provider>
          </AspContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )

const sign = async () => fireEvent.click(await screen.findByText('Tap to Sign'))

const sendFailure = () => consoleError.mock.calls.find((c) => c[1] === 'error sending payment')?.[0]

describe('signing a Lightning send', () => {
  beforeEach(() => {
    consoleError.mockClear()
    setSendInfo.mockClear()
    optionsFor = () => []
  })

  it('funds the route negotiated for the invoice on screen', async () => {
    const sent = vi.fn()
    const quote = lnQuote({}, sent)
    renderSign({ invoice: INVOICE, satoshis: INVOICE_SATS, pendingLnSend: quote as never })
    await sign()

    await waitFor(() => expect(sent).toHaveBeenCalledTimes(1))
    // The rail's own txid reaches the flow, which is what the receipt renders.
    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ txid: 'funding-txid' })))
  })

  it('carries the quote’s total, not the amount typed', async () => {
    renderSign({ invoice: INVOICE, satoshis: INVOICE_SATS, pendingLnSend: lnQuote({ total: 2_200 }) as never })
    await sign()

    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ total: 2_200 })))
  })

  it('never funds a route negotiated for a DIFFERENT invoice', async () => {
    const sent = vi.fn()
    const stale = lnQuote({ paymentHash: 'ab'.repeat(32) }, sent)
    renderSign({ invoice: INVOICE, satoshis: INVOICE_SATS, pendingLnSend: stale as never })
    await sign()

    await waitFor(() => expect(sendFailure()).toBeDefined())
    expect(String(sendFailure())).toMatch(/different invoice/i)
    expect(sent).not.toHaveBeenCalled()
  })

  it('reports a rail that refused to fund rather than reporting a sent payment', async () => {
    const quote = {
      ...lnQuote(),
      send: async () =>
        makeHandle('lightning', async () => {
          throw new Error('Quote expired — go back and try again')
        }),
    }
    renderSign({ invoice: INVOICE, satoshis: INVOICE_SATS, pendingLnSend: quote as never })
    await sign()

    await waitFor(() => expect(sendFailure()).toBeDefined())
    expect(String(sendFailure())).toMatch(/Quote expired/)
  })
})

describe('signing an asset send', () => {
  const assets = [{ assetId: 'usdt', amount: BigInt(500) }]

  const assetOption = (sent: (address: string) => void) => (req: { raw: string }) => [
    {
      railId: 'asset',
      quote: async () => ({
        railId: 'asset',
        amount: 0,
        fee: 0,
        total: 0,
        send: async () => {
          sent(req.raw)
          return { settled: async () => ({ railId: 'asset', txid: 'asset-txid' }) }
        },
      }),
    },
  ]

  beforeEach(() => {
    consoleError.mockClear()
    setSendInfo.mockClear()
    optionsFor = () => []
  })

  it('routes to the ark address the screen is showing', async () => {
    const sent = vi.fn()
    optionsFor = assetOption(sent)
    renderSign({ arkAddress: ARK_ADDRESS, assets })
    await sign()

    await waitFor(() => expect(sent).toHaveBeenCalledWith(ARK_ADDRESS))
    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ txid: 'asset-txid' })))
  })

  it('reports a failure rather than a send when no rail took it', async () => {
    optionsFor = () => []
    renderSign({ arkAddress: ARK_ADDRESS, assets })
    await sign()

    await waitFor(() => expect(sendFailure()).toBeDefined())
    expect(String(sendFailure())).toMatch(/No route/i)
  })
})

/** Addresses that resolve: the form white-screens on a receiving-address
 *  failure, which `mockSvcWallet`'s empty strings trigger. */
const formWallet = { ...mockSvcWallet, getAddress: async () => 'ark1self', getBoardingAddress: async () => 'bcrt1self' }

const renderForm = (sendInfo: SendInfo) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue as never}>
          <FiatContext.Provider value={mockFiatContextValue as never}>
            <OptionsContext.Provider value={mockOptionsContextValue as never}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo, setSendInfo } as never}>
                <WalletContext.Provider
                  value={{
                    ...mockWalletContextValue,
                    balance: 1_000_000,
                    availableBalance: 1_000_000,
                    svcWallet: formWallet as never,
                  }}
                >
                  <SwapsContext.Provider value={swaps as never}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <FeesContext.Provider value={{ calcOnchainOutputFee: () => 500 } as never}>
                        <SendForm />
                      </FeesContext.Provider>
                    </LimitsContext.Provider>
                  </SwapsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </OptionsContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )

const cont = async () => fireEvent.click(await screen.findByText('Continue'))

describe('negotiating a Lightning send', () => {
  const lnMarket = {
    pair: 'BTC/lightning:BTC',
    base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
    quote_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
    base_corridor: 'arkade',
    quote_corridor: 'lightning',
    fee_bps: 0,
    min_base_amount: '1000',
    max_base_amount: '1000000',
    min_quote_amount: '1000',
    max_quote_amount: '1000000',
    discovery_pubkey: 'bb'.repeat(32),
    emulator_pubkey: hex.encode(getEmulatorPubkeyForNetwork('regtest')!),
    transports: { nostr: { relays: ['wss://relay.example'] } },
  }

  beforeEach(() => {
    consoleError.mockClear()
    setSendInfo.mockClear()
    discovered.mockClear()
    optionsFor = () => []
    markets = []
    marketsThrow = false
    routerAsked = 0
  })

  it('carries the route the Lightning rail quoted to the sign screen', async () => {
    const quote = lnQuote()
    optionsFor = () => [{ railId: 'lightning', quote: async () => quote }]
    renderForm({ invoice: INVOICE, satoshis: INVOICE_SATS })
    await cont()

    await waitFor(() => expect(setSendInfo).toHaveBeenCalled())
    const update = setSendInfo.mock.calls.at(-1)![0] as (prev: SendInfo) => SendInfo
    expect(update({} as SendInfo).pendingLnSend).toBe(quote)
  })

  it('asks the router with the invoice, not the raw text and not a second amount', async () => {
    const consulted = vi.fn(() => [{ railId: 'lightning', quote: async () => lnQuote() }])
    optionsFor = consulted
    renderForm({ invoice: INVOICE, satoshis: INVOICE_SATS })
    await cont()

    await waitFor(() => expect(consulted).toHaveBeenCalledWith({ raw: INVOICE }))
  })

  it('says no solver when the rail dropped itself and no card serves the corridor', async () => {
    optionsFor = () => []
    renderForm({ invoice: INVOICE, satoshis: INVOICE_SATS })
    await cont()

    expect(await screen.findByText('No Lightning solver available')).toBeInTheDocument()
  })

  it('names the card’s bounds when the rail dropped itself over the size', async () => {
    optionsFor = () => []
    markets = [{ ...lnMarket, min_quote_amount: '50000', max_quote_amount: '1000000' }]
    renderForm({ invoice: INVOICE, satoshis: INVOICE_SATS })
    await cont()

    expect(await screen.findByText(/Amount outside solver bounds/)).toBeInTheDocument()
  })

  it('does not blame bounds that admit the amount when the rail dropped for another reason', async () => {
    optionsFor = () => []
    markets = [lnMarket]
    renderForm({ invoice: INVOICE, satoshis: INVOICE_SATS })
    await cont()

    expect(await screen.findByText(/No Lightning solver took this payment/)).toBeInTheDocument()
    expect(screen.queryByText(/Amount outside solver bounds/)).not.toBeInTheDocument()
  })

  it('discovers the cards once, and explains the refusal off that same list', async () => {
    optionsFor = () => []
    markets = [lnMarket]
    renderForm({ invoice: INVOICE, satoshis: INVOICE_SATS })
    await cont()

    // The refusal message proves the list reached `lnSendRefusal`; the count
    // proves the rail was not sent to fetch its own.
    expect(await screen.findByText(/solvers take 1,000-1,000,000 sats/)).toBeInTheDocument()
    expect(discovered).toHaveBeenCalledTimes(1)
  })

  // A cold cache with an unreachable registry used to replace the intended
  // message with the registry's own, because the error path asked again.
  it('still names the refusal when the registry is unreachable mid-flight', async () => {
    optionsFor = () => {
      marketsThrow = true
      return []
    }
    renderForm({ invoice: INVOICE, satoshis: INVOICE_SATS })
    await cont()

    expect(await screen.findByText('No Lightning solver available')).toBeInTheDocument()
    expect(discovered).toHaveBeenCalledTimes(1)
  })

  it('reads the cards once, for the refusal message — the rail ranks off the client', async () => {
    markets = [lnMarket]
    optionsFor = () => [{ railId: 'lightning', quote: async () => lnQuote() }]
    renderForm({ invoice: INVOICE, satoshis: INVOICE_SATS })
    await cont()

    await waitFor(() => expect(routerAsked).toBe(1))
    expect(discovered).toHaveBeenCalledTimes(1)
  })

  it('surfaces a refused negotiation verbatim rather than as a routing failure', async () => {
    optionsFor = () => [
      {
        railId: 'lightning',
        quote: async () => {
          throw new Error('invoice has expired')
        },
      },
    ]
    renderForm({ invoice: INVOICE, satoshis: INVOICE_SATS })
    await cont()

    expect(await screen.findByText('invoice has expired')).toBeInTheDocument()
  })
})
