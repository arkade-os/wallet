import { describe, it, expect } from 'vitest'
import { decodeInvoice, isValidInvoice } from '../../lib/bolt11'
import fixtures from '../fixtures.json'

describe('bolt11 utilities', () => {
  const note = fixtures.lib.bolt11.note
  const invoice = fixtures.lib.bolt11.invoice
  const amountSats = fixtures.lib.bolt11.amountSats
  const paymentHash = fixtures.lib.bolt11.paymentHash

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
})
