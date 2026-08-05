import { describe, it, expect } from 'vitest'
import { InvoiceRejected, isRfqTerminal, rfqStatusUI, toInvoiceFacts, type SwapStatusUI } from '../../lib/lnSwap'
import { RFQ_TERMINAL_STATES } from '../../lib/arkadeSwap/rfq'
import fixtures from '../fixtures.json'

describe('lnSwap', () => {
  const invoice = fixtures.lib.bolt11.invoice
  const amountSats = fixtures.lib.bolt11.amountSats
  const paymentHash = fixtures.lib.bolt11.paymentHash
  // Same amount, issued on regtest instead of mainnet.
  const regtestInvoice = fixtures.lib.bip21.invoice
  // Carried by the mainnet fixture itself.
  const timestamp = 1734606755
  const expiry = 43200
  const expiresAt = timestamp + expiry
  // Comfortably inside the invoice's live window.
  const whileLive = timestamp + 1

  describe('toInvoiceFacts', () => {
    it('carries the absolute expiry the swap client gates on', () => {
      const facts = toInvoiceFacts(invoice, 'bitcoin', whileLive)
      expect(facts).toEqual({ raw: invoice, paymentHash, amountSats, expiresAt })
    })

    it('rejects an invoice issued for another chain', () => {
      // The mainnet fixture against regtest: quoting this would price the swap
      // against the wrong asset entirely, so it must never reach a solver.
      expect(() => toInvoiceFacts(invoice, 'regtest', whileLive)).toThrowError(InvoiceRejected)
      try {
        toInvoiceFacts(invoice, 'regtest', whileLive)
      } catch (e) {
        expect((e as InvoiceRejected).reason).toBe('wrong_network')
      }
    })

    it('accepts the regtest fixture on regtest', () => {
      expect(toInvoiceFacts(regtestInvoice, 'regtest', 0).raw).toBe(regtestInvoice)
    })

    it('rejects an expired invoice', () => {
      try {
        toInvoiceFacts(invoice, 'bitcoin', expiresAt)
        expect.unreachable('expired invoice was accepted')
      } catch (e) {
        expect((e as InvoiceRejected).reason).toBe('expired')
      }
    })

    it('accepts one second before expiry and rejects at it', () => {
      // Pins the boundary: the client's own gate uses >= too, so an off-by-one
      // here would let the wallet hand over an invoice the client then refuses.
      expect(() => toInvoiceFacts(invoice, 'bitcoin', expiresAt - 1)).not.toThrow()
      expect(() => toInvoiceFacts(invoice, 'bitcoin', expiresAt)).toThrowError(InvoiceRejected)
    })

    it('rejects a string that is not an invoice', () => {
      try {
        toInvoiceFacts('not-an-invoice', 'bitcoin', whileLive)
        expect.unreachable('garbage was accepted')
      } catch (e) {
        expect((e as InvoiceRejected).reason).toBe('unparseable')
      }
    })
  })

  describe('rfqStatusUI', () => {
    it('maps every terminal state explicitly', () => {
      const expected: Record<string, SwapStatusUI> = {
        settled: 'Successful',
        refused: 'Failed',
        expired: 'Failed',
        refunded: 'Refunded',
        stuck: 'Failed',
      }
      // Driven off the client's own tuple: if it gains a state, this fails.
      for (const state of RFQ_TERMINAL_STATES) {
        expect(rfqStatusUI(state)).toBe(expected[state])
      }
      expect(Object.keys(expected).sort()).toEqual([...RFQ_TERMINAL_STATES].sort())
    })

    it('reads any non-terminal state as still running', () => {
      // The solver owns the intermediate names and may add to them; an unknown
      // one must render as in-flight rather than as a spurious failure.
      for (const state of ['quoted', 'funded', 'paying', 'a_state_invented_later', '']) {
        expect(rfqStatusUI(state)).toBe('Pending')
      }
    })

    it('does not treat a terminal state as pending', () => {
      for (const state of RFQ_TERMINAL_STATES) {
        expect(rfqStatusUI(state)).not.toBe('Pending')
      }
    })
  })

  describe('isRfqTerminal', () => {
    it('is true for exactly the terminal set', () => {
      for (const state of RFQ_TERMINAL_STATES) expect(isRfqTerminal(state)).toBe(true)
      for (const state of ['quoted', 'funded', 'paying', '']) expect(isRfqTerminal(state)).toBe(false)
    })
  })
})
