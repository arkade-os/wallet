/**
 * How a tab that does not hold the swap client asks the tab that does.
 *
 * The Web Lock in `providers/swaps` exists because two `@arkade-os/swap`
 * clients over one shared IndexedDB repository is a real hazard: the claim race
 * heals itself off-chain — the loser's next pass reads the winner's preimage
 * out of the spending witness and settles — but `updateRfqSwapRecord` rewrites
 * `state`, `failure`, `claimFailure` and `blockedReason` from whichever tab
 * wrote last, with no version to compare, and the service worker's contract
 * repository is shared, so a tab that finalises first can retire a contract the
 * other one is still driving.
 *
 * None of that is a reason to REFUSE the second tab. It is a reason for the
 * second tab not to drive. So the lock stays a single-driver lock and stops
 * being a single-initiator lock: a follower posts the action here, the holder
 * runs it against the one live client and posts the outcome back, and the
 * screen renders an invoice instead of an explanation.
 *
 * Same-origin by construction, which is the same trust boundary as the
 * IndexedDB this protects — a channel adds no reach that the shared repository
 * did not already have.
 */
import type { Outcome, Swap } from '@arkade-os/swap'
import { extractError } from './error'

/** One name per origin, matching the lock it shadows. */
const CHANNEL_NAME = 'swap-driver'

/**
 * How long a follower waits for any tab to admit it is driving.
 *
 * The holder acks the moment it reads the request — it does not wait for the
 * client to finish starting, let alone for the action — so this budgets for a
 * message hop and a busy main thread, nothing more. It is the window that
 * decides "nobody is driving", so it is deliberately generous: the cost of
 * waiting is a beat before an error the user was going to see anyway, and the
 * cost of being early is telling someone to close a tab that does not exist.
 */
const ACK_MS = 1_500

/**
 * How long it then waits for the answer.
 *
 * Long because these are solver round trips: `receiveLightning` and `quotePay`
 * open a Nostr rendezvous, negotiate, and come back with a minted invoice. A
 * timeout tight enough to feel responsive would fire on a slow but perfectly
 * healthy negotiation and strand a swap the holder has already begun driving —
 * the one failure this seam must not invent. The ack already answered the
 * question a short timeout is usually for.
 */
const RESULT_MS = 120_000

/** The actions the swap client owns, and so the ones only the holder can run. */
export type DriverOp = 'exchange' | 'cancelSwap' | 'quotePay' | 'acceptPay' | 'receiveLightning'

/** What the holder runs on a follower's behalf. */
export type DriverHandler = (op: DriverOp, args: unknown[]) => Promise<unknown>

/**
 * What the holder tells every other tab a swap just did.
 *
 * Narrower than the package's `SwapUpdate` on purpose: `detail` is the raw
 * corridor state and nothing on this side reads it, so it does not cross.
 */
export interface DriverUpdate {
  swap: Swap
  outcome: Outcome
  /** The driver's `restore()` replaying history, not news. Carried across tabs
   *  because the driver publishes its replay too. */
  replay?: boolean
}

/** No tab acked: nobody is driving, or the holder is gone. */
export class DriverUnavailable extends Error {
  constructor() {
    super('no tab answered as the swap driver')
    this.name = 'DriverUnavailable'
  }
}

/**
 * This tab won the lock while it was waiting to be served.
 *
 * Not a failure: the holder closed and our own queued lock request was granted,
 * so the action should be re-run here rather than asked for again.
 */
export class DriverPromoted extends Error {
  constructor() {
    super('this tab became the swap driver')
    this.name = 'DriverPromoted'
  }
}

type Wire =
  | { kind: 'request'; id: string; op: DriverOp; args: unknown[] }
  | { kind: 'ack'; id: string }
  | { kind: 'result'; id: string; ok: true; value: unknown }
  | { kind: 'result'; id: string; ok: false; error: { name: string; message: string } }
  | { kind: 'update'; update: DriverUpdate }

/**
 * An Error reduced to what survives a structured clone, and rebuilt from it.
 *
 * `name` rather than the class, because the class cannot cross: the receiving
 * tab's `LockupRegistrationFailed` is a different binding, so `instanceof`
 * would be false however faithfully the fields were copied. Every error this
 * wallet branches on sets `this.name` to its own class name, so the name is the
 * part that carries the meaning — which is why the screens test it that way.
 */
const toWire = (err: unknown): { name: string; message: string } => {
  const error = err instanceof Error ? err : new Error(extractError(err))
  return { name: error.name, message: error.message }
}

const fromWire = ({ name, message }: { name: string; message: string }): Error => {
  const error = new Error(message)
  error.name = name
  return error
}

export interface DriverChannel {
  /** Follower side: have the holder run this, or say why it could not. */
  ask<T>(op: DriverOp, args: unknown[], escape?: Promise<unknown>): Promise<T>
  /** Holder side: answer requests until the returned teardown is called. */
  serve(handler: DriverHandler): () => void
  /** Holder side: tell every other tab what a swap just did. */
  publish(update: DriverUpdate): void
  /** Any side: hear what the holder published. Never fires for our own posts. */
  subscribe(listener: (update: DriverUpdate) => void): () => void
  close(): void
}

/** A channel that answers every call honestly when the browser has none. */
const noChannel = (): DriverChannel => ({
  ask: () => Promise.reject(new DriverUnavailable()),
  serve: () => () => {},
  publish: () => {},
  subscribe: () => () => {},
  close: () => {},
})

/**
 * Open this tab's end of the channel.
 *
 * One per provider instance rather than one per module: a `BroadcastChannel`
 * never delivers to the instance that posted, so a shared instance would be
 * deaf to itself — which is right in a browser, where one tab is one provider,
 * and wrong under test, where two providers stand in for two tabs in a single
 * window. Per-instance is the shape that is correct in both.
 */
export const openDriverChannel = (): DriverChannel => {
  if (typeof BroadcastChannel === 'undefined') return noChannel()
  const channel = new BroadcastChannel(CHANNEL_NAME)

  /** Asks this tab is waiting on, by request id. */
  const pending = new Map<
    string,
    { ack: () => void; settle: (wire: Wire & { kind: 'result' }) => void; fail: (err: Error) => void }
  >()
  const updateListeners = new Set<(update: DriverUpdate) => void>()
  /** Set only while this tab holds the lock — which is what makes it the one
   * tab that acks, since the lock grants to exactly one holder. */
  let handler: DriverHandler | undefined

  const answer = async (request: Wire & { kind: 'request' }) => {
    const run = handler
    if (!run) return
    // Ack before the work, not after: it is the only thing that tells the
    // asking tab a driver exists, and the work it is acking for can take a
    // solver round trip to finish.
    channel.postMessage({ kind: 'ack', id: request.id } satisfies Wire)
    try {
      const value = await run(request.op, request.args)
      channel.postMessage({ kind: 'result', id: request.id, ok: true, value } satisfies Wire)
    } catch (err) {
      channel.postMessage({ kind: 'result', id: request.id, ok: false, error: toWire(err) } satisfies Wire)
    }
  }

  channel.onmessage = (event: MessageEvent<Wire>) => {
    const message = event.data
    if (!message || typeof message !== 'object') return
    switch (message.kind) {
      case 'request':
        void answer(message)
        return
      case 'ack':
        pending.get(message.id)?.ack()
        return
      case 'result':
        pending.get(message.id)?.settle(message)
        return
      case 'update':
        for (const listener of updateListeners) listener(message.update)
    }
  }

  return {
    ask<T>(op: DriverOp, args: unknown[], escape?: Promise<unknown>): Promise<T> {
      // `randomUUID` needs a secure context, and so does `navigator.locks` —
      // which the caller checks first, and without which no tab delegates at
      // all. Asking is unreachable where this would not exist.
      const id = crypto.randomUUID()
      return new Promise<T>((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout> | undefined
        const done = (finish: () => void) => {
          clearTimeout(timer)
          pending.delete(id)
          finish()
        }
        const giveUp = () => done(() => reject(new DriverUnavailable()))
        // Losing the ack race is the answer, not a step towards one: no tab is
        // driving, so there is nothing to wait for.
        timer = setTimeout(giveUp, ACK_MS)
        pending.set(id, {
          ack: () => {
            clearTimeout(timer)
            timer = setTimeout(giveUp, RESULT_MS)
          },
          settle: (result) => done(() => (result.ok ? resolve(result.value as T) : reject(fromWire(result.error)))),
          fail: (err) => done(() => reject(err)),
        })
        // The holder can close mid-request. When it does, this tab's own queued
        // lock request is granted and it becomes the driver, so the ask stops
        // being the way to get this done.
        void escape?.then(
          () => {
            if (pending.has(id)) done(() => reject(new DriverPromoted()))
          },
          () => {},
        )
        channel.postMessage({ kind: 'request', id, op, args } satisfies Wire)
      })
    },
    serve(next: DriverHandler) {
      handler = next
      return () => {
        if (handler === next) handler = undefined
      }
    },
    publish(update: DriverUpdate) {
      channel.postMessage({ kind: 'update', update } satisfies Wire)
    },
    subscribe(listener: (update: DriverUpdate) => void) {
      updateListeners.add(listener)
      return () => updateListeners.delete(listener)
    },
    close() {
      handler = undefined
      updateListeners.clear()
      for (const waiter of [...pending.values()]) waiter.fail(new DriverUnavailable())
      channel.close()
    },
  }
}
