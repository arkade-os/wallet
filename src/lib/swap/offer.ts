/**
 * Banco swap — an atomic-swap covenant on Arkade.
 *
 * The contracts are the two JSON files, one per swap direction:
 *   banco-btc-to-asset.program.json  maker deposits BTC, wants an asset
 *   banco-asset-to-btc.program.json  maker deposits an asset, wants BTC
 *
 * Coins locked by a contract can only be spent by a transaction that delivers
 * `$wantAmount` (of `$wantTxid`, or of BTC) to `$makerWP` — the `fulfill`
 * covenant, co-signed by the Arkade signer only after executing that script —
 * or cooperatively by the maker (`cancel`). This file is just plumbing: bind
 * an offer's values to the program's `$param`s, and speak the solver's TLV
 * offer-discovery format.
 */
import { hex } from '@scure/base'
import {
  ArkAddress,
  RestArkProvider,
  RestIndexerProvider,
  RestEmulatorProvider,
  arkade,
  asset,
  getNetwork,
  type IWallet,
  type NetworkName,
} from '@arkade-os/sdk'

import btcToAsset from './banco-btc-to-asset.program.json'
import assetToBtc from './banco-asset-to-btc.program.json'

// json imports widen "type": "pubkey" to string; parseArtifact validates at runtime
type Artifact = Parameters<typeof arkade.parseArtifact>[0]

/** The contracts — pure data, shared verbatim with any other implementation. */
export const bancoPrograms = {
  btcToAsset: arkade.parseArtifact(btcToAsset as Artifact),
  assetToBtc: arkade.parseArtifact(assetToBtc as Artifact),
}

// ── Offer ────────────────────────────────────────────────────────────────────

/** A full-fill offer. Exactly one side is an asset: `wantAsset` set = the
 * maker deposits BTC and wants that asset; `offerAsset` set = the reverse. */
export interface Offer {
  /** The scriptPubKey of the swap contract. */
  swapPkScript: Uint8Array
  /** Amount the maker wants (asset units, or sats when wanting BTC). */
  wantAmount: bigint
  /** The asset the maker wants. Omitted when wanting BTC. */
  wantAsset?: asset.AssetId
  /** The asset the maker deposits. Omitted when depositing BTC. */
  offerAsset?: asset.AssetId
  /** Maker's taproot scriptPubKey (34 bytes) — where the fill must pay. */
  makerPkScript: Uint8Array
  /** Maker's x-only key (32 bytes) — the cancel path's `user` signer. */
  makerPublicKey: Uint8Array
  /** Covenant co-signer (emulator) x-only key (32 bytes). */
  emulatorPubkey: Uint8Array
}

/** Compile the offer's contract: program + args -> taproot tree. */
export function offerVtxoScript(offer: Omit<Offer, 'swapPkScript'>, serverPubkey: Uint8Array) {
  const program = offer.wantAsset ? bancoPrograms.btcToAsset : bancoPrograms.assetToBtc
  return new arkade.ArkadeProgramScript(
    program,
    {
      makerWP: offer.makerPkScript.subarray(2),
      wantAmount: offer.wantAmount,
      server: serverPubkey,
      user: offer.makerPublicKey,
      // internal byte order
      ...(offer.wantAsset && { wantTxid: offer.wantAsset.txid.slice().reverse() }),
    },
    {
      serverKey: serverPubkey,
      userKey: offer.makerPublicKey,
      emulatorKey: offer.emulatorPubkey,
    },
  )
}

// ── Offer wire format ────────────────────────────────────────────────────────
// The offer travels inside the funding tx as an Extension packet (type 0x03)
// so a taker (the arkade solver) can discover it from the txid alone.
// Payload: `[type: 1B][length: 2B BE][value]` records.

/** Extension packet type tag for banco offers. */
export const OFFER_PACKET_TYPE = 0x03

const T = {
  swapPkScript: 0x01,
  wantAmount: 0x02,
  wantAsset: 0x03,
  makerPkScript: 0x05,
  makerPublicKey: 0x07,
  emulatorPubkey: 0x08,
  offerAsset: 0x0b,
} as const

function tlv(type: number, value: Uint8Array): Uint8Array {
  const rec = new Uint8Array(3 + value.length)
  rec[0] = type
  rec[1] = (value.length >> 8) & 0xff
  rec[2] = value.length & 0xff
  rec.set(value, 3)
  return rec
}

/** Serialize an offer to TLV bytes (the packet payload). */
export function encodeOffer(offer: Offer): Uint8Array {
  const amount = new Uint8Array(8)
  new DataView(amount.buffer).setBigUint64(0, offer.wantAmount, false)
  const recs = [tlv(T.swapPkScript, offer.swapPkScript), tlv(T.wantAmount, amount)]
  if (offer.wantAsset) recs.push(tlv(T.wantAsset, offer.wantAsset.serialize()))
  if (offer.offerAsset) recs.push(tlv(T.offerAsset, offer.offerAsset.serialize()))
  recs.push(
    tlv(T.makerPkScript, offer.makerPkScript),
    tlv(T.makerPublicKey, offer.makerPublicKey),
    tlv(T.emulatorPubkey, offer.emulatorPubkey),
  )
  const out = new Uint8Array(recs.reduce((s, r) => s + r.length, 0))
  let off = 0
  for (const r of recs) {
    out.set(r, off)
    off += r.length
  }
  return out
}

/** Parse TLV bytes into an offer. Throws on malformed or unknown records. */
export function decodeOffer(data: Uint8Array): Offer {
  const names = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k])) as Record<number, keyof typeof T>
  const fields: Partial<Record<keyof typeof T, Uint8Array>> = {}
  let off = 0
  while (off < data.length) {
    if (off + 3 > data.length) throw new Error('truncated TLV header')
    const type = data[off]
    const length = (data[off + 1] << 8) | data[off + 2]
    off += 3
    if (off + length > data.length) throw new Error(`truncated TLV value for type 0x${type.toString(16)}`)
    const name = names[type]
    if (!name) throw new Error(`unknown TLV type: 0x${type.toString(16)}`)
    fields[name] = data.slice(off, off + length)
    off += length
  }
  const need = (name: keyof typeof T, len?: number) => {
    const v = fields[name]
    if (!v || (len !== undefined && v.length !== len)) throw new Error(`missing/invalid ${name}`)
    return v
  }
  const amount = need('wantAmount', 8)
  return {
    swapPkScript: need('swapPkScript'),
    wantAmount: new DataView(amount.buffer, amount.byteOffset).getBigUint64(0, false),
    ...(fields.wantAsset && { wantAsset: asset.AssetId.fromBytes(fields.wantAsset) }),
    ...(fields.offerAsset && { offerAsset: asset.AssetId.fromBytes(fields.offerAsset) }),
    makerPkScript: need('makerPkScript', 34),
    makerPublicKey: need('makerPublicKey', 32),
    emulatorPubkey: need('emulatorPubkey', 32),
  }
}

// ── Maker operations ─────────────────────────────────────────────────────────

/**
 * Build a new offer for `wallet` (the maker). Fund `address` with the side
 * you deposit, embedding the payload, and the solver does the rest:
 *
 *   // BTC -> asset
 *   const o = await createOffer(wallet, ARK, EMU, { wantAmount: 1000n, wantAsset })
 *   await wallet.send({ address: o.address, amount: 1000,
 *                       extensions: [{ type: OFFER_PACKET_TYPE, payload: o.payload }] })
 *
 *   // asset -> BTC (the sats are the VTXO carrier for the asset)
 *   const o = await createOffer(wallet, ARK, EMU, { wantAmount: 1000n, offerAsset })
 *   await wallet.send({ address: o.address, amount: 500,
 *                       assets: [{ assetId, amount: 1000n }],
 *                       extensions: [{ type: OFFER_PACKET_TYPE, payload: o.payload }] })
 */
export async function createOffer(
  wallet: IWallet,
  arkServerUrl: string,
  emulatorUrl: string,
  params: { wantAmount: bigint; wantAsset?: asset.AssetId; offerAsset?: asset.AssetId },
): Promise<{ offerHex: string; payload: Uint8Array; address: string; swapPkScript: Uint8Array }> {
  if (!params.wantAsset === !params.offerAsset) {
    throw new Error('set exactly one of wantAsset (BTC->asset) or offerAsset (asset->BTC)')
  }
  const info = await new RestArkProvider(arkServerUrl).getInfo()
  const serverPubKey = hex.decode(info.signerPubkey).slice(1)
  const emuKey = hex.decode((await new RestEmulatorProvider(emulatorUrl).getInfo()).signerPubkey)

  const offer: Offer = {
    swapPkScript: new Uint8Array(0), // placeholder, computed below
    wantAmount: params.wantAmount,
    wantAsset: params.wantAsset,
    offerAsset: params.offerAsset,
    makerPkScript: ArkAddress.decode(await wallet.getAddress()).pkScript,
    makerPublicKey: await wallet.identity.xOnlyPublicKey(),
    emulatorPubkey: emuKey.length === 33 ? emuKey.slice(1) : emuKey,
  }
  const script = offerVtxoScript(offer, serverPubKey)
  offer.swapPkScript = script.pkScript

  return {
    offerHex: hex.encode(encodeOffer(offer)),
    payload: encodeOffer(offer),
    address: new ArkAddress(
      serverPubKey,
      script.tweakedPublicKey,
      getNetwork(info.network as NetworkName).hrp,
    ).encode(),
    swapPkScript: script.pkScript,
  }
}

/** Cancel an offer: spend the swap VTXO back to the maker. Returns the ark txid. */
export async function cancelOffer(wallet: IWallet, arkServerUrl: string, offerHex: string): Promise<string> {
  const offer = decodeOffer(hex.decode(offerHex))

  const client = await arkade.Arkade.connect({
    arkade: new RestArkProvider(arkServerUrl),
    indexer: new RestIndexerProvider(arkServerUrl),
    identity: wallet.identity,
  })

  // Rebuild the contract with the offer's own keys (not the client's) so the
  // derived script matches the funded swap address exactly.
  const program = offer.wantAsset ? bancoPrograms.btcToAsset : bancoPrograms.assetToBtc
  const contract = new arkade.ArkadeContract(
    client,
    program,
    {
      makerWP: offer.makerPkScript.subarray(2),
      wantAmount: offer.wantAmount,
      server: client.serverKey,
      user: offer.makerPublicKey,
      ...(offer.wantAsset && { wantTxid: offer.wantAsset.txid.slice().reverse() }),
    },
    {
      serverKey: client.serverKey,
      userKey: offer.makerPublicKey,
      emulatorKey: offer.emulatorPubkey,
    },
  )

  const [vtxo] = await contract.getUtxos()
  if (!vtxo) throw new Error('no spendable VTXO at the swap address')

  const makerPkScript = ArkAddress.decode(await wallet.getAddress()).pkScript
  const cancel = contract.functions
    .cancel()
    .from({ txid: vtxo.txid, vout: vtxo.vout, value: vtxo.value })
    .to(makerPkScript, BigInt(vtxo.value))
  // An asset-deposit swap VTXO carries the asset; move it back too.
  for (const a of vtxo.assets ?? []) {
    cancel.withAsset({
      assetId: a.assetId,
      inputs: [{ vin: 0, amount: BigInt(a.amount) }],
      outputs: [{ vout: 0, amount: BigInt(a.amount) }],
    })
  }
  const { txid } = await cancel.send()
  return txid
}
