import { useContext, useEffect, useState } from 'react'
import { AspContext } from '../../providers/asp'
import { FlowContext } from '../../providers/flow'
import { SwapsContext } from '../../providers/swaps'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../logs'
import { extractError } from '../error'
import { SwapsHeldElsewhere } from '../swapClient'

/** The solver-RFQ Lightning receive: what the Receive screen renders of it. */
export interface SwapRail {
  generatingInvoice: boolean
  error: string
  retryable: boolean
  noDriver: boolean
  retry: () => void
  lost: boolean
  claimError: string | undefined
}

export function useSwapRail(enabled = true): SwapRail {
  const { aspInfo } = useContext(AspContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { receiveLightning, cancelSwap, outcomeOf, errorOf } = useContext(SwapsContext)
  const { svcWallet } = useContext(WalletContext)

  const { satoshis, assetId } = recvInfo
  const isAssetReceive = assetId && assetId !== ''

  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [lnReceiveError, setLnReceiveError] = useState('')
  // A negotiation that failed at the local registration step left nothing
  // payable behind, so the offer of a retry is honest — see the catch below.
  const [lnRetryable, setLnRetryable] = useState(false)
  // No tab answered as the swap driver. Not the same as "Lightning is
  // unavailable" — the solver and the corridor are fine — and unlike the other
  // failures here it is worth retrying on the spot, because the tab that takes
  // the lock next will serve it.
  const [lnNoDriver, setLnNoDriver] = useState(false)
  const [negotiateAttempt, setNegotiateAttempt] = useState(0)

  /**
   * Negotiate a Lightning receive once an amount is set.
   *
   * Gated on an amount because the corridor requires one: the solver mints the
   * invoice, so nothing else implies what it is for. An amount outside the
   * card's bounds or an unserved corridor leaves the other payment methods
   * working — this is an EXTRA way to be paid, so a failure here must not take
   * the ark and on-chain addresses down with it.
   *
   * A solver serving the corridor is the only requirement: the swap client
   * claims the lockup, so no covclaimd needs to be deployed or reachable for the
   * corridor to be offered.
   */
  useEffect(() => {
    // Cleared BEFORE the guards, not beside `negotiate` below. Clearing the
    // amount reruns this effect straight into the early return, and flags left
    // set there strand the message on a screen that is no longer negotiating —
    // with a "Try again" that reruns the effect back into the same guard and
    // does nothing at all.
    setLnReceiveError('')
    setLnRetryable(false)
    setLnNoDriver(false)
    setGeneratingInvoice(false)
    if (!enabled || !svcWallet || isAssetReceive || satoshis <= 0 || recvInfo.received) return
    if (recvInfo.pendingLnReceive?.payAmount && recvInfo.invoice) return

    let abandoned = false
    const negotiate = async () => {
      setGeneratingInvoice(true)
      // One call: the client picks the corridor off the discovered cards,
      // negotiates the hold invoice, and begins driving the swap BEFORE the
      // invoice comes back — the payer cannot pay one they have not seen, so
      // the monitored set stays a superset of what is payable.
      const pending = await receiveLightning(satoshis)
      // The amount was already settled through another rail (e.g. an offchain
      // VTXO) while the solver was negotiating this one — the hold invoice
      // above is now unwanted and must be torn down, not just ignored.
      if (abandoned) {
        cancelSwap(pending.id).catch(consoleError)
        return
      }
      setLnReceiveError('')
      setRecvInfo((prev) => ({
        ...prev,
        invoice: pending.invoice,
        pendingLnReceive: pending,
      }))
    }

    negotiate()
      .catch((err) => {
        if (abandoned) return
        const error = extractError(err)
        consoleError(error, 'error negotiating lightning receive')
        const noDriver = err instanceof SwapsHeldElsewhere
        setLnNoDriver(noDriver)
        setLnReceiveError(error)
        // The failures here that are not "Lightning is unavailable". The first:
        // the quote was fine and our own contract store refused the write. No
        // invoice came back, so the abandoned quote is inert and cannot be
        // resumed — calling again is the fix, and it derives a fresh preimage and
        // rfq id. The second: no tab was driving, and the next one to take the
        // lock will serve the same call.
        //
        // By name rather than by `instanceof`, because a negotiation run on
        // another tab reaches us over `swapDriverChannel`, where the class cannot
        // cross: the rebuilt error carries the name the SDK's own constructor
        // sets, and this is the check that reads it in both cases.
        setLnRetryable(noDriver || (err as Error)?.name === 'LockupRegistrationFailed')
      })
      .finally(() => {
        if (!abandoned) setGeneratingInvoice(false)
      })
    // The amount changed under an in-flight negotiation, so its invoice would
    // be for the wrong number. Nothing to cancel on the solver — an unpaid hold
    // invoice simply expires.
    return () => {
      abandoned = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, svcWallet, satoshis, isAssetReceive, aspInfo.network, negotiateAttempt, recvInfo.received])

  // What the monitored receive is doing, if there is one. The screen's VTXO
  // listener still reports the credit; this is what can say the payment was LOST —
  // `refunded` on a receive leg means the solver reclaimed a lockup we never
  // claimed, which nothing else on this screen could distinguish from waiting.
  const swapId = recvInfo.pendingLnReceive?.id
  const receiveOutcome = swapId ? outcomeOf(swapId) : undefined
  const claimError = swapId ? errorOf(swapId) : undefined
  // `lapsed`, not `refunded`. On a receive leg every non-claim leaf of the
  // covenant is the SOLVER's, so a lockup spent any other way is the incoming
  // payment never arriving — a loss. v1 spelled that `refunded`, the same word
  // it used for the trader's own money coming back; the v2 outcome vocabulary
  // refuses to inherit the trap, and this screen is why it matters.
  const receiveLost = receiveOutcome === 'lapsed'

  return {
    generatingInvoice,
    error: lnReceiveError,
    retryable: lnRetryable,
    noDriver: lnNoDriver,
    retry: () => setNegotiateAttempt((n) => n + 1),
    lost: receiveLost,
    claimError,
  }
}
