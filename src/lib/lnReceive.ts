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
 * That claim is the wallet's own job here. `RfqSwapManager` covers the send
 * corridors only (`RfqSwap = LightningSendSwap | OnchainSendSwap`), so an
 * unclaimed lockup is reclaimed by the solver at `refund_locktime` and the
 * payer refunded. Staying online until `claimLnReceive` resolves is therefore
 * part of the flow, not an optimisation.
 *
 * Which is exactly why covclaimd plays no part in it — see `sealingKey`.
 */
import { ArkAddress, type NetworkName, type RestArkProvider, type RestIndexerProvider } from '@arkade-os/sdk'
import {
  awaitLockupFunding,
  preimageForRfqSecrets,
  pushClaim,
  requestLightningReceive,
  senderIdentityForRfqSecrets,
  type RfqTransport,
  type SwapSecrets,
} from '@arkade-os/swap'
import { secp256k1 } from '@noble/curves/secp256k1.js'
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
  secrets: SwapSecrets
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
  const result = await requestLightningReceive(
    args.wallet,
    args.arkServerUrl,
    args.transport,
    {
      amount: args.amountSats,
      amountSide: 'to',
      covclaimdPubkey: sealingKey(),
      // The wallet's own decoder, applied to the SOLVER's invoice inside the
      // package's own gate (ts-sdk#728 reinstated the parameter): it throws
      // `InvoiceRejected` on a wrong network or an already-expired hold
      // invoice, and skipping it is what loses the payment.
      decodeInvoice: (bolt11: string) => toInvoiceFacts(bolt11, args.network),
    },
  )
  const facts = toInvoiceFacts(result.invoice, args.network)
  return {
    rfqId: result.rfqId,
    invoice: result.invoice,
    payAmount: result.payAmount,
    // The quote's `to_amount` IS the expected amount: the arkade side of a
    // corridor the wallet asked for `amountSide: 'to'` on. Read once, here,
    // rather than at claim time — see the interface's note.
    expectedAmount: result.quote.to_amount,
    // Whichever comes first genuinely ends the window: paying after the quote
    // lapses buys a lockup the solver no longer owes, and the invoice's own
    // expiry needs no explanation.
    invoiceExpiresAt: Math.min(facts.expiresAt, result.quote.valid_until),
    address: result.address,
    swapPkScript: result.swapPkScript,
    script: result.script,
    payoutAddress: result.payoutAddress,
    secrets: result.secrets,
  }
}

/**
 * Wait for the solver's funding, then claim it.
 *
 * Resolves once the claim lands; the funds appear at the wallet's own payout
 * address, so the receive screen's existing VTXO listener is what reports the
 * payment. The deadline gates only the WAIT — after funding, the claim races
 * the solver's `refund_locktime` and nothing here should shorten that.
 */
export const claimLnReceive = async (
  args: {
    wallet: Parameters<typeof requestLightningReceive>[0]
    indexer: Pick<RestIndexerProvider, 'getVtxos'>
    ark: Pick<RestArkProvider, 'getInfo' | 'submitTx' | 'finalizeTx'>
    request: LnReceiveRequest
  },
  options: { pollMs?: number; deadline?: number } = {},
): Promise<{ arkTxid: string; amount: number }> => {
  const { request } = args
  const [preimage, receiver] = await Promise.all([
    preimageForRfqSecrets(args.wallet, request.secrets),
    senderIdentityForRfqSecrets(args.wallet, request.secrets),
  ])
  // Spelled out rather than via `claimReceiveLockup`, whose input type demands
  // the `vtxos` its own wait produces (@arkade-os/swap, claim.ts) — passing a
  // placeholder to satisfy that would read as if it meant something.
  const vtxos = await awaitLockupFunding(args.indexer, request.swapPkScript, options)
  // Checked here AND passed to `pushClaim` (ts-sdk#728 reinstated the
  // parameter). This is the one check standing between a dust-funded lockup
  // and a published preimage that settles the payer's HTLC in full: the claim
  // reveals `P`, so a short-funded lockup claimed anyway pays the solver
  // everything and the wallet almost nothing. Refusing leaves the lockup to
  // `refund_locktime`, which refunds the payer — the correct outcome for a
  // solver that underfunded.
  const funded = vtxos.reduce((total, vtxo) => total + vtxo.value, 0)
  if (funded < request.expectedAmount) {
    throw new Error(`lockup underfunded: ${funded} sats at the covenant, expected ${request.expectedAmount}`)
  }
  return pushClaim(args.ark, {
    script: request.script,
    receiver,
    preimage,
    vtxos,
    destinationPkScript: ArkAddress.decode(request.payoutAddress).pkScript,
    expectedAmount: request.expectedAmount,
  })
}
