/**
 * `RfqSwapManager`, for the two send legs.
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
 * Scoped to the two SEND legs. `claimLockup` stays unwired because the receive
 * leg's own manager holds a Web Lock over the same Arkade lockup; the onchain
 * leg's claim the wallet MUST make itself, before a consensus deadline.
 */
import { ReactNode, createContext, useContext, useEffect, useRef } from 'react'
import { EsploraProvider, NetworkName, RestArkProvider, RestIndexerProvider } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import {
  RfqSwapManager,
  chainSourceFrom,
  claimOnchainFill,
  findLockupVtxos,
  preimageForSwapRecord,
  pushRefundWithoutReceiver,
  rfqClaimSecretOf,
  type ChainUtxo,
  type OnchainSendSwap,
  type RfqSwap,
  type SolverOnchainSend,
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
import { onchainSendSwap, onchainSendSwapRecord, restoreOnchainSendSwaps } from '../lib/onchainSendRecords'
import { claimPayoutScript, l1NetworkOf, onchainClaimEndpoint } from '../lib/onchainPayout'
import { claimFeeRate } from '../lib/claimFee'
import { lockupSpenderTxid } from '../lib/lnSwap'
import { consoleError } from '../lib/logs'

interface LnSwapsContextProps {
  /** Record a just-funded send and hand it to the manager. Resolves once the
   * record is durable — the caller's refresh must not run ahead of the store. */
  trackLnSend: (input: LnSendRecordInput) => Promise<void>
  /** The rail's `persist`, BEFORE funding — the opposite order to the Lightning
   *  leg's, because a funded-but-unrecorded onchain send is an L1 HTLC whose
   *  claim parameters exist nowhere. A rejection means nothing was funded. */
  reserveOnchainSend: (swap: SolverOnchainSend) => Promise<void>
}

export const LnSwapsContext = createContext<LnSwapsContextProps>({
  trackLnSend: async () => {
    throw new Error('lightning swaps not initialized')
  },
  reserveOnchainSend: async () => {
    throw new Error('swap manager not initialized')
  },
})

const notWired = (action: string) => async (): Promise<never> => {
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
      const esploraUrl = onchainClaimEndpoint(network)
      const chain = chainSourceFrom(new EsploraProvider(esploraUrl), l1NetworkOf(network))

      manager = new RfqSwapManager({ indexer, contracts, chain })
      manager.setCallbacks({
        /** Refuses inside the refund leaf's margin: a throw is not a failure. */
        claimOnchain: async (swap: OnchainSendSwap, utxo: ChainUtxo) => {
          const record = await readRecord(swap.rfqId)
          if (!record) throw new Error(`no stored record for rfq ${swap.rfqId}`)
          const secrets = rfqClaimSecretOf(record)
          if (!secrets) throw new Error(`swap ${swap.rfqId} was stored without its hashlock`)
          // Never derived: the only derivable script is this wallet's own.
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
            // A BIP-341 sighash the package builds, never caller-supplied.
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

      const [lnSwaps, onchainSwaps] = await Promise.all([
        restoreLnSendSwaps(contracts),
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

  /** Optional chain deliberate, as on `trackLnSend`: restore picks it up. */
  const reserveOnchainSend = async (swap: SolverOnchainSend) => {
    await saveRecord(onchainSendSwapRecord(swap))
    await managerRef.current?.addSwap(onchainSendSwap(swap))
  }

  return <LnSwapsContext.Provider value={{ trackLnSend, reserveOnchainSend }}>{children}</LnSwapsContext.Provider>
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
