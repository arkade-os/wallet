/**
 * Post a resting order, take someone else's, or pull our own.
 *
 * The covenant work lives in `@arkade-os/swap/protocol`. `createOffer` registers
 * the contract with the wallet's ContractManager before it returns an address.
 * `fillOffer` builds the fulfill spend, including the asset change that would
 * otherwise burn. `cancelOffer` spends the collaborative cancel leaf, which
 * does not need the emulator. This module only chooses the coins and the
 * receive-side program.
 */
import { hex } from '@scure/base'
import { asset, selectVirtualCoins, type ExtendedVirtualCoin, type IWallet } from '@arkade-os/sdk'
import type { AssetSwapRepository } from '@arkade-os/swap'
import { cancelOffer, createOffer, fillOffer, type FillFunding } from '@arkade-os/swap/protocol'
import { isBtc, type BookOrder } from './types'

type FundCoin = Pick<ExtendedVirtualCoin, 'txid' | 'vout' | 'value' | 'forfeitTapLeafScript' | 'tapTree' | 'assets'>

export interface PlacedOrder {
  fundingTxid: string
  offerHex: string
  address: string
  swapPkScript: string
}

export interface PlaceOrderParams {
  /** What goes into the covenant. */
  give: { assetId: string; amount: bigint }
  /** What a fill must deliver. The covenant enforces this integer and knows no market rate. */
  want: { assetId: string; amount: bigint }
  /** Compressed hex. Passed only where this wallet has its own co-signer pin. */
  emulatorPubkey?: string
}

const asSats = (amount: bigint, what: string): number => {
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${what} must be a positive satoshi amount`)
  }
  return Number(amount)
}

/**
 * Fund a standing offer.
 *
 * The program is keyed on the receive side. Wanting sats uses the want-btc
 * program and names the deposit with `offerAsset`. Wanting an asset uses the
 * want-asset program. The other way around binds an asset amount as a sat
 * want, which a taker could satisfy with dust, so the choice is made once here.
 */
export const placeOrder = async (wallet: IWallet, params: PlaceOrderParams): Promise<PlacedOrder> => {
  const { give, want } = params
  if (want.amount <= 0n || give.amount <= 0n) throw new Error('an order needs a positive amount on both sides')
  if (isBtc(give.assetId) === isBtc(want.assetId)) throw new Error('an order swaps an asset against sats')

  const wantingSats = isBtc(want.assetId)
  const offer = await createOffer(wallet, {
    wantAmount: want.amount,
    ...(wantingSats
      ? { offerAsset: asset.AssetId.fromString(give.assetId) }
      : { wantAsset: asset.AssetId.fromString(want.assetId) }),
    ...(params.emulatorPubkey ? { emulatorPubkey: params.emulatorPubkey } : {}),
  })

  const fundingTxid = await wallet.send({
    address: offer.address,
    // An asset deposit rides the dust carrier when the sat amount is omitted.
    ...(isBtc(give.assetId) ? { amount: asSats(give.amount, 'a BTC deposit') } : {}),
    ...(isBtc(give.assetId) ? {} : { assets: [{ assetId: give.assetId, amount: give.amount }] }),
    extensions: [offer.extension],
  })

  return {
    fundingTxid,
    offerHex: offer.offerHex,
    address: offer.address,
    swapPkScript: hex.encode(offer.swapPkScript),
  }
}

const toFund = (coin: FundCoin): FillFunding => ({
  txid: coin.txid,
  vout: coin.vout,
  value: coin.value,
  tapLeafScript: coin.forfeitTapLeafScript,
  tapTree: coin.tapTree,
  ...(coin.assets?.length
    ? { assets: coin.assets.map((entry) => ({ assetId: entry.assetId, amount: entry.amount })) }
    : {}),
})

const assetBalance = (coin: FundCoin, assetId: string): bigint =>
  (coin.assets ?? []).reduce((sum, entry) => (entry.assetId === assetId ? sum + entry.amount : sum), 0n)

/**
 * Coins that pay `order.want`.
 *
 * A BTC want is a satoshi selection of at least that amount. The deposit's own
 * sats become the change output, so the taker does not have to fund the
 * carrier as well. An asset want spends whole coins and `fillOffer` returns
 * the surplus; every asset on those coins is declared, because an input is
 * spent whole and an undeclared asset burns.
 */
export const fundingFor = (order: BookOrder, spendable: readonly FundCoin[]): FillFunding[] => {
  if (isBtc(order.want.assetId)) {
    const { inputs } = selectVirtualCoins(
      spendable as ExtendedVirtualCoin[],
      asSats(order.want.amount, 'the sats this order wants'),
    )
    return inputs.map(toFund)
  }

  const held = spendable
    .map((coin) => ({ coin, amount: assetBalance(coin, order.want.assetId) }))
    .filter((entry) => entry.amount > 0n)
    .sort((a, b) => (a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1))

  const picked: FundCoin[] = []
  let total = 0n
  for (const entry of held) {
    if (total >= order.want.amount) break
    picked.push(entry.coin)
    total += entry.amount
  }
  if (total < order.want.amount) {
    throw new Error(`not enough of that asset to fill this order: it wants ${order.want.amount}, you hold ${total}`)
  }
  return picked.map(toFund)
}

export interface TakeOrderParams {
  order: BookOrder
  /** The operator this wallet is connected to. `fillOffer` still takes a URL. */
  arkServerUrl: string
  /** Covenant spends are submitted here. Posting and cancelling do not need it. */
  emulatorUrl: string
}

/** Take a resting order, whole. The maker is not contacted. */
export const takeOrder = async (wallet: IWallet, params: TakeOrderParams): Promise<string> => {
  const fund = fundingFor(params.order, await wallet.getSpendableVtxos())
  return fillOffer(wallet, params.arkServerUrl, params.order.offerHex, {
    fund,
    fundingTxid: params.order.fundingTxid,
    fundingOutpoint: { txid: params.order.fundingTxid, vout: params.order.vout },
    emulator: params.emulatorUrl,
  })
}

/**
 * Pull our own order back. The cancel leaf is the maker plus the server, so
 * this does not go through the emulator. `swapAddress` is omitted on purpose:
 * a script passed where an address is expected throws inside the decoder and
 * the order stays up.
 */
export const pullOrder = async (wallet: IWallet, order: BookOrder, repository: AssetSwapRepository): Promise<string> =>
  cancelOffer(wallet, order.offerHex, {
    repository,
    fundingTxid: order.fundingTxid,
    fundingOutpoint: { txid: order.fundingTxid, vout: order.vout },
  })
