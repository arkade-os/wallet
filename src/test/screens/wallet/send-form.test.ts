import { describe, expect, it } from 'vitest'
import { VerifyStatus } from '@branta-ops/branta'
import { brantaCard, isPlainOnchainTypedRecipient } from '../../../screens/Wallet/Send/Form'

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

  it('returns false for a BIP21 URI carrying branta_id and branta_secret', () => {
    expect(isPlainOnchainTypedRecipient(`bitcoin:${BTC_ADDRESS}?branta_id=abc&BRANTA_SECRET=def`)).toBe(false)
  })

  it('returns true for a BIP21 URI with only one branta param', () => {
    expect(isPlainOnchainTypedRecipient(`bitcoin:${BTC_ADDRESS}?branta_id=abc`)).toBe(true)
  })

  it('returns false for a non-BIP21, non-address value', () => {
    expect(isPlainOnchainTypedRecipient('not a recipient at all')).toBe(false)
  })
})

describe('brantaCard', () => {
  const VERIFY_URL = 'https://guardrail.branta.pro/v2/verify/abc'
  const payment = {
    destinations: [],
    platform: 'Acme Pay',
    platformLogoUrl: 'https://guardrail.branta.pro/logo.png',
    platformLogoLightUrl: 'https://guardrail.branta.pro/logo-light.png',
  }

  it('returns the first payment and the verify url for a match', () => {
    const result = { status: VerifyStatus.Match, payments: [payment], verifyUrl: VERIFY_URL }
    expect(brantaCard(result)).toEqual({ payment, verifyUrl: VERIFY_URL })
  })

  it.each([VerifyStatus.Unknown, VerifyStatus.Tampered, VerifyStatus.Incomplete])('returns null for %s', (status) => {
    expect(brantaCard({ status, verifyUrl: VERIFY_URL })).toBeNull()
  })

  it('drops logo and verify urls that are not https', () => {
    const result = {
      status: VerifyStatus.Match,
      payments: [
        { ...payment, platformLogoUrl: 'http://logo.test/a.png', platformLogoLightUrl: 'data:image/png;base64,AA' },
      ],
      verifyUrl: 'http://guardrail.branta.pro/v2/verify/abc',
    }
    const card = brantaCard(result)
    expect(card?.payment.platformLogoUrl).toBeUndefined()
    expect(card?.payment.platformLogoLightUrl).toBeUndefined()
    expect(card?.verifyUrl).toBeUndefined()
  })
})
