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
import type { NetworkName } from '@arkade-os/sdk'
import { createSwapClient, type SwapClient, type SwapClientConfig } from '@arkade-os/swap'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { hex } from '@scure/base'
import { getEmulatorPubkeyOverrideForNetwork } from './constants'
import { toInvoiceFacts } from './lnSwap'
import { discoveryOptions } from './swapMarkets'
import { assetSwapRepository } from './swapRepository'

/**
 * A throwaway key for the receive leg's claim packet — its secret is discarded
 * right here.
 *
 * The RFQ profile carries `P` sealed to covclaimd so that a wallet which goes
 * offline after paying can still be claimed for. This wallet does not go
 * offline: it holds the covenant's `receiver` role through its own payout key
 * and the client claims the lockup itself. So there is nothing for covclaimd to
 * do, and reaching a covclaimd deployment to ask for its key would be a network
 * dependency — and a failure mode — bought for nothing.
 *
 * Sealing to a key nobody holds is the honest encoding of that: the field stays
 * well-formed for solvers that expect it, while `P` provably cannot be read
 * early by the solver, by covclaimd, or by us. Nothing derives from this key —
 * the lightning-receive derivation commits to the payment hash, payout key,
 * server and emulator keys, and never to the packet — so it cannot move the
 * lockup address.
 *
 * One key per client rather than per receive. The corridor takes it as
 * configuration, not per quote, so the per-receive freshness the v1 path had is
 * not expressible here; the cost is that two receives in one session seal to one
 * point, which links them to a solver collecting RFQ requests. Restoring the
 * offline path means sealing to a real covclaimd key, and that key is shared by
 * construction, so this is the shape the corridor is built for.
 */
export const sealingKey = (): string => hex.encode(secp256k1.getPublicKey(secp256k1.utils.randomSecretKey(), true))

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

export const makeSwapClient = (wallet: SwapClientConfig['wallet'], network: NetworkName): SwapClient =>
  createSwapClient({
    wallet,
    repository: assetSwapRepository,
    discovery: discoveryOptions(network),
    corridors: {
      lightning: {
        // The wallet's own decoder, applied by the corridor to the SOLVER's hold
        // invoice before it is shown: it throws `InvoiceRejected` on a wrong
        // network or an already-expired invoice, and skipping that is what loses
        // the payment.
        decode: (bolt11) => toInvoiceFacts(bolt11, network),
        covclaimd: { pubkey: sealingKey() },
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
