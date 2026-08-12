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
 * corridors only (`RfqSwap = LightningSendSwap | OnchainSendSwap`), and
 * covclaimd cannot yet claim this covenant on an offline wallet's behalf, so
 * an unclaimed lockup is reclaimed by the solver at `refund_locktime` and the
 * payer refunded. Staying online until `claimLnReceive` resolves is therefore
 * part of the flow, not an optimisation.
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
import { hex } from '@scure/base'
import { toInvoiceFacts, type LnSendRendezvous } from './lnSwap'

/** covclaimd publishes its own key and the emulator's, both compressed hex. */
interface CovclaimdPubKeys {
  covclaimd_pub_key: string
  emulator_pub_key: string
}

/**
 * Fetch covclaimd's pubkey, which the claim packet is sealed to.
 *
 * Required by the SDK even though nothing decrypts the packet today: it is
 * what a future offline claim would need, and it is bound into the request
 * before the invoice is publishable.
 */
export const covclaimdPubkey = async (url: string, signal?: AbortSignal): Promise<Uint8Array> => {
  const response = await fetch(`${url.replace(/\/$/, '')}/v1/preimage/covclaimd-pubkey`, { signal })
  if (!response.ok) throw new Error(`covclaimd is unreachable (${response.status})`)
  const body = (await response.json()) as Partial<CovclaimdPubKeys>
  const key = body.covclaimd_pub_key
  // 33-byte compressed, as sealClaimPacket's ECIES requires — not the x-only
  // form the covenant keys use, so a 64-char value here is the wrong key.
  if (typeof key !== 'string' || !/^0[23][0-9a-f]{64}$/.test(key)) {
    throw new Error('covclaimd returned a malformed pubkey')
  }
  return hex.decode(key)
}

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
  covclaimdPubkey: Uint8Array
  network: NetworkName
  amountSats: number
}): Promise<LnReceiveRequest> => {
  const result = await requestLightningReceive(
    args.wallet,
    args.arkServerUrl,
    hex.decode(args.rendezvous.emulatorPubkey),
    args.transport,
    {
      amount: args.amountSats,
      amountSide: 'to',
      covclaimdPubkey: args.covclaimdPubkey,
      // The wallet's own decoder, applied to the SOLVER's invoice — the SDK
      // requires it rather than offering it, since skipping this check is what
      // loses the payment.
      decodeInvoice: (bolt11) => toInvoiceFacts(bolt11, args.network),
    },
  )
  return {
    rfqId: result.rfqId,
    invoice: result.invoice,
    payAmount: result.payAmount,
    expectedAmount: result.expectedAmount,
    invoiceExpiresAt: result.invoiceExpiresAt,
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
  return pushClaim(args.ark, {
    script: request.script,
    receiver,
    preimage,
    vtxos,
    destinationPkScript: ArkAddress.decode(request.payoutAddress).pkScript,
    expectedAmount: request.expectedAmount,
  })
}
