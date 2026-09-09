/**
 * The wallet's one `@arkade-os/swap` client.
 *
 * The v2 client IS the package root as of ts-sdk M8: `createSwapClient` is this
 * one and no longer #793's v1 facade, the `/client` subpath that disambiguated
 * them on the release branch is gone, and everything below the client — requests,
 * covenants, records, the RFQ transports — answers to `@arkade-os/swap/protocol`
 * (see `meta/tracks/swap-sdk-v2/08-deprecations.md`).
 *
 * What the client now owns that this wallet used to: market discovery and
 * selection, which corridor a destination implies, decoding the invoice, the
 * transport to the solver's rendezvous, funding, persistence, the drive, the
 * claim and the refund. What is left here is configuration the client cannot
 * infer:
 *
 * - **discovery.** Which registry to ask and which cards ship with the build.
 * - **the BOLT11 decoder.** A corridor override, so the wallet's own gates
 *   (`InvoiceRejected`) run on the payer's invoice on a send and on the SOLVER's
 *   hold invoice on a receive — one set of rules for both directions.
 * - **the sealing key.** See below.
 * - **the co-signer key.** A fact about the solver's deployment that no client
 *   can look up; the package's per-network pin is the fallback.
 *
 * No server URL and no providers built from one: `ServiceWorkerWallet` answers
 * `getArkadeInfo`, `getArkadeReader` and `getArkadeBroadcaster`, so chain reads
 * and broadcast go through the worker's own connection rather than a second one
 * opened beside it. No transport either — the client opens the card's own Nostr
 * rendezvous, which is the only shipped transport that can attest who answered.
 */
import { EsploraProvider, type NetworkName } from '@arkade-os/sdk'
import { createSwapClient, type SwapClient, type SwapClientConfig } from '@arkade-os/swap'
// `./advanced` is not a compatibility promise — see the note in `swapRecords.ts`.
import { corridorRecordStore, type OnchainClaim } from '@arkade-os/swap/advanced'
import { chainSourceFrom, claimOnchainFill, preimageForSwapRecord, rfqClaimSecretOf } from '@arkade-os/swap/protocol'
import { claimFeeRate } from './claimFee'
import { getCovclaimdPubkeyForNetwork, getEmulatorPubkeyOverrideForNetwork } from './constants'
import { toInvoiceFacts } from './lnSwap'
import { l1NetworkOf, onchainClaimEndpoint } from './onchainPayout'
import { discoveryOptions } from './swapMarkets'
import { assetSwapRepository } from './swapRepository'

/**
 * A swap action that reached no driver at all.
 *
 * It used to mean "another tab holds the lock", which was true and useless:
 * the action can simply be run BY that tab, which is what `swapDriverChannel`
 * does now. What is left is the case where nobody answered — the holder closed
 * between the ask and the ack, or no tab has taken the lock yet — and the
 * distinction the screens still need is that this is not the corridor being
 * unavailable. The solver is fine, and the next tab to take the lock serves the
 * same call, so unlike a missing solver or an out-of-bounds amount this one is
 * worth retrying where it stands.
 */
export class SwapsHeldElsewhere extends Error {
  constructor() {
    super('no tab is driving swaps right now')
    this.name = 'SwapsHeldElsewhere'
  }
}

/**
 * The trader's own L1 claim of an `arkade -> onchain` fill. Leaving it unwired
 * is not neutral: the drive reports the L1 half blocked and the send funds an
 * HTLC this wallet never claims. `payoutPkScript` is read off the swap, never
 * derived — the only script derivable here is our own, and paying there lands
 * the sats back while the screen says the recipient was paid.
 */
const onchainClaim = (wallet: SwapClientConfig['wallet'], network: NetworkName): OnchainClaim => {
  const esploraUrl = onchainClaimEndpoint(network)
  const chain = chainSourceFrom(new EsploraProvider(esploraUrl), l1NetworkOf(network))
  // The package's own reader, NOT `repository.getRfqSwap`: that is the v1 store
  // the v2 client never writes, so the claim would fail after the HTLC is funded.
  const records = corridorRecordStore(assetSwapRepository)
  return async (swap, utxo) => {
    const record = await records.getRfqSwap(swap.rfqId)
    if (!record) throw new Error(`no stored record for rfq ${swap.rfqId}`)
    const secrets = rfqClaimSecretOf(record)
    if (!secrets) throw new Error(`swap ${swap.rfqId} was stored without its hashlock`)
    const { payoutPkScript } = swap
    if (!payoutPkScript) {
      throw new Error(`swap ${swap.rfqId} carries no payout script — refusing to claim to anywhere else`)
    }
    const [preimage, feeRateSatVb] = await Promise.all([
      preimageForSwapRecord(wallet, secrets),
      claimFeeRate(esploraUrl),
    ])
    return claimOnchainFill(chain, {
      htlc: swap.htlc,
      utxo,
      preimage,
      payoutPkScript,
      feeRateSatVb,
      // A BIP-341 sighash the package builds, never caller-supplied.
      sign: (sighash: Uint8Array) => wallet.identity.signMessage(sighash, 'schnorr'),
    })
  }
}

export const makeSwapClient = (wallet: SwapClientConfig['wallet'], network: NetworkName): SwapClient =>
  createSwapClient({
    wallet,
    repository: assetSwapRepository,
    discovery: discoveryOptions(network),
    corridors: {
      onchain: {
        chain: { esploraUrl: onchainClaimEndpoint(network) },
        claim: onchainClaim(wallet, network),
      },
      lightning: {
        // The wallet's own decoder, applied by the corridor to the SOLVER's hold
        // invoice before it is shown: it throws `InvoiceRejected` on a wrong
        // network or an already-expired invoice, and skipping that is what loses
        // the payment.
        decode: (bolt11) => toInvoiceFacts(bolt11, network),
        covclaimd: getCovclaimdPubkeyForNetwork(network)
          ? { pubkey: getCovclaimdPubkeyForNetwork(network)! }
          : undefined,
      },
    },
    // Compressed hex only: the package cannot re-add an 02/03 prefix to an
    // x-only value, so a configured key in that shape reads as NO override and
    // the package falls back to its own per-network pin.
    emulatorPubkey: getEmulatorPubkeyOverrideForNetwork(network),
    // `drive: "auto"` is the default: construction restores, and arms only when
    // live swaps exist or on the first accept. The Web Lock in `providers/swaps`
    // is what keeps a second tab from arming a second drive over one repository.
  })
