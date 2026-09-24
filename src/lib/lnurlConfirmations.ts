/**
 * Receiver confirmations for LNURL sends: one LUD-XX batchVerify per endpoint
 * per tick rather than a LUD-21 poll per payment; LUD-21 only where no batch
 * endpoint is advertised. A transport failure is retried on the next tick.
 */
import { createLnurlClient, type LnurlClient, type VerifyStatus } from '@arkade-os/lnurl-client'

export interface ReceiverConfirmation {
  /** The LUD-21 verify URL the invoice or destination quote carried. */
  verifyUrl: string
  /** The LUD-XX verifyBatch endpoint advertised next to it, when one exists. */
  verifyBatch?: string
  /** Fail the entry when no settled answer has arrived within this window. */
  timeoutMs?: number
  onSettled: (status: VerifyStatus) => void
  onError: (err: Error) => void
}

interface Entry extends ReceiverConfirmation {
  deadline: number
  /** Solo entries start their own LUD-21 poll exactly once. */
  soloPolling?: boolean
}

const POLL_MS = 2_000
const DEFAULT_TIMEOUT_MS = 180_000

export interface PendingConfirmations {
  /** Registers one pending confirmation and starts the shared loop. */
  add(confirmation: ReceiverConfirmation): void
  /** Drops every pending entry; called on wallet reset. */
  forget(): void
}

export function createPendingConfirmations(client: LnurlClient = createLnurlClient()): PendingConfirmations {
  let entries = new Set<Entry>()
  let timer: ReturnType<typeof setInterval> | undefined
  let ticking = false

  function settle(entry: Entry, status: VerifyStatus): void {
    if (!entries.has(entry)) return
    entries.delete(entry)
    maybeStop()
    entry.onSettled(status)
  }

  function fail(entry: Entry, err: Error): void {
    if (!entries.has(entry)) return
    entries.delete(entry)
    maybeStop()
    entry.onError(err)
  }

  function maybeStop(): void {
    if (timer && entries.size === 0) {
      clearInterval(timer)
      timer = undefined
    }
  }

  async function tick(): Promise<void> {
    const now = Date.now()
    for (const entry of [...entries]) {
      if (now >= entry.deadline) fail(entry, new Error('receiver did not confirm settlement in time'))
    }

    const groups = new Map<string, Entry[]>()
    for (const entry of entries) {
      if (entry.soloPolling) continue
      if (entry.verifyBatch === undefined) {
        entry.soloPolling = true
        client
          .pollVerify(entry.verifyUrl, { intervalMs: POLL_MS, timeoutMs: entry.deadline - now })
          .then((status) => settle(entry, status))
          .catch((err: unknown) => fail(entry, err as Error))
        continue
      }
      const key = entry.verifyBatch
      groups.set(key, [...(groups.get(key) ?? []), entry])
    }

    for (const [endpoint, group] of groups) {
      try {
        const body = await client.batchVerify(
          endpoint,
          group.map((e) => e.verifyUrl),
        )
        for (const entry of group) {
          const answer = body.results[entry.verifyUrl]
          if (!answer || answer.kind !== 'verify') {
            fail(entry, new Error(answer?.reason ?? 'no answer for this verify URL'))
            continue
          }
          if (answer.status.settled) settle(entry, answer.status)
        }
      } catch {
        // Unsettled entries simply await the next tick.
      }
    }
  }

  function ensure(): void {
    if (timer) return
    // A tick slower than the interval would otherwise overlap the next one.
    timer = setInterval(() => {
      if (ticking) return
      ticking = true
      void tick().finally(() => {
        ticking = false
      })
    }, POLL_MS)
  }

  return {
    add(confirmation) {
      const entry: Entry = { ...confirmation, deadline: Date.now() + (confirmation.timeoutMs ?? DEFAULT_TIMEOUT_MS) }
      entries.add(entry)
      ensure()
    },
    forget() {
      entries = new Set()
      if (timer) {
        clearInterval(timer)
        timer = undefined
      }
    },
  }
}

/** The wallet's one shared loop, used by the send flow and reset by `forget()`. */
export const pendingConfirmations = createPendingConfirmations()
