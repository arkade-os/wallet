/**
 * Acting on the book: post a resting order, or take someone else's.
 *
 * Framework-free and fully injected, like the rest of this module — a CLI, an
 * agent skill and the wallet all drive these same two calls. Nothing here reads
 * config, environment or context; every endpoint and key arrives as an argument.
 *
 * Pulling an order is deliberately absent: it is `cancelOffer(wallet, url,
 * offerHex, { repository, fundingTxid, swapAddress })` from `@arkade-os/swap`,
 * already one call, and wrapping it would only hide which arguments matter.
 */
import { hex } from '@scure/base'
import {
  arkade,
  ArkAddress,
  asset,
  getNetwork,
  RestArkProvider,
  RestEmulatorProvider,
  RestIndexerProvider,
  selectVirtualCoins,
  type IWallet,
  type NetworkName,
} from '@arkade-os/sdk'
import { BTC_ASSET_ID, createOffer, decodeOffer, offerVtxoScript, swapPrograms, type Offer } from '@arkade-os/swap'
import type { BookOrder } from './types.ts'

export interface BookDeps {
  wallet: IWallet
  arkServerUrl: string
  network: NetworkName
  /** The server's dust threshold, injected rather than read off the wallet:
   * it is a fact about the deployment, and the caller already holds it. */
  dust: bigint
}

const isBtc = (assetId: string) => assetId === BTC_ASSET_ID

// ── posting ──────────────────────────────────────────────────────────────────

export interface PlaceOrderParams {
  /** What you deposit into the covenant. */
  give: { assetId: string; amount: bigint }
  /** What a fill must deliver you. This is the price: the covenant enforces
   * exactly this amount and nothing about the market. */
  want: { assetId: string; amount: bigint }
  /** Override the covenant co-signer. Compressed hex, as `@arkade-os/swap`
   * takes it. Needed only where the package has no pin for the network. */
  emulatorPubkey?: string
}

export interface PlacedOrder {
  fundingTxid: string
  offerHex: string
  address: string
  swapPkScript: string
}

/**
 * Post a resting order at a price you choose.
 *
 * `want.amount` is yours to name — the covenant enforces whatever integer lands
 * there and knows nothing of any market rate. That is the whole difference
 * between this and a spot swap: quote the market and it fills now, quote past
 * it and it waits.
 *
 * The covenant is keyed on the RECEIVE side, not the deposit. Wanting sats is
 * the want-btc program with the deposit named by `offerAsset`; wanting an asset
 * is the want-asset program. Inverting this binds an asset amount as a sat
 * want, which a taker could satisfy with dust — so it is derived here once
 * rather than at each call site.
 */
export const placeOrder = async (deps: BookDeps, params: PlaceOrderParams): Promise<PlacedOrder> => {
  const { give, want } = params
  if (want.amount <= 0n) throw new Error('an order must ask for a positive amount')
  if (give.amount <= 0n) throw new Error('an order must deposit a positive amount')
  if (isBtc(give.assetId) && isBtc(want.assetId)) throw new Error('an order cannot swap BTC for BTC')

  const offer = await createOffer(deps.wallet, deps.arkServerUrl, {
    wantAmount: want.amount,
    ...(isBtc(want.assetId)
      ? { offerAsset: asset.AssetId.fromString(give.assetId) }
      : { wantAsset: asset.AssetId.fromString(want.assetId) }),
    ...(params.emulatorPubkey ? { emulatorPubkey: params.emulatorPubkey } : {}),
  })

  // The record cannot exist before the send — it is keyed by the funding txid.
  // createOffer has already registered the covenant, so a crash between here
  // and the send leaves a deposit the restore scan rebuilds from its packet.
  const fundingTxid = await deps.wallet.send({
    address: offer.address,
    // an asset deposit rides the SDK's default dust sat carrier when omitted
    amount: isBtc(give.assetId) ? Number(give.amount) : undefined,
    assets: isBtc(give.assetId) ? undefined : [{ assetId: give.assetId, amount: give.amount }],
    extensions: [offer.extension],
  })

  return {
    fundingTxid,
    offerHex: offer.offerHex,
    address: offer.address,
    swapPkScript: hex.encode(offer.swapPkScript),
  }
}

// ── taking ───────────────────────────────────────────────────────────────────

/**
 * Rebuild the covenant's program binding from the offer alone.
 *
 * Mirrors `swapProgramBinding` in `@arkade-os/swap`'s offer.ts, which is not
 * exported. Every input is a public field of the offer, so a taker can rebuild
 * the exact contract a maker funded without ever talking to them — which is the
 * property the whole non-interactive fill rests on. Kept beside the assertion
 * that checks it: if this drifts from the package, the derived script stops
 * matching `swapPkScript` and {@link takeOrder} refuses rather than mis-spends.
 */
const programBinding = (offer: Offer, serverPubkey: Uint8Array) => ({
  program: offer.wantAsset ? swapPrograms.wantAsset : swapPrograms.wantBtc,
  args: {
    makerWP: offer.makerPkScript.subarray(2),
    wantAmount: offer.wantAmount,
    server: serverPubkey,
    user: offer.makerPublicKey,
    ...(offer.wantAsset && {
      wantAssetTxid: offer.wantAsset.txid.slice().reverse(),
      wantAssetGroupIndex: offer.wantAsset.groupIndex,
    }),
  },
  keys: {
    serverKey: serverPubkey,
    userKey: offer.makerPublicKey,
    emulatorKey: offer.emulatorPubkey,
  },
})

export interface TakeOrderParams {
  order: BookOrder
  /** The key the covenant was funded against, x-only. `aspInfo.signerPubkey`
   * without its parity byte. */
  serverPubkey: Uint8Array
  /** The emulator that executes covenant spends. Without a reachable one a fill
   * cannot be submitted at all — `fulfill` is a covenant path. */
  emulatorUrl: string
}

/**
 * Take a resting order, whole.
 *
 * The covenant's `fulfill` leaf is signed by the server alone and constrained to
 * pay output 0 at least `wantAmount` to the maker's script. So the taker signs
 * only its own funding inputs, the emulator and arkd sign the rest, and **the
 * maker is never contacted** — it may be offline, and its consent was given when
 * it funded.
 *
 * A fill is all-or-nothing: the covenant has no remainder path, so the row is
 * taken entire or not at all. That is why there is no amount parameter.
 *
 * Racing a pull is normal, not exceptional. If the maker's cancel lands first
 * this throws because the deposit is already spent — which means the order is
 * gone, not that anything broke.
 */
export const takeOrder = async (deps: BookDeps, params: TakeOrderParams): Promise<string> => {
  const { order, serverPubkey, emulatorUrl } = params
  const offer = decodeOffer(hex.decode(order.offerHex))

  // Refuse before spending anything if our rebuild disagrees with the script the
  // maker actually funded — a rotated server key, or a package drift in the
  // binding above. Same diagnosis cancelOffer makes for the same cause.
  const derived = offerVtxoScript(offer, serverPubkey)
  if (hex.encode(derived.pkScript) !== order.swapPkScript) {
    throw new Error('derived covenant does not match the order — server key rotated, or terms tampered with')
  }

  const contractManager = await deps.wallet.getContractManager()
  const client = await arkade.Arkade.connect({
    arkade: new RestArkProvider(deps.arkServerUrl),
    indexer: new RestIndexerProvider(deps.arkServerUrl),
    emulator: new RestEmulatorProvider(emulatorUrl),
    identity: deps.wallet.identity,
    network: getNetwork(deps.network),
    contractManager,
  })

  const { program, args, keys } = programBinding(offer, serverPubkey)
  const contract = new arkade.ArkadeContract(client, program, args, keys)

  // v1 takes asks only: the maker deposited an asset and wants sats, so the
  // taker pays sats and receives the asset. The mirror case — taking a bid by
  // DELIVERING an asset — is refused rather than half-built, because the taker
  // would then have to declare asset change on its own inputs, and an asset
  // input without a matching output is a permanent burn. Meeting a bid is
  // posting an ask against it, which routes through placeOrder and cannot burn.
  if (!isBtc(order.want.assetId)) {
    throw new Error('taking a bid is not supported yet — post an ask to meet it')
  }

  const taker = ArkAddress.decode(await deps.wallet.getAddress()).pkScript
  const dust = deps.dust

  // enough to pay the maker, carry the asset out on our own output, and leave
  // the covenant's own sats to change
  const spendable = await deps.wallet.getSpendableVtxos()
  const { inputs } = selectVirtualCoins(spendable, Number(order.want.amount + dust))

  const build = contract.functions
    .fulfill()
    .from({ txid: order.fundingTxid, vout: order.vout, value: Number(order.depositSats) })
    .fund(inputs.map((coin) => ({ ...coin, tapLeafScript: coin.forfeitTapLeafScript })))
    // output 0 is the only one the covenant reads: at least wantAmount to the maker
    .to(offer.makerPkScript, order.want.amount)

  // output 1 carries the deposit out to us. An asset deposit MUST be declared:
  // a transaction spending asset-bearing inputs without a packet accounting for
  // them burns the balance outright, so every atomic unit of vin 0 is named here.
  if (!isBtc(order.give.assetId)) {
    build.to(taker, dust)
    build.withAsset({
      assetId: order.give.assetId,
      inputs: [{ vin: 0, amount: order.give.amount }],
      outputs: [{ vout: 1, amount: order.give.amount }],
    })
  }

  // whatever is left — the covenant's carrier sats and our own change
  build.change(taker)

  const { txid } = await build.send()
  return txid
}
