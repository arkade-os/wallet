import { describe, it, expect } from 'vitest'
import { decodeInvoice, invoiceMatchesNetwork, isInvoiceExpired, isValidInvoice } from '../../lib/bolt11'
import fixtures from '../fixtures.json'

describe('bolt11 utilities', () => {
  const note = fixtures.lib.bolt11.note
  const invoice = fixtures.lib.bolt11.invoice
  const amountSats = fixtures.lib.bolt11.amountSats
  const paymentHash = fixtures.lib.bolt11.paymentHash
  // Same fixture set, but issued on regtest instead of mainnet.
  const regtestInvoice = fixtures.lib.bip21.invoice
  // Values carried by the fixtures themselves.
  const timestamp = 1734606755
  const expiry = 43200

  describe('decodeInvoice', () => {
    it('should decode valid invoice', () => {
      expect(decodeInvoice(invoice)).toBeDefined()
      expect(decodeInvoice(invoice).paymentHash).toBe(paymentHash)
      expect(decodeInvoice(invoice).amountSats).toBe(amountSats)
      expect(decodeInvoice(invoice).note).toBe(note)
    })

    it('should handle decode errors', () => {
      expect(() => decodeInvoice('invalid')).toThrow('Not a proper lightning payment request')
    })
  })

  describe('isValidInvoice', () => {
    it('should return true for valid invoice', () => {
      expect(isValidInvoice(invoice)).toBe(true)
    })

    it('should return false for invalid invoice', () => {
      expect(isValidInvoice('invalid')).toBe(false)
    })
  })

  describe('timestamp and expiry', () => {
    it('should expose the creation timestamp', () => {
      expect(decodeInvoice(invoice).timestamp).toBe(timestamp)
    })

    it('should expose absolute expiry as timestamp + expiry', () => {
      const decoded = decodeInvoice(invoice)
      expect(decoded.expiry).toBe(expiry)
      expect(decoded.expiresAt).toBe(timestamp + expiry)
    })

    it('should report an invoice as live one second before it expires', () => {
      const decoded = decodeInvoice(invoice)
      expect(isInvoiceExpired(decoded, decoded.expiresAt - 1)).toBe(false)
    })

    it('should report an invoice as expired at and after its expiry', () => {
      const decoded = decodeInvoice(invoice)
      expect(isInvoiceExpired(decoded, decoded.expiresAt)).toBe(true)
      expect(isInvoiceExpired(decoded, decoded.expiresAt + 1)).toBe(true)
    })

    it('should treat an invoice with no timestamp as expired', () => {
      const decoded = { ...decodeInvoice(invoice), timestamp: 0 }
      expect(isInvoiceExpired(decoded, 0)).toBe(true)
    })
  })

  describe('network', () => {
    it('should expose the bech32 prefix of a mainnet invoice', () => {
      expect(decodeInvoice(invoice).network).toBe('bc')
    })

    it('should expose the bech32 prefix of a regtest invoice', () => {
      expect(decodeInvoice(regtestInvoice).network).toBe('bcrt')
    })

    it('should match an invoice against its own network', () => {
      expect(invoiceMatchesNetwork(decodeInvoice(invoice), 'bitcoin')).toBe(true)
      expect(invoiceMatchesNetwork(decodeInvoice(regtestInvoice), 'regtest')).toBe(true)
    })

    it('should reject an invoice issued for another network', () => {
      expect(invoiceMatchesNetwork(decodeInvoice(invoice), 'regtest')).toBe(false)
      expect(invoiceMatchesNetwork(decodeInvoice(regtestInvoice), 'bitcoin')).toBe(false)
      expect(invoiceMatchesNetwork(decodeInvoice(regtestInvoice), 'mutinynet')).toBe(false)
    })

    it('should treat signet and mutinynet as the same lightning chain', () => {
      // Both are plain signet on the Lightning side, so neither can be told
      // apart from a BOLT11 prefix alone.
      const signet = { ...decodeInvoice(invoice), network: 'tbs' }
      expect(invoiceMatchesNetwork(signet, 'signet')).toBe(true)
      expect(invoiceMatchesNetwork(signet, 'mutinynet')).toBe(true)
      expect(invoiceMatchesNetwork(signet, 'testnet')).toBe(false)
    })
  })
})
