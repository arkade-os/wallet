import { hex, base64 } from '@scure/base'
import {
  ArkAddress,
  RestArkProvider,
  RestIndexerProvider,
  RestEmulatorProvider,
  CSVMultisigTapscript,
  MultisigTapscript,
  Transaction,
  buildOffchainTx,
  asset,
  Extension,
  createAssetPacket,
  ExtensionPacket,
  RelativeTimelock,
  IWallet,
  Asset,
  Recipient,
} from '@arkade-os/sdk'
import { Offer } from './offer'

function gcd(a: bigint, b: bigint): bigint {
  while (b !== BigInt(0)) {
    ;[a, b] = [b, a % b]
  }
  return a
}

export interface CreateOfferParams {
  /** Amount the maker wants to receive (in sats or asset units). */
  wantAmount: bigint
  /** Asset the maker wants. Omit for BTC. */
  wantAsset?: asset.AssetId
  /** Asset the maker is offering (locked in the VTXO). Omit for BTC. */
  offerAsset?: asset.AssetId
  /**
   * Partial-fill ratio numerator.
   * Must be provided together with `ratioDen`. Both must be positive.
   * Automatically reduced by GCD before encoding.
   */
  ratioNum?: bigint
  /**
   * Partial-fill ratio denominator.
   * Must be provided together with `ratioNum`. Both must be positive.
   */
  ratioDen?: bigint
}

/** Status of a VTXO at a swap address. */
export interface OfferStatus {
  txid: string
  vout: number
  value: number
  assets?: { assetId: string; amount: number }[]
  spendable: boolean
}

/**
 * Maker (sell-side) of a banco swap.
 *
 * Creates offers, queries their status, and cancels them.
 * The caller is responsible for funding the swap address after creating an offer.
 *
 * @example
 * ```ts
 * const maker = new banco.Maker(wallet, serverUrl, emulatorUrl);
 * const { offer, swapPkScript } = await maker.createOffer({ wantAmount: 10_000n });
 * await wallet.send({ address: swapAddress, amount: 50_000 }); // encode swapPkScript to address
 * ```
 */
export class Maker {
  private readonly arkProvider: RestArkProvider
  private readonly indexer: RestIndexerProvider
  private readonly emulator: RestEmulatorProvider

  constructor(
    private readonly wallet: IWallet,
    arkServerUrl: string,
    emulatorUrl: string,
  ) {
    this.arkProvider = new RestArkProvider(arkServerUrl)
    this.indexer = new RestIndexerProvider(arkServerUrl)
    this.emulator = new RestEmulatorProvider(emulatorUrl)
  }

  /**
   * Create a new swap offer.
   * @returns The offer as hex, as an extension packet, and the swap pkScript.
   *
   * Embed `packet` in the funding transaction's extension output so the
   * taker can discover the offer by txid.
   */
  async createOffer(params: CreateOfferParams): Promise<{
    offer: string
    packet: ExtensionPacket
    swapPkScript: Uint8Array
  }> {
    const info = await this.arkProvider.getInfo()
    const serverPubKey = hex.decode(info.signerPubkey).slice(1)

    const emuInfo = await this.emulator.getInfo()
    const rawEmuPubkey = hex.decode(emuInfo.signerPubkey)
    const emulatorPubkey = rawEmuPubkey.length === 33 ? rawEmuPubkey.slice(1) : rawEmuPubkey

    const address = await this.wallet.getAddress()
    const decoded = ArkAddress.decode(address)
    const makerPublicKey = await this.wallet.identity.xOnlyPublicKey()
    const makerPkScript = decoded.pkScript

    const exitDelay = info.unilateralExitDelay
    const exitTimelock: RelativeTimelock = {
      value: exitDelay,
      type: exitDelay < BigInt(512) ? 'blocks' : 'seconds',
    }

    let ratioNum: bigint | undefined
    let ratioDen: bigint | undefined
    const hasNum = params.ratioNum !== undefined
    const hasDen = params.ratioDen !== undefined
    if (hasNum !== hasDen) {
      throw new Error('ratioNum and ratioDen must both be provided or both omitted')
    }
    if (hasNum && hasDen) {
      if (params.ratioNum! <= BigInt(0) || params.ratioDen! <= BigInt(0)) {
        throw new Error('ratioNum and ratioDen must be positive')
      }
      const g = gcd(params.ratioNum!, params.ratioDen!)
      ratioNum = params.ratioNum! / g
      ratioDen = params.ratioDen! / g
    }

    const offerData: Offer.Data = {
      swapPkScript: new Uint8Array(0), // placeholder, computed below
      wantAmount: params.wantAmount,
      wantAsset: params.wantAsset,
      offerAsset: params.offerAsset,
      ratioNum,
      ratioDen,
      exitTimelock,
      makerPkScript,
      makerPublicKey,
      emulatorPubkey,
    }

    const swapPkScript = Offer.vtxoScript(offerData, serverPubKey).pkScript
    offerData.swapPkScript = swapPkScript

    return {
      offer: Offer.toHex(offerData),
      packet: Offer.toPacket(offerData),
      swapPkScript,
    }
  }

  /**
   * Query VTXOs at a swap pkScript.
   * @param swapPkScript - The scriptPubKey of the swap contract.
   */
  async getOffers(swapPkScript: Uint8Array): Promise<OfferStatus[]> {
    const { vtxos } = await this.indexer.getVtxos({
      scripts: [hex.encode(swapPkScript)],
      spendableOnly: false,
    })

    return vtxos.map((v) => ({
      txid: v.txid,
      vout: v.vout,
      value: v.value,
      assets: v.assets?.map((a) => ({
        assetId: a.assetId,
        amount: Number(a.amount),
      })),
      spendable: v.virtualStatus.state !== 'spent',
    }))
  }

  /**
   * Cancel an offer by spending the swap VTXO back to the maker via the
   * maker+server cancel multisig (cooperative, no timelock).
   * @param offerHex - The hex-encoded TLV offer.
   * @returns The ark transaction id.
   * @throws If the offer has no cancel path.
   */
  async cancelOffer(offerHex: string): Promise<string> {
    const offer = Offer.fromHex(offerHex)
    if (offer.makerPublicKey === undefined) {
      throw new Error('Offer does not have a cancel path')
    }

    const info = await this.arkProvider.getInfo()
    const serverPubKey = hex.decode(info.signerPubkey).slice(1)
    const checkpointUnrollClosure = CSVMultisigTapscript.decode(hex.decode(info.checkpointTapscript))

    const offerVtxoScript = Offer.vtxoScript(offer, serverPubKey)
    const cancelTapscript = MultisigTapscript.encode({
      pubkeys: [offer.makerPublicKey, serverPubKey],
    })
    const cancelLeaf = offerVtxoScript.findLeaf(hex.encode(cancelTapscript.script))

    const { vtxos } = await this.indexer.getVtxos({
      scripts: [hex.encode(offerVtxoScript.pkScript)],
      spendableOnly: true,
    })
    if (vtxos.length === 0) {
      throw new Error('No spendable VTXO found at swap address')
    }

    const swapVtxo = vtxos[0]
    const makerAddress = await this.wallet.getAddress()
    const makerPkScript = ArkAddress.decode(makerAddress).pkScript

    const outputs: { script: Uint8Array; amount: bigint }[] = [
      { script: makerPkScript, amount: BigInt(swapVtxo.value) },
    ]

    if (swapVtxo.assets && swapVtxo.assets.length > 0) {
      const assetInputs = new Map<number, Asset[]>()
      assetInputs.set(0, swapVtxo.assets)

      const recipients: Recipient[] = [
        {
          address: makerAddress,
          amount: swapVtxo.value,
          assets: swapVtxo.assets,
        },
      ]

      const assetPacket = createAssetPacket(assetInputs, recipients)
      outputs.push(Extension.create([assetPacket]).txOut())
    }

    const { arkTx, checkpoints } = buildOffchainTx(
      [
        {
          ...swapVtxo,
          tapLeafScript: cancelLeaf,
          tapTree: offerVtxoScript.encode(),
        },
      ],
      outputs,
      checkpointUnrollClosure,
    )

    const signedArkTx = await this.wallet.identity.sign(arkTx)
    const { arkTxid, signedCheckpointTxs } = await this.arkProvider.submitTx(
      base64.encode(signedArkTx.toPSBT()),
      checkpoints.map((c) => base64.encode(c.toPSBT())),
    )

    const finalCheckpoints = await Promise.all(
      signedCheckpointTxs.map(async (serverCp) => {
        const tx = Transaction.fromPSBT(base64.decode(serverCp))
        const signed = await this.wallet.identity.sign(tx, [0])
        return base64.encode(signed.toPSBT())
      }),
    )

    await this.arkProvider.finalizeTx(arkTxid, finalCheckpoints)
    return arkTxid
  }
}
