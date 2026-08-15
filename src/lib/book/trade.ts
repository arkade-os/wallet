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

/**
 * The asset packet that delivers `want` out of the taker's own coins.
 *
 * This is the arithmetic that must not be wrong: a transaction spending
 * asset-bearing inputs **burns every atomic unit its packet does not name**.
 * `coins` are the taker's holdings in the order they will be funded — `.from()`
 * is vin 0, so coin i is vin i+1 — and each contributes its FULL balance,
 * because an input is spent whole or not at all. The remainder over `want`
 * therefore has to come back on an output the taker owns, which is vout 1.
 *
 * Conservation is asserted here rather than assumed, so a later mis-edit throws
 * before anything is broadcast instead of destroying the difference.
 */
export const deliverAsset = (
  coins: readonly bigint[],
  want: bigint,
): { inputs: { vin: number; amount: bigint }[]; outputs: { vout: number; amount: bigint }[] } => {
  const inputs: { vin: number; amount: bigint }[] = []
  let total = 0n
  for (const amount of coins) {
    if (total >= want) break
    inputs.push({ vin: inputs.length + 1, amount })
    total += amount
  }
  if (total < want) throw new Error(`not enough of that asset to fill this bid: it wants ${want}, you hold ${total}`)

  // vout 0 is the maker's — the only output the covenant reads. vout 1 is ours,
  // and exists exactly when our coins overshoot, which is nearly always.
  const outputs = [{ vout: 0, amount: want }]
  if (total > want) outputs.push({ vout: 1, amount: total - want })

  const sum = (xs: { amount: bigint }[]) => xs.reduce((s, x) => s + x.amount, 0n)
  if (sum(inputs) !== sum(outputs)) {
    throw new Error(
      `asset packet does not conserve: ${sum(inputs)} in, ${sum(outputs)} out — refusing to burn the rest`,
    )
  }
  return { inputs, outputs }
}

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
 * deliver at least `wantAmount` to the maker's script at output 0 — sats for an
 * ask, the wanted asset for a bid. So the taker signs only its own funding
 * inputs, the emulator and arkd sign the rest, and **the maker is never
 * contacted** — it may be offline, and its consent was given when it funded.
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

  const taker = ArkAddress.decode(await deps.wallet.getAddress()).pkScript
  const dust = deps.dust
  const spendable = await deps.wallet.getSpendableVtxos()

  const build = contract.functions
    .fulfill()
    .from({ txid: order.fundingTxid, vout: order.vout, value: Number(order.depositSats) })

  if (isBtc(order.want.assetId)) {
    // Taking an ask: the maker wants sats, so we pay them. Enough to pay the
    // maker, carry the deposit out on our own output, and leave the covenant's
    // own sats to change.
    const { inputs } = selectVirtualCoins(spendable, Number(order.want.amount + dust))
    build.fund(inputs.map((coin) => ({ ...coin, tapLeafScript: coin.forfeitTapLeafScript })))
    // output 0 is the only one the covenant reads: at least wantAmount to the maker
    build.to(offer.makerPkScript, order.want.amount)

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
  } else {
    // Taking a bid: the covenant holds SATS and wants an asset, so we deliver
    // the asset and the deposit comes to us as change. Our own coins will not
    // sum to the maker's price, and the surplus burns unless the same packet
    // returns it — which is the whole job of deliverAsset above.
    const held = spendable
      .map((coin) => ({
        coin,
        amount: (coin.assets ?? []).reduce((s, a) => (a.assetId === order.want.assetId ? s + a.amount : s), 0n),
      }))
      .filter((c) => c.amount > 0n)
      // biggest first, so a fill spends the fewest inputs it can
      .sort((a, b) => (a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1))

    const { inputs, outputs } = deliverAsset(
      held.map((c) => c.amount),
      order.want.amount,
    )

    build.fund(held.slice(0, inputs.length).map(({ coin }) => ({ ...coin, tapLeafScript: coin.forfeitTapLeafScript })))
    // Output 0 is the maker's, on a dust carrier: the want-asset covenant reads
    // the ASSET at output 0 (INSPECTOUTASSETLOOKUP), never its sats. Output 1 is
    // ours and exists only when deliverAsset returned surplus for it.
    build.to(offer.makerPkScript, dust)
    if (outputs.length > 1) build.to(taker, dust)
    build.withAsset({ assetId: order.want.assetId, inputs, outputs })
  }

  // whatever is left — the covenant's carrier sats and our own change
  build.change(taker)

  const { txid } = await build.send()
  return txid
}
