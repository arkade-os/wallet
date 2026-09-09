import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeHandle } from '@arkade-os/sdk'
import { PRICING_BUDGET_MS } from '../../../lib/sendRouter'
import SendDetails from '../../../screens/Wallet/Send/Details'
import { readAllTransactionActivityMetadata } from '../../../lib/storage'
import { Unit } from '../../../lib/types'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FeesContext } from '../../../providers/fees'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { SwapsContext } from '../../../providers/swaps'
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

const collaborativeExitWithFees = vi.fn<
  (wallet: unknown, input: number, output: number, address: string) => Promise<string>
>(async () => 'exit-txid')
vi.mock('../../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/asp')>()),
  collaborativeExitWithFees: (...args: Parameters<typeof collaborativeExitWithFees>) =>
    collaborativeExitWithFees(...args),
}))

/** Readable without waiting out the animation the error renders behind. */
const consoleError = vi.fn()
const consoleLog = vi.fn()
vi.mock('../../../lib/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/logs')>()),
  consoleError: (...args: unknown[]) => consoleError(...args),
  consoleLog: (...args: unknown[]) => consoleLog(...args),
}))

/** Built from the request, as the real router is: the exit rail must pay
 *  whatever address it was asked to, or the last test below proves nothing. */
let optionsFor: (req: { raw: string; amount?: number }) => unknown[] = () => []
/** The router the driving tab hands the screen, stubbed at the context seam. */
const swaps = { sendRouter: async () => ({ options: async (req: any) => optionsFor(req) }) }

const ADDRESS = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'
const OTHER = 'bcrt1pq6gt72nxevsxk5fwl3h2sx56jeah6qfzh98mksxyakkg5l0q65gsa27khh'
const FEE = 500

/** Real handles: a swap rail emits `sent` and stays open, as `swapHandle` does. */
const fundedHandle = (result: any) =>
  makeHandle(result.railId, async (emit) => {
    emit({ status: 'sent', result })
    return await new Promise<any>(() => {})
  })
const settledHandle = (result: any) =>
  makeHandle(result.railId, async (emit) => {
    emit({ status: 'settled', result })
    return result
  })

/** A solver option whose quote is whatever the test says. `send()` records the
 *  call so a refusal is distinguishable from a spend. */
const solverOption = (quote: { amount: number; total: number }, sent: () => void) => ({
  railId: 'onchain-swap',
  quote: async () => ({
    railId: 'onchain-swap',
    ...quote,
    fee: quote.total - quote.amount,
    send: async () => {
      sent()
      return fundedHandle({ railId: 'onchain-swap', swapId: 'rfq-1' })
    },
  }),
})

/** Cheap when the screen prices the send, dearer when it comes to spend — the
 *  only way left for a rail to ask for more than the user was shown. */
const solverThatGetsDearer = (
  preview: { amount: number; total: number },
  spend: { amount: number; total: number },
  sent: () => void,
) => {
  let quotes = 0
  return () => ({
    railId: 'onchain-swap',
    quote: async () => {
      const quote = quotes++ === 0 ? preview : spend
      return {
        railId: 'onchain-swap',
        ...quote,
        fee: quote.total - quote.amount,
        send: async () => {
          sent()
          return fundedHandle({ railId: 'onchain-swap', swapId: 'rfq-1' })
        },
      }
    },
  })
}

const failingSolverOption = (reason: string) => ({
  railId: 'onchain-swap',
  quote: async () => ({
    railId: 'onchain-swap',
    amount: 9_500,
    fee: 500,
    total: 10_000,
    send: async () =>
      makeHandle('onchain-swap', async () => {
        throw new Error(reason)
      }),
  }),
})

const exitOption = (req: { raw: string; amount?: number }, fee = FEE) => ({
  railId: 'onchain',
  quote: async (): Promise<any> => {
    const amount = req.amount!
    return {
      railId: 'onchain',
      amount,
      fee,
      total: amount + fee,
      send: async () => {
        const txid = await collaborativeExitWithFees(mockSvcWallet as never, amount + fee, amount, req.raw)
        return settledHandle({ railId: 'onchain', txid })
      },
    }
  },
})

const satsConfig = {
  ...mockConfigContextValue,
  config: { ...mockConfigContextValue.config, unit: Unit.SATS },
  useFiat: false,
}

const renderSign = (
  sendInfo: SendInfo,
  { limits = mockLimitsContextValue, outputFee = FEE, config = mockConfigContextValue } = {},
) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <ConfigContext.Provider value={config}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <FeesContext.Provider value={{ calcOnchainOutputFee: () => outputFee } as never}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo }}>
                <WalletContext.Provider
                  value={{ ...mockWalletContextValue, balance: 1_000_000, svcWallet: mockSvcWallet as never }}
                >
                  <SwapsContext.Provider value={swaps as never}>
                    <LimitsContext.Provider value={limits}>
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

const sign = async () => {
  const button = await screen.findByText('Tap to Sign')
  fireEvent.click(button)
}

/** The error `handleError` was given, ignoring the other things that log. */
const sendFailure = () => consoleError.mock.calls.find((c) => c[1] === 'error sending payment')?.[0]

describe('signing an on-chain send', () => {
  beforeEach(() => {
    collaborativeExitWithFees.mockClear()
    consoleError.mockClear()
    consoleLog.mockClear()
    optionsFor = () => []
  })

  it('names the UTXO limit rather than blaming routing when on-chain sends are not permitted', async () => {
    const consulted = vi.fn((req: { raw: string; amount?: number }) => [exitOption(req)])
    optionsFor = consulted
    renderSign(
      { address: ADDRESS, satoshis: 10_000 },
      { limits: { ...mockLimitsContextValue, utxoTxsAllowed: () => false } },
    )
    await sign()

    await waitFor(() => expect(sendFailure()).toBeDefined())
    expect(String(sendFailure())).toMatch(/not permitted/i)
    expect(consulted).not.toHaveBeenCalled()
  })

  /** Characterisation of the #944 report; the fallback is a product decision. */
  it('is committed to the exit’s price when the solver reaches options() only for the spend', async () => {
    const sent = vi.fn()
    let asked = 0
    optionsFor = (req) =>
      asked++ === 0 ? [exitOption(req, 0)] : [solverOption({ amount: 22_000, total: 22_709 }, sent), exitOption(req, 0)]
    renderSign({ address: ADDRESS, satoshis: 22_000 }, { outputFee: 0, config: satsConfig })
    await sign()

    await waitFor(() => expect(collaborativeExitWithFees).toHaveBeenCalledTimes(1))
    expect(sent).not.toHaveBeenCalled()
    expect(consoleLog.mock.calls.map(String).join('\n')).toContain(
      'onchain-swap refused: quote pays 22000 for 22709, screen shows 22000 for 22000',
    )
  })

  /** Before the budget, a silent rail held Tap to Sign for the RFQ's 30s. */
  it('offers the signature at its own deadline rather than waiting out a silent rail', async () => {
    vi.useFakeTimers()
    try {
      optionsFor = (req) => [{ railId: 'onchain-swap', quote: () => new Promise(() => {}) }, exitOption(req)]
      renderSign({ address: ADDRESS, satoshis: 10_000 })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(PRICING_BUDGET_MS)
      })

      expect(screen.getByText('Tap to Sign')).toBeTruthy()
      expect(screen.queryByText('Getting quote')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('pays the collaborative exit when no solver rail survived', async () => {
    optionsFor = (req) => [exitOption(req)]
    renderSign({ address: ADDRESS, satoshis: 10_000 })
    await sign()

    await waitFor(() => expect(collaborativeExitWithFees).toHaveBeenCalledTimes(1))
    // 10_000 typed = what LEAVES; the recipient gets it less the output fee.
    expect(collaborativeExitWithFees).toHaveBeenCalledWith(expect.anything(), 10_000, 9_500, ADDRESS)
  })

  it('never funds a rail quoting a different recipient amount than the screen showed', async () => {
    const sent = vi.fn()
    optionsFor = (req) => [solverOption({ amount: 9_000, total: 10_000 }, sent), exitOption(req)]
    renderSign({ address: ADDRESS, satoshis: 10_000 })
    await sign()

    await waitFor(() => expect(collaborativeExitWithFees).toHaveBeenCalledTimes(1))
    expect(sent).not.toHaveBeenCalled()
  })

  // From mutinynet, where the exit rail's output fee is 0:
  // `quote pays 40000 for 40754, screen shows 40000 for 40000`.
  it('funds a solver that charges on top, having shown that total before signing', async () => {
    const sent = vi.fn()
    optionsFor = (req) => [solverOption({ amount: 40_000, total: 40_754 }, sent), exitOption(req, 0)]
    renderSign({ address: ADDRESS, satoshis: 40_000 }, { outputFee: 0, config: satsConfig })

    expect(await screen.findByTestId('Total')).toHaveTextContent(/40.?754/)
    expect(screen.getByTestId('Network fees')).toHaveTextContent(/754/)
    await sign()

    await waitFor(() => expect(sent).toHaveBeenCalledTimes(1))
    expect(collaborativeExitWithFees).not.toHaveBeenCalled()
  })

  it('never funds a rail that would spend more than the screen showed', async () => {
    const sent = vi.fn()
    const solver = solverThatGetsDearer({ amount: 40_000, total: 40_754 }, { amount: 40_000, total: 41_000 }, sent)
    optionsFor = (req) => [solver(), exitOption(req, 0)]
    renderSign({ address: ADDRESS, satoshis: 40_000 }, { outputFee: 0, config: satsConfig })

    expect(await screen.findByTestId('Total')).toHaveTextContent(/40.?754/)
    await sign()

    await waitFor(() => expect(collaborativeExitWithFees).toHaveBeenCalledTimes(1))
    expect(sent).not.toHaveBeenCalled()
  })

  it('funds the solver when its quote is the send the screen is showing', async () => {
    const sent = vi.fn()
    optionsFor = (req) => [solverOption({ amount: 9_500, total: 10_000 }, sent), exitOption(req)]
    renderSign({ address: ADDRESS, satoshis: 10_000 })
    await sign()

    await waitFor(() => expect(sent).toHaveBeenCalledTimes(1))
    expect(collaborativeExitWithFees).not.toHaveBeenCalled()
  })

  // A rejection can mean a covenant that IS funded, so falling through to the
  // exit would pay the recipient twice.
  it('does not try the next rail after a send that may already have funded', async () => {
    const exitSent = vi.fn()
    optionsFor = (req) => [failingSolverOption('worker never replied'), { ...exitOption(req), sent: exitSent }]
    renderSign({ address: ADDRESS, satoshis: 10_000 })
    await sign()

    await waitFor(() => expect(sendFailure()).toBeDefined())
    expect(String(sendFailure())).toMatch(/worker never replied/i)
    expect(collaborativeExitWithFees).not.toHaveBeenCalled()
  })

  it('records the destination and fee at the funding, while the swap is still running', async () => {
    // On the terminal outcome this needed the payer still here minutes later.
    localStorage.clear()
    const sent = vi.fn()
    optionsFor = (req) => [
      {
        railId: 'onchain-swap',
        quote: async () => ({
          railId: 'onchain-swap',
          amount: 40_000,
          fee: 754,
          total: 40_754,
          send: async () => {
            sent()
            return fundedHandle({ railId: 'onchain-swap', swapId: 'rfq-1', txid: 'lockup-txid' })
          },
        }),
      },
      exitOption(req, 0),
    ]
    renderSign({ address: ADDRESS, satoshis: 40_000 }, { outputFee: 0, config: satsConfig })
    await sign()

    await waitFor(() => expect(readAllTransactionActivityMetadata()['lockup-txid']).toBeDefined())
    // Off the QUOTE, not the screen, whose exit fee here is 0.
    expect(readAllTransactionActivityMetadata()['lockup-txid']).toMatchObject({
      destination: ADDRESS,
      networkFee: 754,
    })
    expect(sendFailure()).toBeUndefined()
  })

  it('routes to the address the screen is showing, not one held from before', async () => {
    // The wrong-address regression (1b3481b), at the screen that moves the
    // money. The request is built from `sendInfo.address`, so a recipient
    // changed on the way back here is the one that gets paid.
    optionsFor = (req) => [exitOption(req)]
    renderSign({ address: OTHER, satoshis: 10_000 })
    await sign()

    await waitFor(() => expect(collaborativeExitWithFees).toHaveBeenCalledTimes(1))
    expect(collaborativeExitWithFees).toHaveBeenCalledWith(expect.anything(), 10_000, 9_500, OTHER)
  })
})
