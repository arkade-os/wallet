import { useContext, useEffect, useState } from 'react'
import { RestIndexerProvider } from '@arkade-os/sdk'
import { AspContext } from '../providers/asp'
import { WalletContext } from '../providers/wallet'
import { lnSendSpender } from '../lib/lnSwap'
import { consoleError } from '../lib/logs'
import { readTransactionActivityMetadata, saveTransactionActivityMetadata } from '../lib/storage'
import { LnSendSpend, Tx } from '../lib/types'

/**
 * The two txids a Lightning-send receipt shows, and what to call the second.
 *
 * Field names are `Details`' own, so a caller spreads this into `DetailsProps`
 * rather than copying it across field by field — the rename in transit that
 * `spentTxid` would force is a one-character trap between the only producer of
 * this shape and its only consumer.
 */
export interface LnSendReceipt {
  /** The tx the wallet signed: it funded the lockup covenant. */
  fundedTxid: string
  /** The tx that spent that covenant — absent while the swap is in flight. */
  spendTxid?: string
  /** Row label for `spendTxid`, naming which spend it was. */
  spendLabel: string
}

/**
 * The receipt for a Lightning send: its funding tx and the tx that ended it.
 *
 * A Lightning send does not settle when the funding tx does. Funding the
 * lockup covenant is only acceptance; the payment is finished by a second
 * transaction the wallet never signs — the solver's claim once it has paid the
 * invoice, or the refund back to us when it could not. Showing one anonymous
 * "Transaction ID" for the first leg says nothing about which of those
 * happened, so this resolves the second leg and the receipt shows both, the
 * way an asset swap already does.
 *
 * Resolution runs here, on the screen that displays it, rather than in a
 * background monitor: the answer is only ever read on this receipt, it is
 * permanent once known, and the covenant is a public script — asking about it
 * costs one indexer call and nothing else waits on it. A failed lookup is
 * silent for the same reason: the funding leg is true regardless, and the
 * pending receipt is what an unfinished swap should look like anyway.
 *
 * Returns undefined for anything that is not a Lightning send, so callers can
 * branch on its presence.
 */
export function useLnSendReceipt(tx: Tx | undefined): LnSendReceipt | undefined {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  // Seeded from storage because `tx` only carries the answer once a wallet
  // reload has rebuilt history from it; without this, revisiting a resolved
  // receipt in the same session would pay for the whole lookup again — and
  // once the covenant is swept the indexer can no longer answer it at all.
  //
  // Gated on there being an unresolved send to seed: this hook runs for every
  // transaction receipt in the app, and the read parses the whole activity
  // blob. Mount-scoped, which is safe only because navigation unmounts the
  // screen — a router that kept it mounted would show the previous receipt's
  // spend.
  const [resolved, setResolved] = useState<LnSendSpend | undefined>(() =>
    tx?.lnSend && !tx.lnSend.spend ? readTransactionActivityMetadata([tx.redeemTxid])?.lnSend?.spend : undefined,
  )

  const lnSend = tx?.lnSend
  const fundedTxid = tx?.redeemTxid
  const spend = lnSend?.spend ?? resolved
  // The only thing left to look up: a covenant with no spend on record.
  const unresolvedPkScript = spend ? undefined : lnSend?.swapPkScript

  useEffect(() => {
    if (!fundedTxid || !unresolvedPkScript || !svcWallet || !aspInfo.url) return
    // Deliberately the raw SDK read, not getTxHistory: that one reports a
    // failure as an empty history, which here would read as "no refund of
    // ours" and persist a refunded swap as a completed payment.
    const paidUs = async (txid: string) => {
      const history = await svcWallet.getTransactionHistory()
      return Boolean(history?.some(({ key }) => [key.arkTxid, key.boardingTxid, key.commitmentTxid].includes(txid)))
    }
    // No unmount guard: the answer is permanent and was already paid for, so
    // it is written even if the user has navigated away — discarding it would
    // make the next visit buy the same lookup again, which is the cost the
    // seeding above exists to avoid. A setState after unmount is a no-op.
    lnSendSpender(new RestIndexerProvider(aspInfo.url), paidUs, {
      fundingTxid: fundedTxid,
      swapPkScript: unresolvedPkScript,
    })
      .then((spender) => {
        if (!spender) return
        saveTransactionActivityMetadata(fundedTxid, { lnSend: { swapPkScript: unresolvedPkScript, spend: spender } })
        setResolved(spender)
      })
      .catch(consoleError)
  }, [fundedTxid, unresolvedPkScript, svcWallet, aspInfo.url])

  if (!lnSend || !fundedTxid) return undefined
  return {
    fundedTxid,
    spendTxid: spend?.spentTxid,
    // "Refunded", not "Cancelled": nobody cancelled anything — the solver
    // could not pay the invoice and the covenant returned the funds.
    spendLabel: spend?.outcome === 'refunded' ? 'Refunded' : 'Completed',
  }
}
