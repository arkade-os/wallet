/**
 * The wallet's boundary onto the RFQ receive leg — `lightning:BTC -> arkade:BTC`.
 *
 * The mirror of `lnSwap.ts`'s send half, with the roles inverted: the WALLET
 * generates the preimage and is the covenant's `receiver`, the solver mints a
 * hold invoice and funds the lockup once that invoice is paid. So the two legs
 * are asymmetric in a way worth stating — a send is finished when the wallet
 * funds an address, while a receive is only finished when the wallet CLAIMS,
 * which means signing after the payer has already paid.
 *
 * That claim is the wallet's own job here — nobody else can make it: covclaimd
 * cannot spend this covenant today, so an unclaimed lockup is reclaimed by the
 * solver at `refund_locktime` and the payer refunded. What drives it is
 * `RfqSwapManager`, whose `RfqSwap` union covers `lightning_receive` as of
 * @arkade-os/swap 0.0.5; `toReceiveSwap` below is the projection it monitors and
 * `claimReceive` is the callback it calls. Staying online until the claim lands
 * is still part of the flow, but it is no longer this screen's job to stay
 * mounted for it.
 *
 * Which is exactly why covclaimd plays no part in it — see `sealingKey`.
 */
import { ArkAddress, contractSigner, type IWallet, type NetworkName, type ProvisionedClaimSecret } from '@arkade-os/sdk'
import {
  preimageForSwapRecord,
  pushClaim,
  requestLightningReceive,
  rfqSecretsProfile,
  type ClaimArkProvider,
  type LightningReceiveProfile,
  type LightningReceiveSwap,
  type LockupVtxo,
  type LightningReceiveTreeParams,
  type RfqClaimSecretProjection,
  type RfqSwapLockup,
  type RfqSwapOrigin,
  type RfqTransport,
} from '@arkade-os/swap'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { getEmulatorPubkeyOverrideForNetwork } from './constants'
import { toInvoiceFacts, type LnSendRendezvous } from './lnSwap'

/**
 * A throwaway key for the claim packet — its secret is discarded right here.
 *
 * The RFQ profile carries `P` sealed to covclaimd so that a wallet which goes
 * offline after paying can still be claimed for. This wallet does not go
 * offline: it holds the covenant's `receiver` role through its own
 * `payoutPubkey` and claims the lockup itself in `claimLnReceive`. So there is
 * nothing for covclaimd to do, and reaching a covclaimd deployment to ask for
 * its key would be a network dependency — and a failure mode — bought for
 * nothing.
 *
 * Sealing to a key nobody holds is the honest encoding of that: the field stays
 * well-formed for solvers that expect it, while `P` provably cannot be read
 * early by the solver, by covclaimd, or by us. Nothing derives from this key —
 * `deriveLightningReceive` commits to the payment hash, payout key, server and
 * emulator keys, and never to the packet — so it cannot move the lockup address.
 *
 * Restoring the offline path means sealing to a real covclaimd key here; the
 * wire format does not change.
 */
export const sealingKey = (): Uint8Array => secp256k1.getPublicKey(secp256k1.utils.randomSecretKey(), true)

/**
 * A negotiated receive, everything the caller must keep until it is claimed.
 *
 * `secrets` and `expectedAmount` are persisted-by-the-caller obligations in
 * the SDK: the preimage and payout key re-derive from the first, and without
 * the second the claim has nothing to check the funded value against. Reading
 * the value at claim time instead would accept whatever the solver funded,
 * which is the one check standing between a dust-funded lockup and a published
 * preimage that settles the payer's HTLC in full.
 */
export interface LnReceiveRequest {
  rfqId: string
  /** The solver's hold invoice — what the payer pays. */
  invoice: string
  /** What the payer is asked for, sats. */
  payAmount: number
  /** What the lockup must carry before the claim will publish the preimage. */
  expectedAmount: number
  /** Last moment the invoice can be paid: min(invoice expiry, valid_until). */
  invoiceExpiresAt: number
  /** The wallet's OWN derivation of the lockup the solver must fund. */
  address: string
  swapPkScript: Uint8Array
  script: Parameters<typeof pushClaim>[1]['script']
  payoutAddress: string
  secrets: ProvisionedClaimSecret
  /**
   * Every input the covenant was actually built from — including
   * `refundLocktime` and our own `paymentHash`.
   *
   * This replaced the whole `RfqQuote`, which was retained for one field, and
   * the difference is provenance rather than convenience. The quote is the
   * SOLVER's document: its `refund_locktime` is what the solver says its
   * deadline is, and its `profile.payment_hash` is the solver echoing back a
   * hash the wallet generated. `treeParams` is what the wallet fed into the
   * derivation the lockup address commits to, so reading it is reading our own
   * work rather than trusting a copy of it.
   */
  treeParams: LightningReceiveTreeParams
}

/**
 * Negotiate a hold invoice for `amountSats` received on Arkade.
 *
 * `amountSide: 'to'` because the amount the user typed is what they want to
 * RECEIVE; the solver solves the invoice up from it and its fee, so the payer
 * is asked for `payAmount`, which is the larger number.
 */
export const requestLnReceive = async (args: {
  wallet: Parameters<typeof requestLightningReceive>[0]
  arkServerUrl: string
  transport: RfqTransport
  rendezvous: LnSendRendezvous
  network: NetworkName
  amountSats: number
}): Promise<LnReceiveRequest> => {
  // 0.0.3: the co-signer key resolves inside the package (per-network pin);
  // the positional argument is gone.
  const result = await requestLightningReceive(args.wallet, args.arkServerUrl, args.transport, {
    amount: args.amountSats,
    amountSide: 'to',
    // The package's own pin is a placeholder on a network whose stack generates
    // its own co-signer key, and a covenant derived from the wrong one is
    // refused by `verifyLockupAddress` at quote time. The override cannot come
    // from the rendezvous — that carries the x-only form, which is not
    // re-compressible — so it reads the configured key directly, in the
    // compressed shape the package validates.
    emulatorPubkey: getEmulatorPubkeyOverrideForNetwork(args.network),
    covclaimdPubkey: sealingKey(),
    // The wallet's own decoder, applied to the SOLVER's invoice inside the
    // package's own gate (ts-sdk#728 reinstated the parameter): it throws
    // `InvoiceRejected` on a wrong network or an already-expired hold
    // invoice, and skipping it is what loses the payment.
    decodeInvoice: (bolt11: string) => toInvoiceFacts(bolt11, args.network),
  })
  return {
    rfqId: result.rfqId,
    invoice: result.invoice,
    payAmount: result.payAmount,
    // Both of these are the package's own answers, taken verbatim rather than
    // recomputed: `expectedAmount` is the quote's `to_amount` and
    // `invoiceExpiresAt` is `min(invoice expiry, valid_until)` — the same two
    // derivations this function used to redo, one decode later. A second copy is
    // a second place for them to drift.
    expectedAmount: result.expectedAmount,
    invoiceExpiresAt: result.invoiceExpiresAt,
    address: result.address,
    swapPkScript: result.swapPkScript,
    script: result.script,
    payoutAddress: result.payoutAddress,
    secrets: result.secrets,
    treeParams: result.treeParams,
  }
}

/**
 * A negotiated receive raised to a swap that cannot be driven yet: the manager
 * is holding another tab's lock.
 *
 * Named rather than generic because the screen has to say something true about
 * it. "Lightning unavailable" is what a missing solver or an out-of-bounds
 * amount means, and neither is the case here — nothing is unavailable, another
 * tab owns it, and closing that tab is the one thing that resolves it.
 */
export class LnReceiveHeldElsewhere extends Error {
  constructor() {
    super('another tab is handling Lightning receives')
    this.name = 'LnReceiveHeldElsewhere'
  }
}

/**
 * The immutable request-time half of a receive — what the live swap does not
 * carry and the record is created from.
 *
 * Pure, for the same reason `toReceiveSwap` is: the mapping is the part worth
 * testing and none of it needs a wallet. `RfqSwapManager` writes the record
 * itself once this reaches `addSwap`, so nothing here assembles a record.
 *
 * The profile's keys come from `rfqSecretsProfile`, never by hand. Copying
 * `signingDescriptor` and `preimageHex` across drops `preimageSaltHex`, and a
 * static wallet's swap is then unclaimable with nothing to say so until claim
 * time — a failure that has already been made once.
 *
 * `amount` is the record's consumer-display field; the rebuild ignores it.
 * Writing it now is what lets a receive history row be added without a
 * migration.
 */
export const toReceiveOrigin = (request: LnReceiveRequest): RfqSwapOrigin => {
  const { signer, hashlock } = rfqSecretsProfile(request.secrets, request.treeParams.paymentHash)
  // `rfqSecretsProfile` writes what the provisioning result actually has, and a
  // receive leg that produced no hashlock could never recover `P`. Refusing
  // here is refusing before the invoice is shown; the alternative is a lockup
  // the solver funds and nobody can claim.
  if (!hashlock) throw new Error('receive secrets carry no hashlock; the claim could never be recovered')
  return {
    kind: 'lightning_receive',
    lockupAddress: request.address,
    amount: request.expectedAmount,
    profile: {
      signer,
      hashlock,
      expectedAmount: request.expectedAmount,
      // Persistence-only: `rebuildRfqSwap` never returns it, because the
      // covenant does not bind it. The record is the only place it survives.
      payoutAddress: request.payoutAddress,
    } satisfies LightningReceiveProfile,
  }
}

/**
 * The monitored record `RfqSwapManager` drives, projected from a negotiation.
 *
 * Pure, and deliberately without a wallet: everything here is already in hand at
 * request time, `paymentHash` included. It comes off `treeParams` — the value
 * the wallet derived the covenant from — never off `quote.profile.payment_hash`.
 * On a receive leg `H` is ours, so the quote is the solver echoing it back, and
 * monitoring against the echo would let a solver name the hash whose claim we
 * watch for. `treeParams` closes that off by construction: the quote is no
 * longer retained at all.
 */
export const toReceiveSwap = (
  request: LnReceiveRequest,
  nowSeconds = Math.floor(Date.now() / 1000),
): LightningReceiveSwap => {
  // Required on `LightningReceiveTreeParams`, so this is now "the package
  // changed under us" rather than "arkade↔arkade quotes have no refund leaf".
  // Kept as an assertion because it is the solver's deadline and the only clock
  // the claim is gated on — a zero here would time the claim to the epoch.
  const { refundLocktime, paymentHash } = request.treeParams
  if (!refundLocktime) throw new Error('treeParams carry no refundLocktime; a receive swap cannot be timed')
  return {
    rfqId: request.rfqId,
    kind: 'lightning_receive',
    state: 'pending',
    lockupPkScript: request.swapPkScript,
    // Registers the covenant with the wallet's contract manager, which is what
    // turns funding and spend into pushed events instead of poll latency.
    lockup: { script: request.script, address: request.address },
    paymentHash,
    refundLocktime,
    expectedAmount: request.expectedAmount,
    createdAt: nowSeconds,
    updatedAt: nowSeconds,
  }
}

/**
 * Claim the lockup the manager has just seen funded — `RfqSwapManager`'s
 * `claimLockup` callback, shaped for it.
 *
 * There is no wait here: the outputs are handed in, so the manager's own
 * observation is what decided this runs at all. Nor is there a value check —
 * the manager's gate decides WHEN to act and `pushClaim`'s decides whether `P`
 * is published, and the package is explicit that the inner one is the
 * load-bearing check. A third copy would be a third place for the threshold to
 * drift.
 *
 * `record` is the claim projection `rfqClaimSecretOf` assembles from the stored
 * record's `signer` and `hashlock` keys, not just a descriptor:
 * `preimageForSwapRecord` needs the stored preimage on a wallet that cannot
 * re-derive `P`, and the salt on the arm that derives from one. It also
 * cross-checks the result against `record.paymentHash`, which is load-bearing on
 * its own — publishing a `P` that does not hash to the quote's `payment_hash`
 * settles nothing and reveals a secret for free.
 */
export const claimReceive = async (args: {
  wallet: IWallet
  ark: ClaimArkProvider
  /** Narrowed to a swap that carries its covenant: `lockup` is optional on the
   * package's record, but a receive swap without one has nothing to claim, so
   * the caller resolves that before this is reachable. */
  swap: LightningReceiveSwap & { lockup: RfqSwapLockup }
  payoutAddress: string
  record: RfqClaimSecretProjection
  vtxos: readonly LockupVtxo[]
  partiallyClaimed: boolean
}): Promise<{ arkTxid: string; amount: number }> => {
  const [preimage, receiver] = await Promise.all([
    preimageForSwapRecord(args.wallet, args.record),
    contractSigner(args.wallet, args.record.signingDescriptor),
  ])
  return pushClaim(args.ark, {
    script: args.swap.lockup.script,
    receiver,
    preimage,
    vtxos: args.vtxos,
    destinationPkScript: ArkAddress.decode(args.payoutAddress).pkScript,
    expectedAmount: args.swap.expectedAmount,
    partiallyClaimed: args.partiallyClaimed,
  })
}
