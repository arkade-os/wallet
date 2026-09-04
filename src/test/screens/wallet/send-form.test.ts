import { describe, expect, it } from 'vitest'
import { isPlainOnchainTypedRecipient, onchainQuoteAfterAddressChange } from '../../../screens/Wallet/Send/Form'

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

describe('onchainQuoteAfterAddressChange', () => {
  /**
   * The navigate-back-retype bug. A negotiated quote is a fact about ONE
   * recipient — it carries their payout script, and the L1 claim it leads to
   * pays them — so a quote that survives an address change pays the PREVIOUS
   * recipient while the screen shows the new one.
   *
   * The sequence: quote for A, back from the sign screen, type B, continue.
   * Before this rule existed the quote stayed in `sendInfo`, the re-quote gate
   * saw one in hand and skipped, and the claim paid A.
   */
  const quote = { payoutAddress: BTC_ADDRESS, fundAmount: 5_000 } as never
  const OTHER = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

  it('drops the quote when the address changes', () => {
    expect(onchainQuoteAfterAddressChange({ address: BTC_ADDRESS, pendingOnchainSend: quote }, OTHER)).toBeUndefined()
  })

  it('keeps the quote when the address is unchanged', () => {
    // Not an unconditional clear: returning to the form without editing
    // anything must not burn the negotiation and re-leak the trade.
    expect(onchainQuoteAfterAddressChange({ address: BTC_ADDRESS, pendingOnchainSend: quote }, BTC_ADDRESS)).toBe(quote)
  })

  it('drops the quote when the address is cleared', () => {
    expect(
      onchainQuoteAfterAddressChange({ address: BTC_ADDRESS, pendingOnchainSend: quote }, undefined),
    ).toBeUndefined()
  })

  it('has nothing to keep when there was no quote', () => {
    expect(
      onchainQuoteAfterAddressChange({ address: BTC_ADDRESS, pendingOnchainSend: undefined }, OTHER),
    ).toBeUndefined()
  })
})
