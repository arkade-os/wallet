import { useContext, useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type LightningReceiveProfile,
  type LightningReceiveSwap,
  type RfqRestoreResult,
  type RfqSwapManagerCallbacks,
  type RfqSwapManagerDeps,
  type RfqSwapManagerEvents,
  type RfqSwapRecord,
} from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { LnReceiveContext, LnReceiveProvider } from '../../providers/lnReceive'
import { toReceiveOrigin, type LnReceiveRequest } from '../../lib/lnReceive'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

/**
 * The manager itself is the package's, and tested there. What is ours is the
 * wiring: the repository as its canonical sink, an origin handed to `addSwap`
 * so the first record can be written at all, a claim read back out of that
 * record rather than out of a session map, a boot restore — and the Web Lock
 * that keeps a second tab from claiming the same lockup.
 */
const addSwap = vi.hoisted(() => vi.fn())
const start = vi.hoisted(() => vi.fn())
const stop = vi.hoisted(() => vi.fn())
const restoreFromRepository = vi.hoisted(() => vi.fn())
const setCallbacks = vi.hoisted(() => vi.fn())
const claimReceive = vi.hoisted(() => vi.fn())
const captured = vi.hoisted(() => ({
  events: undefined as RfqSwapManagerEvents | undefined,
  deps: undefined as RfqSwapManagerDeps | undefined,
}))

vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  RfqSwapManager: class {
    constructor(deps: RfqSwapManagerDeps, config: { events?: RfqSwapManagerEvents }) {
      captured.deps = deps
      captured.events = config.events
    }
    setCallbacks = (callbacks: RfqSwapManagerCallbacks) => setCallbacks(callbacks)
    start = start
    stop = stop
    addSwap = addSwap
    restoreFromRepository = restoreFromRepository
    poll = vi.fn()
  },
}))

// The claim itself is covered in `lib/lnReceive.test.ts` against real wallets;
// here what matters is WHAT the callback dug out of the stored record.
vi.mock('../../lib/lnReceive', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/lnReceive')>()),
  claimReceive,
}))

vi.mock('../../lib/swapRepository', async () => {
  const { InMemoryAssetSwapRepository: InMemory } = await import('@arkade-os/swap')
  return { assetSwapRepository: new InMemory() }
})

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
    secrets: {
      descriptor: 'tr(aa)',
      pubkey: new Uint8Array(32).fill(2),
      preimage: new Uint8Array(32).fill(3),
      paymentHash: new Uint8Array(32).fill(4),
      mustPersistPreimage: true,
    },
    treeParams: { refundLocktime: 1_800_003_600, paymentHash: '04'.repeat(32) },
  }) as unknown as LnReceiveRequest

/** What the manager would have written on this swap's first pass. */
const storedRecord = (rfqId = 'rfq-1'): RfqSwapRecord =>
  ({
    ...toReceiveOrigin(request(rfqId)),
    rfqId,
    state: 'claimable',
    createdAt: 1_800_000_000,
    updatedAt: 1_800_000_000,
  }) as RfqSwapRecord

function Harness({ rfqId = 'rfq-1', tab = 'a' }: { rfqId?: string; tab?: string }) {
  const { track, status, error } = useContext(LnReceiveContext)
  const [rejected, setRejected] = useState('')
  return (
    <div data-testid={`tab-${tab}`}>
      <button
        onClick={() => track(request(rfqId)).catch((err: Error) => setRejected(err.name))}
      >{`Track ${tab}`}</button>
      <span data-testid='status'>{status(rfqId) ?? 'none'}</span>
      <span data-testid='error'>{error(rfqId) ?? 'none'}</span>
      <span data-testid='rejected'>{rejected || 'none'}</span>
    </div>
  )
}

const wrap = (children: React.ReactNode) => (
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
          reloadWallet: reloadWallet,
          svcWallet: { identity: {}, getContractManager: async () => ({}) },
        } as never
      }
    >
      {children}
    </WalletContext.Provider>
  </AspContext.Provider>
)

let reloadWallet = vi.fn()

const renderProvider = () =>
  render(
    wrap(
      <LnReceiveProvider>
        <Harness />
      </LnReceiveProvider>,
    ),
  )

/**
 * A `navigator.locks` stand-in: the real API cannot be exercised in jsdom, and
 * the property under test is ordering, which a queue reproduces exactly. One
 * FIFO queue per name, the holder releasing by RETURNING — which is the whole
 * point, since an abort cannot release a lock already granted.
 */
const fakeLocks = () => {
  const tails = new Map<string, Promise<void>>()
  return {
    request: (name: string, options: { signal?: AbortSignal }, callback: () => Promise<void>) => {
      const tail = tails.get(name) ?? Promise.resolve()
      let settle = () => {}
      const held = new Promise<void>((resolve) => {
        settle = resolve
      })
      tails.set(
        name,
        tail.then(() => held),
      )
      return tail.then(async () => {
        if (options.signal?.aborted) {
          settle()
          const aborted = new Error('lock request aborted')
          aborted.name = 'AbortError'
          throw aborted
        }
        try {
          await callback()
        } finally {
          settle()
        }
      })
    },
  }
}

/**
 * `fakeLocks` with the grant held open: the request is queued, nothing has run
 * it yet. It stands in for the gap between asking for the lock and being given
 * it — the remount case, where this tab's own request waits on its previous
 * drive to stop its manager — which is NOT another tab holding it.
 */
const gatedLocks = () => {
  const locks = fakeLocks()
  let open = () => {}
  const gate = new Promise<void>((resolve) => {
    open = resolve
  })
  return {
    open: () => open(),
    request: (name: string, options: { signal?: AbortSignal }, callback: () => Promise<void>) =>
      locks.request(name, options, async () => {
        await gate
        return callback()
      }),
  }
}

const withLocks = (locks: unknown) =>
  Object.defineProperty(navigator, 'locks', { value: locks, configurable: true, writable: true })

const monitored = (state: LightningReceiveSwap['state'], rfqId = 'rfq-1'): LightningReceiveSwap =>
  ({ rfqId, kind: 'lightning_receive', state, lockup: { script: {}, address: 'tark1qlockup' } }) as LightningReceiveSwap

const noRestore: RfqRestoreResult = { restored: [], failed: [], pruned: [] }

beforeEach(() => {
  captured.events = undefined
  captured.deps = undefined
  reloadWallet = vi.fn().mockResolvedValue(undefined)
  addSwap.mockReset().mockResolvedValue(undefined)
  start.mockReset().mockResolvedValue(undefined)
  stop.mockReset().mockResolvedValue(undefined)
  restoreFromRepository.mockReset().mockResolvedValue(noRestore)
  setCallbacks.mockReset()
  claimReceive.mockReset().mockResolvedValue({ arkTxid: 'txid', amount: 10_000 })
  withLocks(fakeLocks())
})

afterEach(() => vi.clearAllMocks())

const callbacks = () => setCallbacks.mock.calls[0][0] as RfqSwapManagerCallbacks
const repo = async () => (await import('../../lib/swapRepository')).assetSwapRepository

describe('LnReceiveProvider', () => {
  it('makes the repository the canonical sink, and installs no second one', async () => {
    renderProvider()
    await waitFor(() => expect(setCallbacks).toHaveBeenCalled())

    // Wiring both would double-write every record: the manager composes and
    // writes it itself, so a `saveSwap` here is a second sink, not a demoted
    // one — and a no-op stub would be meaningless.
    expect(captured.deps?.repository).toBe(await repo())
    expect(callbacks().saveSwap).toBeUndefined()
  })

  it('installs no claim it cannot reach, and refuses the refund it has no key for', async () => {
    renderProvider()
    await waitFor(() => expect(setCallbacks).toHaveBeenCalled())

    // Optional at installation now, so its absence is the honest encoding —
    // a throwing stub would be a lie the compiler waves through. `refundArkade`
    // is NOT optional in the same way, and a receive leg genuinely has no
    // trader refund, so there the throw is the true answer.
    expect(callbacks().claimOnchain).toBeUndefined()
    await expect(callbacks().refundArkade({} as never)).rejects.toThrow(/no trader refund/)
  })

  it('hands addSwap the origin, which is what lets the first record be written', async () => {
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())

    await userEvent.click(screen.getByText('Track a'))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'))

    await userEvent.click(screen.getByText('Track a'))
    // Once per rfqId: `addSwap` REPLACES a monitored swap, so a second call for
    // one already in flight would reset it to `pending` and un-say a claim that
    // has already gone out.
    expect(addSwap).toHaveBeenCalledTimes(1)
    const [swap, origin] = addSwap.mock.calls[0]
    expect(swap.rfqId).toBe('rfq-1')
    // Our own sha256(P), not the quote's echo of it.
    expect(swap.paymentHash).toBe('04'.repeat(32))
    // Omitting it would throw `RfqSwapOriginRequired` at the door — the manager
    // refuses to monitor a funded lockup whose record it could never write.
    expect(origin.kind).toBe('lightning_receive')
    expect(origin.lockupAddress).toBe('tark1qlockup')
    const profile = origin.profile as LightningReceiveProfile
    expect(profile.payoutAddress).toBe('tark1qpayout')
    expect(profile.hashlock.paymentHash).toBe('04'.repeat(32))
  })

  it('releases the rfqId when addSwap throws, so the retry is not swallowed', async () => {
    // `addSwap` is where `LockupRegistrationFailed` and `RfqSwapOriginRequired`
    // surface. The manager never took the swap, so no callback will ever clear
    // these — and the idempotency guard is keyed on the same id, so an orphan
    // would turn the retry into a silent no-op if the rfqId were reused.
    addSwap.mockRejectedValueOnce(new Error('LockupRegistrationFailed'))
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())

    await userEvent.click(screen.getByText('Track a'))
    await waitFor(() => expect(addSwap).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('none'))

    await userEvent.click(screen.getByText('Track a'))
    await waitFor(() => expect(addSwap).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'))
  })

  it('claims from the STORED record, which is what survives the reload', async () => {
    // Nothing in this session tracked it — this is the swap a reload left
    // behind, and the record is the only place its payout address and claim
    // secrets exist at all.
    await (await repo()).saveRfqSwap(storedRecord())
    renderProvider()
    await waitFor(() => expect(setCallbacks).toHaveBeenCalled())

    await callbacks().claimLockup(monitored('claimable'), [], { partiallyClaimed: true })
    const args = claimReceive.mock.calls[0][0]
    // `payoutAddress` is persistence-only: `rebuildRfqSwap` never returns it,
    // because the covenant does not bind it.
    expect(args.payoutAddress).toBe('tark1qpayout')
    expect(args.record.paymentHash).toBe('04'.repeat(32))
    expect(args.record.signingDescriptor).toBe('tr(aa)')
    expect(args.partiallyClaimed).toBe(true)
  })

  it('refuses a claim for a swap the store holds no record for', async () => {
    renderProvider()
    await waitFor(() => expect(setCallbacks).toHaveBeenCalled())

    // Better a reported failure than a claim assembled from nothing.
    await expect(
      callbacks().claimLockup(monitored('claimable', 'rfq-gone'), [], { partiallyClaimed: false }),
    ).rejects.toThrow(/no stored record/)
    expect(claimReceive).not.toHaveBeenCalled()
  })

  it('restores at boot, reports what it could not rebuild, and starts anyway', async () => {
    restoreFromRepository.mockResolvedValue({
      restored: [monitored('claimable')],
      // A covenant that does not derive the funded address, or a lockup with no
      // contract row. True about that one record, and never a reason to strand
      // the others — or to stop driving the ones that did rebuild.
      failed: [{ rfqId: 'rfq-broken', error: new Error('LockupContractMissing') }],
      pruned: ['rfq-old'],
    } satisfies RfqRestoreResult)
    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('claimable'))
    expect(start).toHaveBeenCalled()
    expect(restoreFromRepository.mock.invocationCallOrder[0]).toBeLessThan(start.mock.invocationCallOrder[0])
  })

  it('starts even when the restore throws outright', async () => {
    restoreFromRepository.mockRejectedValue(new Error('getAllRfqSwaps failed'))
    renderProvider()
    // A store that cannot be read is a reason to lose the restored swaps, not a
    // reason to stop monitoring the ones this session negotiates.
    await waitFor(() => expect(start).toHaveBeenCalled())
  })

  it('lets only one tab drive, and tells the other one why', async () => {
    render(
      wrap(
        <>
          <LnReceiveProvider>
            <Harness tab='a' />
          </LnReceiveProvider>
          <LnReceiveProvider>
            <Harness tab='b' />
          </LnReceiveProvider>
        </>,
      ),
    )
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1))

    // Two managers over one repository would mean two `pushClaim`s over the
    // same VTXOs: one lands, the other fails as a double-spend, and both write
    // records that disagree about `claimArkTxid`.
    const b = within(screen.getByTestId('tab-b'))
    await userEvent.click(b.getByText('Track b'))
    // Named, not generic: nothing is unavailable, and "manager is not running"
    // would be false — the other tab is driving these swaps perfectly well.
    await waitFor(() => expect(b.getByTestId('rejected')).toHaveTextContent('LnReceiveHeldElsewhere'), {
      timeout: 3000,
    })
    expect(start).toHaveBeenCalledTimes(1)
    expect(addSwap).not.toHaveBeenCalled()
  })

  it('waits out its own pending request rather than blaming a tab that is not there', async () => {
    const locks = gatedLocks()
    withLocks(locks)
    renderProvider()
    await userEvent.click(screen.getByText('Track a'))

    // Pending says nothing about WHO holds it — this tab's own request is
    // pending too, right up until it is granted. Answering "another tab is
    // handling Lightning receives" here tells the only open tab to close a tab
    // that does not exist.
    expect(screen.getByTestId('rejected')).toHaveTextContent('none')
    expect(addSwap).not.toHaveBeenCalled()

    locks.open()
    await waitFor(() => expect(addSwap).toHaveBeenCalled())
    expect(screen.getByTestId('rejected')).toHaveTextContent('none')
  })

  it('releases the lock on effect teardown, so the next mount can drive', async () => {
    const first = renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1))

    // The case that actually bites: `setSvcWallet` re-runs this effect in-page,
    // and StrictMode would double-mount it. An abort-only cleanup leaves the
    // callback never returning, so the next request queues behind a lock nobody
    // will ever release and receives are dead until a full reload.
    first.unmount()
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2), { timeout: 2000 })
  })

  it('drives without Web Locks rather than refusing to run', async () => {
    // An insecure context, or a browser without the API. Single-tab is the
    // common case, and refusing would lose every receive to protect against a
    // race that may never happen.
    withLocks(undefined)
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())

    await userEvent.click(screen.getByText('Track a'))
    await waitFor(() => expect(addSwap).toHaveBeenCalled())
  })

  it('reports a refunded receive as the loss it is, and refreshes the balance', async () => {
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())
    await userEvent.click(screen.getByText('Track a'))
    await waitFor(() => expect(addSwap).toHaveBeenCalled())

    // On a receive leg every non-claim leaf is the SOLVER's, so a lockup spent
    // any other way means the incoming payment never arrived.
    captured.events?.onSwapCompleted?.(monitored('refunded'))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('refunded'))
    expect(reloadWallet).toHaveBeenCalled()
  })

  it('surfaces a settled receive and reloads: the claim lands off the worker', async () => {
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())
    await userEvent.click(screen.getByText('Track a'))
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
    await userEvent.click(screen.getByText('Track a'))

    // Fired for every throwing action, retried ones included — so it is a
    // reason to show, not an outcome to end on.
    captured.events?.onSwapFailed?.(monitored('claimable'), new Error('claim rejected'))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('claim rejected'))
    expect(screen.getByTestId('status')).toHaveTextContent('pending')

    captured.events?.onSwapCompleted?.(monitored('settled'))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('none'))
  })
})
