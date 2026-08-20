import { describe, it, expect } from 'vitest'
import { InvoiceRejected, lockupSpenderTxid, toInvoiceFacts } from '../../lib/lnSwap'
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
})

describe('lockupSpenderTxid', () => {
  const swapPkScript = `5120${'ab'.repeat(32)}`
  const fundingTxid = 'funding-txid'
  const lockup = { fundingTxid, swapPkScript }
  const indexer = (vtxos: unknown[]) => ({ getVtxos: async () => ({ vtxos }) }) as never
  const covenant = (state: string, spend?: Record<string, string>) => ({
    script: swapPkScript,
    txid: fundingTxid,
    virtualStatus: { state },
    ...spend,
  })

  it('names the tx that spent the lockup', async () => {
    // Which spend it was is the manager's answer, off a hash-verified witness.
    // This only supplies the txid that answer does not carry.
    expect(await lockupSpenderTxid(indexer([covenant('spent', { arkTxId: 'spend-txid' })]), lockup)).toBe('spend-txid')
  })

  it('falls back to spentBy when the indexer names no ark txid', async () => {
    expect(await lockupSpenderTxid(indexer([covenant('spent', { spentBy: 'spend-txid' })]), lockup)).toBe('spend-txid')
  })

  it('has no answer while the lockup is unspent, or once it is swept', async () => {
    for (const state of ['settled', 'preconfirmed', 'swept']) {
      expect(await lockupSpenderTxid(indexer([covenant(state)]), lockup)).toBeUndefined()
    }
  })

  it('ignores a covenant funded by some other transaction', async () => {
    // Identical quotes derive the same address, so the script alone does not
    // identify this swap's deposit — only the funding txid does.
    const other = { ...covenant('spent', { arkTxId: 'spend-txid' }), txid: 'another-funding-txid' }
    expect(await lockupSpenderTxid(indexer([other]), lockup)).toBeUndefined()
  })
})
