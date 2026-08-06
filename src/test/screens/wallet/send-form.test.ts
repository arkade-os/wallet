import { describe, expect, it } from 'vitest'
import { isPlainOnchainTypedRecipient } from '../../../screens/Wallet/Send/Form'

const BTC_ADDRESS = 'bcrt1pq6gt72nxevsxk5fwl3h2sx56jeah6qfzh98mksxyakkg5l0q65gsa27khh'
const ARK_ADDRESS =
  'ARK1QQ4HFSSPRTCGNJZF8QLW2F78YVJAU5KLDFUGG29K34Y7J96Q2W4T4USH2JZ072D0ALD83VLWZRKDG24R40WRCM8XJW6AX7YPNJHTEZGU4A9R8D'

describe('isPlainOnchainTypedRecipient', () => {
  it('returns true for a bare BTC address', () => {
    expect(isPlainOnchainTypedRecipient(BTC_ADDRESS)).toBe(true)
  })

  it('returns true for a BIP21 URI with a valid BTC address only', () => {
    expect(isPlainOnchainTypedRecipient(`bitcoin:${BTC_ADDRESS}`)).toBe(true)
  })

  it('returns false for a BIP21 URI with a malformed address', () => {
    expect(isPlainOnchainTypedRecipient('bitcoin:not-an-address')).toBe(false)
  })

  it('returns false for a BIP21 URI mixing a BTC address with an ark address', () => {
    expect(isPlainOnchainTypedRecipient(`bitcoin:${BTC_ADDRESS}?ark=${ARK_ADDRESS}`)).toBe(false)
  })

  it('returns false for a BIP21 URI mixing a BTC address with a lightning invoice', () => {
    expect(isPlainOnchainTypedRecipient(`bitcoin:${BTC_ADDRESS}?lightning=lnbc1abc`)).toBe(false)
  })

  it('returns false for a BIP21 URI mixing a BTC address with an lnurl', () => {
    expect(isPlainOnchainTypedRecipient(`bitcoin:${BTC_ADDRESS}?lightning=lnurl1abc`)).toBe(false)
  })

  it('returns false for a BIP21 URI mixing a BTC address with an assetId', () => {
    expect(isPlainOnchainTypedRecipient(`bitcoin:${BTC_ADDRESS}?assetid=someasset`)).toBe(false)
  })

  it('returns false for an ark-only BIP21 URI', () => {
    expect(isPlainOnchainTypedRecipient(`bitcoin:?ark=${ARK_ADDRESS}`)).toBe(false)
  })

  it('returns false for a non-BIP21, non-address value', () => {
    expect(isPlainOnchainTypedRecipient('not a recipient at all')).toBe(false)
  })
})
