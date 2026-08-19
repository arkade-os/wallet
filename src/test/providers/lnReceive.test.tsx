import { useContext } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LightningReceiveSwap, RfqSwapManagerCallbacks, RfqSwapManagerEvents } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { LnReceiveContext, LnReceiveProvider } from '../../providers/lnReceive'
import type { LnReceiveRequest } from '../../lib/lnReceive'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

/**
 * The manager itself is the package's, and tested there. What is ours is the
 * wiring: one monitored swap per negotiation, the claim secrets held beside it,
 * and — the outcome nothing else on the receive screen can report — a
 * `refunded` receive read as a LOSS rather than as a completion.
 */
const addSwap = vi.hoisted(() => vi.fn())
const start = vi.hoisted(() => vi.fn())
const stop = vi.hoisted(() => vi.fn())
const setCallbacks = vi.hoisted(() => vi.fn())
const captured = vi.hoisted(() => ({ events: undefined as RfqSwapManagerEvents | undefined }))

vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  RfqSwapManager: class {
    constructor(_deps: unknown, config: { events?: RfqSwapManagerEvents }) {
      captured.events = config.events
    }
    setCallbacks = (callbacks: RfqSwapManagerCallbacks) => setCallbacks(callbacks)
    start = start
    stop = stop
    addSwap = addSwap
    poll = vi.fn()
  },
}))

const request = (rfqId = 'rfq-1'): LnReceiveRequest =>
  ({
    rfqId,
    invoice: 'lnbc105u1p...',
    payAmount: 10_500,
    expectedAmount: 10_000,
    invoiceExpiresAt: 1_800_000_600,
    address: 'tark1qlockup',
    swapPkScript: new Uint8Array([0x51, 0x20, 0xab]),
    script: {},
    payoutAddress: 'tark1qpayout',
    payoutPubkey: new Uint8Array(32).fill(1),
    secrets: {
      descriptor: 'tr(aa)',
      pubkey: new Uint8Array(32).fill(2),
      preimage: new Uint8Array(32).fill(3),
      paymentHash: new Uint8Array(32).fill(4),
      mustPersistPreimage: true,
    },
    quote: { refund_locktime: 1_800_003_600 },
  }) as unknown as LnReceiveRequest

function Harness({ rfqId = 'rfq-1' }: { rfqId?: string }) {
  const { track, status, error } = useContext(LnReceiveContext)
  return (
    <>
      <button onClick={() => track(request(rfqId)).catch(() => {})}>Track</button>
      <span data-testid='status'>{status(rfqId) ?? 'none'}</span>
      <span data-testid='error'>{error(rfqId) ?? 'none'}</span>
    </>
  )
}

const renderProvider = (reloadWallet = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <AspContext.Provider
      value={
        {
          ...mockAspContextValue,
          aspInfo: { ...mockAspContextValue.aspInfo, url: 'http://ark.local' },
        } as never
      }
    >
      <WalletContext.Provider
        value={
          {
            ...mockWalletContextValue,
            reloadWallet,
            svcWallet: { identity: {}, getContractManager: async () => ({}) },
          } as never
        }
      >
        <LnReceiveProvider>
          <Harness />
        </LnReceiveProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )
  return reloadWallet
}

const monitored = (state: LightningReceiveSwap['state']): LightningReceiveSwap =>
  ({ rfqId: 'rfq-1', kind: 'lightning_receive', state }) as LightningReceiveSwap

beforeEach(() => {
  captured.events = undefined
  addSwap.mockReset().mockResolvedValue(undefined)
  start.mockReset().mockResolvedValue(undefined)
  stop.mockReset().mockResolvedValue(undefined)
  setCallbacks.mockReset()
})

afterEach(() => vi.clearAllMocks())

describe('LnReceiveProvider', () => {
  it('monitors a negotiated receive once, and reports it pending', async () => {
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())

    await userEvent.click(screen.getByText('Track'))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'))

    await userEvent.click(screen.getByText('Track'))
    // Once per rfqId: `addSwap` REPLACES a monitored record, so a second call
    // for a swap already in flight would reset it to `pending` and un-say a
    // claim that has already gone out.
    expect(addSwap).toHaveBeenCalledTimes(1)
    const [swap] = addSwap.mock.calls[0]
    expect(swap.rfqId).toBe('rfq-1')
    expect(swap.kind).toBe('lightning_receive')
    // Our own sha256(P), not the quote's echo of it
    expect(swap.paymentHash).toBe('04'.repeat(32))
  })

  it('releases the rfqId when addSwap throws, so the retry is not swallowed', async () => {
    // `addSwap` is where LockupRegistrationFailed surfaces. The manager never
    // took the swap, so no callback will ever clear these — and the idempotency
    // guard above is keyed on the same entry, so an orphan would turn the
    // retry into a silent no-op if it ever reused the rfqId.
    addSwap.mockRejectedValueOnce(new Error('LockupRegistrationFailed'))
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())

    await userEvent.click(screen.getByText('Track'))
    await waitFor(() => expect(addSwap).toHaveBeenCalledTimes(1))
    // The optimistic `pending` is withdrawn: nothing is being monitored.
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('none'))

    await userEvent.click(screen.getByText('Track'))
    await waitFor(() => expect(addSwap).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'))
  })

  it('reports a refunded receive as the loss it is, and refreshes the balance', async () => {
    const reloadWallet = renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())
    await userEvent.click(screen.getByText('Track'))
    await waitFor(() => expect(addSwap).toHaveBeenCalled())

    // On a receive leg every non-claim leaf is the SOLVER's, so a lockup spent
    // any other way means the incoming payment never arrived. It reaches the
    // screen as a state, never as a silent end.
    captured.events?.onSwapCompleted?.(monitored('refunded'))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('refunded'))
    expect(reloadWallet).toHaveBeenCalled()
  })

  it('surfaces a settled receive and reloads: the claim lands off the worker', async () => {
    const reloadWallet = renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())
    await userEvent.click(screen.getByText('Track'))
    await waitFor(() => expect(addSwap).toHaveBeenCalled())

    captured.events?.onSwapCompleted?.(monitored('settled'))
    // The page's own RestArkProvider pushed the claim, so no VTXO_UPDATE comes
    // from the service worker and nothing else would refresh the balance.
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
    expect(screen.getByTestId('status')).toHaveTextContent('settled')
  })

  it('keys a failure by rfqId and clears it when the swap ends', async () => {
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())
    await userEvent.click(screen.getByText('Track'))

    // Fired for every throwing action, retried ones included — so it is a
    // reason to show, not an outcome to end on.
    captured.events?.onSwapFailed?.(monitored('claimable'), new Error('claim rejected'))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('claim rejected'))
    expect(screen.getByTestId('status')).toHaveTextContent('pending')

    captured.events?.onSwapCompleted?.(monitored('settled'))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('none'))
  })

  it('wires a claim callback that refuses a swap it holds no secrets for', async () => {
    renderProvider()
    await waitFor(() => expect(setCallbacks).toHaveBeenCalled())
    const { claimLockup } = setCallbacks.mock.calls[0][0] as RfqSwapManagerCallbacks

    // Untracked in this session — a reload, or another tab's swap. Better a
    // reported failure than a claim assembled from nothing.
    await expect(claimLockup(monitored('claimable'), [], { partiallyClaimed: false })).rejects.toThrow(
      /no claim secrets/,
    )
  })

  it('refuses the callbacks that belong to corridors it does not monitor', async () => {
    renderProvider()
    await waitFor(() => expect(setCallbacks).toHaveBeenCalled())
    const callbacks = setCallbacks.mock.calls[0][0] as RfqSwapManagerCallbacks

    // Throwing stubs, not no-ops: a silent one would turn "we monitored the
    // wrong kind of swap" into a swap that quietly does nothing.
    await expect(callbacks.claimOnchain({} as never, {} as never)).rejects.toThrow(/onchain-send/)
    await expect(callbacks.refundArkade({} as never)).rejects.toThrow(/no trader refund/)
  })
})
