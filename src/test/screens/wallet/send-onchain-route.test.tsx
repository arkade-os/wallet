import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SendDetails from '../../../screens/Wallet/Send/Details'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { LnSwapsContext } from '../../../providers/lnSwaps'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { getLogs } from '../../../lib/logs'
import type { OnchainSendRequest } from '../../../lib/onchainSwap'
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

/**
 * The sign screen's fork: an L1 address either goes out through a solver that
 * quoted it, or through the collaborative exit the wallet has always done.
 *
 * These tests are about which of the two MOVES THE MONEY, so they mock only
 * the two functions that do (`sendOffChain` funds the solver's lockup;
 * `collaborativeExitWithFees` is the exit) and assert on the call, not on a
 * rendered string. A test that watched the screen would pass just as happily
 * with both paths wired to the same call.
 */
const collaborativeExitWithFees = vi.hoisted(() => vi.fn())
const sendOffChain = vi.hoisted(() => vi.fn())

vi.mock('../../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/asp')>()),
  collaborativeExitWithFees: (...args: unknown[]) => collaborativeExitWithFees(...args),
  sendOffChain: (...args: unknown[]) => sendOffChain(...args),
}))

const ADDRESS = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'
const LOCKUP = 'tark1lockupcovenant'
const FAR_FUTURE = 2_000_000_000

const quote = (over: Partial<OnchainSendRequest> = {}): OnchainSendRequest =>
  ({
    rfqId: 'rfq-onchain-1',
    address: LOCKUP,
    fundAmount: 5_000,
    payoutAmount: 4_800,
    validUntil: FAR_FUTURE,
    rendezvous: {
      solverPubkey: 'bb'.repeat(32),
      transports: { nostr: { relays: ['wss://relay.example'] } },
      emulatorPubkey: 'aa'.repeat(32),
      minSats: 1_000,
      maxSats: 100_000,
    },
    htlc: { address: 'bcrt1htlc' },
    htlcParams: { paymentHash: 'ab'.repeat(32) },
    l1Network: 'regtest',
    minConfirmations: 1,
    record: {
      paymentHash: 'ab'.repeat(32),
      refundLocktime: FAR_FUTURE,
      secrets: {},
      script: {},
      htlc: { address: 'bcrt1htlc' },
      htlcParams: { paymentHash: 'ab'.repeat(32) },
      l1Network: 'regtest',
      minConfirmations: 1,
    },
    ...over,
  }) as unknown as OnchainSendRequest

const reserveOnchainSend = vi.fn()
const trackOnchainSend = vi.fn()

const renderSign = (sendInfo: SendInfo) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo }}>
              <WalletContext.Provider
                value={{ ...mockWalletContextValue, balance: 20_000, svcWallet: mockSvcWallet as any }}
              >
                <LimitsContext.Provider value={mockLimitsContextValue}>
                  <LnSwapsContext.Provider value={{ trackLnSend: vi.fn(), reserveOnchainSend, trackOnchainSend }}>
                    <SendDetails />
                  </LnSwapsContext.Provider>
                </LimitsContext.Provider>
              </WalletContext.Provider>
            </FlowContext.Provider>
          </AspContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )

const sign = async () => {
  const button = await screen.findByText('Tap to Sign')
  fireEvent.click(button)
}

/** Every routing decision the wallet made, as the log records them. */
const routeLog = () => getLogs().filter((line) => line.msg.startsWith('onchain send:'))

describe('sending onchain: solver route or collaborative exit', () => {
  beforeEach(() => {
    localStorage.clear()
    collaborativeExitWithFees.mockReset().mockResolvedValue('exit-txid')
    sendOffChain.mockReset().mockResolvedValue('lockup-funding-txid')
    reserveOnchainSend.mockReset().mockResolvedValue(undefined)
    trackOnchainSend.mockReset().mockResolvedValue(undefined)
  })

  it('funds the solver lockup when a quote is in hand, and does not exit collaboratively', async () => {
    renderSign({ address: ADDRESS, satoshis: 5_000, pendingOnchainSend: quote() })
    await sign()

    await waitFor(() => expect(sendOffChain).toHaveBeenCalledTimes(1))
    // The lockup the wallet derived ITSELF, for exactly what the quote said.
    expect(sendOffChain).toHaveBeenCalledWith(expect.anything(), 5_000, LOCKUP)
    expect(collaborativeExitWithFees).not.toHaveBeenCalled()
  })

  it('persists the swap BEFORE funding, so the L1 claim survives a crash', async () => {
    // The one ordering this corridor cannot reverse: the HTLC's parameters are
    // on the record and nowhere else, so a lockup funded ahead of the write is
    // a fill nothing can claim.
    const order: string[] = []
    reserveOnchainSend.mockImplementation(async () => void order.push('reserve'))
    sendOffChain.mockImplementation(async () => {
      order.push('fund')
      return 'lockup-funding-txid'
    })
    trackOnchainSend.mockImplementation(async () => void order.push('track'))

    renderSign({ address: ADDRESS, satoshis: 5_000, pendingOnchainSend: quote() })
    await sign()

    await waitFor(() => expect(order).toEqual(['reserve', 'fund', 'track']))
    expect(trackOnchainSend).toHaveBeenCalledWith(expect.objectContaining({ fundingTxid: 'lockup-funding-txid' }))
  })

  it('does exactly what it always did when no solver could take the send', async () => {
    // The no-regression case: a wallet with no matching card gets the same
    // collaborative exit, with the same arguments.
    renderSign({ address: ADDRESS, satoshis: 5_000 })
    await sign()

    await waitFor(() => expect(collaborativeExitWithFees).toHaveBeenCalledTimes(1))
    expect(collaborativeExitWithFees).toHaveBeenCalledWith(expect.anything(), 5_000, expect.any(Number), ADDRESS)
    expect(sendOffChain).not.toHaveBeenCalled()
    expect(reserveOnchainSend).not.toHaveBeenCalled()
  })

  it('falls back to the collaborative exit when the quote expired while the screen was open', async () => {
    renderSign({ address: ADDRESS, satoshis: 5_000, pendingOnchainSend: quote({ validUntil: 1 }) })
    await sign()

    await waitFor(() => expect(collaborativeExitWithFees).toHaveBeenCalledTimes(1))
    expect(sendOffChain).not.toHaveBeenCalled()
    expect(routeLog().at(-1)?.msg).toContain('quote_expired')
  })

  it('falls back rather than spending an amount the screen never showed', async () => {
    renderSign({ address: ADDRESS, satoshis: 5_000, pendingOnchainSend: quote({ fundAmount: 9_000 }) })
    await sign()

    await waitFor(() => expect(collaborativeExitWithFees).toHaveBeenCalledTimes(1))
    expect(sendOffChain).not.toHaveBeenCalled()
    expect(routeLog().at(-1)?.msg).toContain('amount_mismatch')
  })

  it('falls back when the swap cannot be persisted, because nothing has been funded yet', async () => {
    reserveOnchainSend.mockRejectedValue(new Error('quota exceeded'))
    renderSign({ address: ADDRESS, satoshis: 5_000, pendingOnchainSend: quote() })
    await sign()

    await waitFor(() => expect(collaborativeExitWithFees).toHaveBeenCalledTimes(1))
    expect(sendOffChain).not.toHaveBeenCalled()
    expect(routeLog().at(-1)?.msg).toContain('record_failed')
  })

  it('names a reason on every fallback, so a route not taken is never silent', async () => {
    renderSign({ address: ADDRESS, satoshis: 5_000, pendingOnchainSend: quote({ validUntil: 1 }) })
    await sign()

    await waitFor(() => expect(routeLog()).toHaveLength(1))
    expect(routeLog()[0].msg).toMatch(/^onchain send: collaborative exit \(\w+\)/)
  })

  it('shows the solver payout, not the collaborative exit fee', async () => {
    // The screen quotes what will actually land. Showing arkd's onchain-output
    // fee beside a solver quote would name a number nobody is going to charge —
    // and here the two differ: the mocked collaborative-exit fee is zero, the
    // quote's spread is 200 sats. (Amounts render in the mock's currency of
    // account at 1:1, so the figures below are the sat amounts.)
    renderSign({ address: ADDRESS, satoshis: 5_000, pendingOnchainSend: quote() })
    await waitFor(() => expect(screen.getByTestId('Network fees')).toHaveTextContent('200'))
    expect(screen.getByTestId('Total')).toHaveTextContent('5,000')
  })

  it('leaves the collaborative-exit figures untouched when there is no quote', async () => {
    renderSign({ address: ADDRESS, satoshis: 5_000 })
    await waitFor(() => expect(screen.getByTestId('Total')).toHaveTextContent('5,000'))
    expect(screen.getByTestId('Network fees')).toHaveTextContent('0')
  })
})
