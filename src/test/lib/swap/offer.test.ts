import { describe, expect, it } from 'vitest'
import { hex } from '@scure/base'
import { ArkAddress, asset } from '@arkade-os/sdk'
import { decodeOffer, encodeOffer, offerVtxoScript, Offer } from '../../../lib/swap/offer'

// deterministic keys -> the derived swap addresses must never drift (any
// change to the program JSONs or the arg binding changes them); goldens from
// the banco-swap gist selfCheck
const server = hex.decode('4f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa')
const keys = {
  makerPkScript: hex.decode('51203c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1'),
  makerPublicKey: hex.decode('3c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1'),
  emulatorPubkey: hex.decode('466d7fcae563e5cb09a0d1870bb580344804617879a14949cf22285f1bae3f27'),
}
const testAsset = asset.AssetId.fromString('aa'.repeat(32) + '0000')

const goldens: [Omit<Offer, 'swapPkScript'>, string][] = [
  [
    { wantAmount: BigInt(50_000), wantAsset: testAsset, ...keys },
    'tark1qp8n2k7uklxq4aegau7vawtptkgxsja4kt99lpv6krctwpq8tpc65wq0wnmwgr4nglzx999xqx7xahllp4gfh6638wkrjt5tl3k7c8vy6frzj2',
  ],
  [
    { wantAmount: BigInt(50_000), offerAsset: testAsset, ...keys },
    'tark1qp8n2k7uklxq4aegau7vawtptkgxsja4kt99lpv6krctwpq8tpc65qz8884545l2ka5mps383ntsennz3csywl5t33gghnu9rxjlg5wfv467cj',
  ],
]

describe('banco offer', () => {
  it('derives the golden swap addresses for both directions', () => {
    for (const [offer, golden] of goldens) {
      const script = offerVtxoScript(offer, server)
      const address = new ArkAddress(server, script.tweakedPublicKey, 'tark').encode()
      expect(address).toBe(golden)
    }
  })

  it('roundtrips the TLV codec for both directions', () => {
    for (const [offer] of goldens) {
      const script = offerVtxoScript(offer, server)
      const full: Offer = { ...offer, swapPkScript: script.pkScript }
      const back = decodeOffer(encodeOffer(full))
      expect(hex.encode(encodeOffer(back))).toBe(hex.encode(encodeOffer(full)))
      expect(back.wantAmount).toBe(BigInt(50_000))
      expect(back.wantAsset?.toString()).toBe(offer.wantAsset?.toString())
      expect(back.offerAsset?.toString()).toBe(offer.offerAsset?.toString())
    }
  })

  it('rejects malformed TLV payloads', () => {
    expect(() => decodeOffer(new Uint8Array([0x01, 0x00]))).toThrow('truncated TLV header')
    expect(() => decodeOffer(new Uint8Array([0x01, 0x00, 0x05, 0xaa]))).toThrow('truncated TLV value')
    expect(() => decodeOffer(new Uint8Array([0x7f, 0x00, 0x01, 0xaa]))).toThrow('unknown TLV type')
    // missing required fields
    expect(() => decodeOffer(new Uint8Array([0x01, 0x00, 0x01, 0xaa]))).toThrow('missing/invalid')
  })
})
