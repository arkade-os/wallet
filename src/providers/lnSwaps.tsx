/**
 * `RfqSwapManager`, for the Lightning-send leg.
 *
 * What it replaces: the wallet used to decide a send's outcome itself, by
 * asking the indexer who got paid, on whatever screen happened to care. The
 * manager does that properly — a spend whose witness HASHES to the payment hash
 * is a settlement, anything else that empties the lockup is a return — and it
 * does the half the wallet never did at all: **pushing the refund**. Every
 * non-claim leaf of a send's covenant is ours, so a solver that goes dark
 * leaves money at a covenant that only this wallet can take back, and only
 * after `refund_locktime`. Nothing was taking it.
 *
 * The manager owns state; this provider owns nothing but the wiring. It hands
 * over the seams the package asks for (indexer, contract manager, a signer, a
 * store) and gets back a driven swap. The one fact it records on top is the
 * spender's txid, and only for a swap the manager did not stamp itself; see
 * `lnSendRecords.ts`.
 *
 * Scoped to the two SEND legs — `lightning_send` and `onchain_send`. The
 * receive leg has a manager of its own in `providers/lnReceive`, which holds a
 * Web Lock the whole time it drives one, so wiring `claimLockup` here would put
 * a second, unsynchronised claimer on the same Arkade lockup. `claimOnchain`
 * carries no such risk: it spends a BITCOIN output that only an onchain-send
 * swap has, and nothing else in this wallet watches one.
 *
 * The onchain leg is the one corridor whose claim the wallet MUST make itself.
 * A Lightning send resolves either way with the user offline — the solver
 * claims with the preimage or the covenant refunds — but an onchain send hands
 * the user an L1 HTLC that only they can open, before a consensus deadline. So
 * `chain` is not optional decoration here: without it `RfqSwapManager` fails
 * such a swap on its first pass rather than watching it blind, and the send
 * flow refuses to take the solver route at all (see `planOnchainSend`'s
 * `claimEndpoint` gate).
 */
import { ReactNode, createContext, useContext, useEffect, useRef } from 'react'
import { NetworkName, RestArkProvider, RestIndexerProvider } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import {
  RfqSwapManager,
  claimOnchainFill,
  findLockupVtxos,
  preimageForSwapRecord,
  pushRefundWithoutReceiver,
  rfqClaimSecretOf,
  type ChainUtxo,
  type OnchainSendSwap,
  type RfqSwap,
} from '@arkade-os/swap'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import {
  canRefundLnSend,
  fundingTxidOf,
  lnSendRefundSigner,
  lnSendSwap,
  lnSendSwapRecord,
  readRecord,
  recordSpendTxid,
  spendTxidOf,
  restoreLnSendSwaps,
  saveRecord,
  saveSwapUpdate,
  type LnSendRecordInput,
} from '../lib/lnSendRecords'
import {
  onchainSendSwap,
  onchainSendSwapRecord,
  restoreOnchainSendSwaps,
  type OnchainSendRecordInput,
} from '../lib/onchainSendRecords'
import { claimFeeRate, esploraChainSource } from '../lib/chainSource'
import { claimPayoutScript, l1NetworkOf } from '../lib/onchainPayout'
import { getRestApiExplorerURL } from '../lib/explorers'
import { lockupSpenderTxid } from '../lib/lnSwap'
import { consoleError } from '../lib/logs'

interface LnSwapsContextProps {
  /** Record a just-funded send and hand it to the manager. Resolves once the
   * record is durable — the caller's refresh must not run ahead of the store. */
  trackLnSend: (input: LnSendRecordInput) => Promise<void>
  /**
   * Persist an onchain send BEFORE its lockup is funded.
   *
   * The order is the whole point, and it is the opposite of the Lightning
   * leg's. A Lightning send that is funded but unrecorded still resolves
   * without the wallet: the solver claims, or the covenant refunds. An onchain
   * send that is funded but unrecorded is an L1 HTLC whose claim parameters
   * exist nowhere — not in the contract store, which holds only the Arkade
   * lockup — so the fill is forfeit. Rejecting here means nothing was funded,
   * which is why the caller can still fall back to a collaborative exit.
   */
  reserveOnchainSend: (input: OnchainSendRecordInput) => Promise<void>
  /** Note the funding transaction and start monitoring. */
  trackOnchainSend: (input: OnchainSendRecordInput) => Promise<void>
}

export const LnSwapsContext = createContext<LnSwapsContextProps>({
  trackLnSend: async () => {
    throw new Error('lightning swaps not initialized')
  },
  reserveOnchainSend: async () => {
    throw new Error('swap manager not initialized')
  },
  trackOnchainSend: async () => {
    throw new Error('swap manager not initialized')
  },
})

const notWired = (action: string) => async (): Promise<never> => {
  // Required by the callbacks type, unreachable for these corridors: the
  // manager calls this on a receive leg only, and this provider monitors none.
  // A throw rather than a silent no-op, so a corridor added here without its
  // action surfaces at once instead of expiring quietly.
  throw new Error(`${action} is not wired: this wallet drives send legs only`)
}

export const LnSwapsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { dataReady, svcWallet, reloadWallet } = useContext(WalletContext)

  const managerRef = useRef<RfqSwapManager>()
  // The listeners outlive the render that made them, so they reach the current
  // reload through a ref rather than the value captured at start.
  const reloadRef = useRef(reloadWallet)
  reloadRef.current = reloadWallet

  useEffect(() => {
    if (!dataReady || !svcWallet || !aspInfo.url) return
    let stopped = false
    let manager: RfqSwapManager | undefined

    const start = async () => {
      const indexer = new RestIndexerProvider(aspInfo.url)
      const ark = new RestArkProvider(aspInfo.url)
      const contracts = await svcWallet.getContractManager()
      const network = aspInfo.network as NetworkName
      const esploraUrl = getRestApiExplorerURL(network)
      const l1Network = l1NetworkOf(aspInfo.network)
      const chain = esploraUrl ? esploraChainSource(esploraUrl, l1Network) : undefined

      manager = new RfqSwapManager({ indexer, contracts, ...(chain ? { chain } : {}) })
      manager.setCallbacks({
        /**
         * Take the L1 fill. `claimOnchainFill` refuses inside the claim margin
         * of the refund leaf — publishing P into the solver's live refund
         * window risks losing the race AND giving the preimage away — so a
         * throw here is not always a failure to retry; the manager's next pass
         * re-decides against the same deadline.
         *
         * The preimage re-derives from the record's own descriptor, which is
         * why `mustPersistPreimage` had to be honoured at quote time: on an HD
         * wallet nothing secret was stored, and this call is where that shows.
         */
        claimOnchain: async (swap: OnchainSendSwap, utxo: ChainUtxo) => {
          if (!chain || !esploraUrl) throw new Error('no L1 endpoint is configured for this network')
          const record = await readRecord(swap.rfqId)
          if (!record) throw new Error(`no stored record for rfq ${swap.rfqId}`)
          // No hashlock on the record means no preimage can be recovered, and
          // this leg's claim is nothing but the preimage. Named rather than
          // left to `preimageForSwapRecord`, whose message is about a
          // projection the caller never wrote.
          const secrets = rfqClaimSecretOf(record)
          if (!secrets) throw new Error(`swap ${swap.rfqId} was stored without its hashlock`)
          // The RECIPIENT's script, off the record. Never derived here: the
          // only thing derivable at claim time is this wallet's own address,
          // and paying there would turn the send into a transfer to self while
          // the receipt says otherwise. `claimPayoutScript` throws rather than
          // substitute one, which loses the fill to the solver's L1 refund and
          // returns the lockup — recoverable, unlike paying the wrong place.
          const payoutPkScript = claimPayoutScript(record.profile)
          const [preimage, feeRateSatVb] = await Promise.all([
            preimageForSwapRecord(svcWallet, secrets),
            claimFeeRate(esploraUrl),
          ])
          return claimOnchainFill(chain, {
            htlc: swap.htlc,
            utxo,
            preimage,
            payoutPkScript,
            feeRateSatVb,
            // The ONLY thing this identity signs on the L1 side, and it is a
            // BIP-341 sighash built by the package from the covenant and the
            // outputs above — never caller-supplied bytes. If `signMessage`
            // ever reaches a broader set of callers, this coupling is what has
            // to be re-examined first.
            sign: (sighash: Uint8Array) => svcWallet.identity.signMessage(sighash, 'schnorr'),
          })
        },
        claimLockup: notWired('claimLockup'),
        saveSwap: (swap) => saveSwapUpdate(swap),
        // Wired to the atomic push, NOT to `refundIfUnresolved`: that helper is
        // the single-swap version of this whole manager and brings its own
        // status polling and MTP retry loop, which would nest inside the
        // manager's own.
        refundArkade: async (swap: RfqSwap) => {
          const script = swap.lockup?.script
          if (!script) throw new Error(`swap ${swap.rfqId} was restored without its covenant`)
          const vtxos = await findLockupVtxos(indexer, swap.lockupPkScript)
          if (vtxos.length === 0) return null
          const sender = await lnSendRefundSigner(svcWallet, swap.rfqId)
          return pushRefundWithoutReceiver(ark, { script, sender, vtxos })
        },
        canRefundArkade: (swap) => canRefundLnSend(svcWallet, swap.rfqId),
      })

      // A state change is a row that now reads differently — the record is
      // already persisted by `saveSwap` before this fires, so the refresh only
      // has to pick it up.
      manager.onSwapUpdate(() => void reloadRef.current().catch((err) => consoleError(err, 'error refreshing')))

      // The spend's txid, once. The manager's own answer carries none, and this
      // is the window in which the lockup's outputs still name their spender —
      // a swept covenant no longer can.
      manager.onSwapCompleted((swap) => {
        void recordEnding(indexer, swap)
          .then((spendTxid) => (spendTxid ? reloadRef.current() : undefined))
          .catch((err) => consoleError(err, `error resolving the spend of swap ${swap.rfqId}`))
      })

      // Both send legs, in one manager: they share every seam it needs, and a
      // second manager over the same indexer and contract store would only add
      // a second subscriber to the same lockups.
      const [lnSwaps, onchainSwaps] = await Promise.all([
        restoreLnSendSwaps(contracts),
        // The indexer is what tells a swap that was funded from one that never
        // was — see `restoreOnchainSendSwaps`.
        restoreOnchainSendSwaps(contracts, (pkScript) => findLockupVtxos(indexer, pkScript)),
      ])
      if (stopped) return
      await manager.start([...lnSwaps, ...onchainSwaps])
      managerRef.current = manager
    }

    start().catch((err) => consoleError(err, 'error starting the lightning swap manager'))

    return () => {
      stopped = true
      managerRef.current = undefined
      manager?.stop().catch((err) => consoleError(err, 'error stopping the lightning swap manager'))
    }
  }, [dataReady, svcWallet, aspInfo.url])

  const trackLnSend = async (input: LnSendRecordInput) => {
    // Durable first, monitored second: a record the manager updates before it
    // exists cannot be written back (`saveSwapUpdate` has no origin to carry),
    // and a send that is stored but unmonitored still renders and still
    // resolves on the next start.
    await saveRecord(lnSendSwapRecord(input))
    await managerRef.current?.addSwap(lnSendSwap(input))
  }

  const reserveOnchainSend = async (input: OnchainSendRecordInput) => {
    await saveRecord(onchainSendSwapRecord(input))
  }

  const trackOnchainSend = async (input: OnchainSendRecordInput) => {
    // Two independent jobs, deliberately not sequenced. The write names the
    // funding transaction the history row needs; the hand-off is what gets the
    // L1 claim driven in THIS session rather than at the next start. Chaining
    // them meant a store that refused the txid also cost the claim its
    // session — and this corridor's claim is the one on a deadline.
    //
    // Rewriting the whole record rather than patching keeps one builder for the
    // shape, and `reserveOnchainSend` has already made the claim recoverable,
    // so neither failure here costs money.
    const monitored = managerRef.current?.addSwap(onchainSendSwap(input))
    const stored = saveRecord(onchainSendSwapRecord(input))
    await Promise.all([monitored, stored])
  }

  return (
    <LnSwapsContext.Provider value={{ trackLnSend, reserveOnchainSend, trackOnchainSend }}>
      {children}
    </LnSwapsContext.Provider>
  )
}

/** Name the tx that ended a swap, when it is one of ours. Returns it, so the
 * caller refreshes only on something the history can actually show. */
const recordEnding = async (
  indexer: Pick<RestIndexerProvider, 'getVtxos'>,
  swap: RfqSwap,
): Promise<string | undefined> => {
  const record = await readRecord(swap.rfqId)
  if (!record) return undefined
  // The manager stamps `lockupSpendArkTxids` at finalization, from the chain
  // read that ended the swap, so a terminal record usually answers for itself —
  // and this whole lookup is a network round trip for a permanent fact someone
  // already fetched. The indexer path stays for the record that has no stamp:
  // one written before #773, or a swap whose end we saw some other way.
  const stamped = spendTxidOf(record)
  if (stamped) return stamped
  const fundingTxid = fundingTxidOf(record)
  if (!fundingTxid) return undefined
  const spendTxid = await lockupSpenderTxid(indexer, {
    fundingTxid,
    swapPkScript: hex.encode(swap.lockupPkScript),
  })
  if (!spendTxid) return undefined
  await recordSpendTxid(swap.rfqId, spendTxid)
  return spendTxid
}
