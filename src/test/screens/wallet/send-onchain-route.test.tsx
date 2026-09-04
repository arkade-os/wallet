import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SendDetails from '../../../screens/Wallet/Send/Details'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FeesContext } from '../../../providers/fees'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { LnSwapsContext } from '../../../providers/lnSwaps'
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

/** Built from the request, as the real router is: the exit rail must pay
 *  whatever address it was asked to, or the last test below proves nothing. */
let optionsFor: (req: { raw: string; amount?: number }) => unknown[] = () => []
vi.mock('../../../lib/sendRouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/sendRouter')>()
  return { ...actual, createSendRouter: () => ({ options: async (req: any) => optionsFor(req) }) }
})

const ADDRESS = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'
const OTHER = 'bcrt1pq6gt72nxevsxk5fwl3h2sx56jeah6qfzh98mksxyakkg5l0q65gsa27khh'
const FEE = 500

/** A solver option whose quote is whatever the test says. `send()` records the
 *  call so a refusal is distinguishable from a spend. */
const solverOption = (quote: { amount: number; total: number }, sent: () => void) => ({
  railId: 'solver-onchain',
  quote: async () => ({
    railId: 'solver-onchain',
    ...quote,
    fee: quote.total - quote.amount,
    send: async () => {
      sent()
      return { settled: async () => ({ railId: 'solver-onchain', swapId: 'rfq-1' }) }
    },
  }),
})

const exitOption = (req: { raw: string; amount?: number }) => ({
  railId: 'onchain',
  quote: async (): Promise<any> => {
    const amount = req.amount!
    return {
      railId: 'onchain',
      amount,
      fee: FEE,
      total: amount + FEE,
      send: async () => {
        const txid = await collaborativeExitWithFees(mockSvcWallet as never, amount + FEE, amount, req.raw)
        return { settled: async () => ({ railId: 'onchain', txid }) }
      },
    }
  },
})

const renderSign = (sendInfo: SendInfo) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <FeesContext.Provider value={{ calcOnchainOutputFee: () => FEE } as never}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo }}>
                <WalletContext.Provider
                  value={{ ...mockWalletContextValue, balance: 1_000_000, svcWallet: mockSvcWallet as never }}
                >
                  <LnSwapsContext.Provider value={{ trackLnSend: async () => {}, reserveOnchainSend: async () => {} }}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <SendDetails />
                    </LimitsContext.Provider>
                  </LnSwapsContext.Provider>
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

describe('signing an on-chain send', () => {
  beforeEach(() => {
    collaborativeExitWithFees.mockClear()
    optionsFor = () => []
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

  it('never funds a rail that would spend more than the screen showed', async () => {
    const sent = vi.fn()
    optionsFor = (req) => [solverOption({ amount: 9_500, total: 10_001 }, sent), exitOption(req)]
    renderSign({ address: ADDRESS, satoshis: 10_000 })
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
