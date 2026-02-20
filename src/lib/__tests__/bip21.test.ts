import { describe, expect, it } from 'vitest'
import { decodeBip21, encodeBip21Asset } from '../bip21'

describe('encodeBip21Asset', () => {
  it('encodes asset BIP21 URI with ark address and asset ID', () => {
    const uri = encodeBip21Asset('ark1abc123', 'aabbccdd'.repeat(8) + '0000', 100)
    expect(uri).toBe(`bitcoin:?ark=ark1abc123&assetid=${'aabbccdd'.repeat(8)}0000&amount=100`)
  })
})

describe('decodeBip21 with assetid', () => {
  it('parses assetid from BIP21 URI', () => {
    const assetId = 'aabbccdd'.repeat(8) + '0000'
    const uri = `bitcoin:?ark=ark1abc123&assetid=${assetId}&amount=0.001`
    const decoded = decodeBip21(uri)
    expect(decoded.assetId).toBe(assetId)
  })

  it('returns undefined assetId when not present', () => {
    const uri = 'bitcoin:bc1qtest?amount=0.001'
    const decoded = decodeBip21(uri)
    expect(decoded.assetId).toBeUndefined()
  })
})
