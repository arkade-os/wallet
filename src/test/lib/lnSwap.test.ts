import { RFQ_TERMINAL_STATES } from '@arkade-os/swap'
import { describe, it, expect } from 'vitest'
import { InvoiceRejected, awaitLnSendOutcome, isRfqTerminal, lnSendSpender, toInvoiceFacts } from '../../lib/lnSwap'
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

  describe('isRfqTerminal', () => {
    it('is true for exactly the terminal set', () => {
      for (const state of RFQ_TERMINAL_STATES) expect(isRfqTerminal(state)).toBe(true)
      for (const state of ['quoted', 'funded', 'paying', '']) expect(isRfqTerminal(state)).toBe(false)
    })
  })
})

describe('lnSendSpender', () => {
  const swapPkScript = `5120${'ab'.repeat(32)}`
  const fundingTxid = 'funding-txid'
  const lockup = { fundingTxid, swapPkScript }
  const asTx = (redeemTxid: string) => ({ boardingTxid: '', redeemTxid, roundTxid: '' }) as never
  const indexer = (vtxos: unknown[]) => ({ getVtxos: async () => ({ vtxos }) }) as never
  const covenant = (state: string, spend?: Record<string, string>) => ({
    script: swapPkScript,
    txid: fundingTxid,
    virtualStatus: { state },
    ...spend,
  })

  it('reads a spend the wallet never signed as the solver claiming', async () => {
    // The claim pays the solver, so it cannot appear in our history — that
    // absence IS the evidence the invoice was paid.
    const spender = await lnSendSpender(indexer([covenant('spent', { arkTxId: 'claim-txid' })]), async () => [], lockup)
    expect(spender).toEqual({ spentTxid: 'claim-txid', outcome: 'completed' })
  })

  it('reads a spend that paid us as the refund', async () => {
    const spender = await lnSendSpender(
      indexer([covenant('spent', { arkTxId: 'refund-txid' })]),
      async () => [asTx('refund-txid')],
      lockup,
    )
    expect(spender).toEqual({ spentTxid: 'refund-txid', outcome: 'refunded' })
  })

  it('reads history only after the indexer has reported the spend', async () => {
    // Ordering is the whole safeguard: a history read issued afterwards sees
    // at least what the indexer just saw, so a refund cannot be missed and
    // read as a completed payment. A snapshot taken earlier could be.
    const seen: string[] = []
    await lnSendSpender(
      {
        getVtxos: async () => {
          seen.push('indexer')
          return { vtxos: [covenant('spent', { arkTxId: 'refund-txid' })] }
        },
      } as never,
      async () => {
        seen.push('history')
        return [asTx('refund-txid')]
      },
      lockup,
    )
    expect(seen).toEqual(['indexer', 'history'])
  })

  it('does not ask for history at all while there is no spend to classify', async () => {
    let asked = false
    await lnSendSpender(indexer([covenant('settled')]), async () => ((asked = true), []), lockup)
    expect(asked).toBe(false)
  })

  it('falls back to spentBy when the indexer names no ark txid', async () => {
    const spender = await lnSendSpender(indexer([covenant('spent', { spentBy: 'claim-txid' })]), async () => [], lockup)
    expect(spender?.spentTxid).toBe('claim-txid')
  })

  it('has no answer while the lockup is unspent, or once it is swept', async () => {
    for (const state of ['settled', 'preconfirmed', 'swept']) {
      expect(await lnSendSpender(indexer([covenant(state)]), async () => [], lockup)).toBeUndefined()
    }
  })

  it('ignores a covenant funded by some other transaction', async () => {
    // Identical quotes derive the same address, so the script alone does not
    // identify this swap's deposit — only the funding txid does.
    const other = { ...covenant('spent', { arkTxId: 'claim-txid' }), txid: 'another-funding-txid' }
    expect(await lnSendSpender(indexer([other]), async () => [], lockup)).toBeUndefined()
  })
})

describe('awaitLnSendOutcome', () => {
  const transport = (states: (string | null)[]) => {
    let i = 0
    return {
      requestQuote: async () => {
        throw new Error('unused')
      },
      status: async () => {
        const state = states[Math.min(i++, states.length - 1)]
        return state === null ? null : ({ v: 1, type: 'rfq_status', rfq_id: 'x', state, profile: {} } as never)
      },
      close: async () => {},
    }
  }
  const fast = { pollMs: 0, sleep: async () => {} }

  it('settles only on `settled`', async () => {
    const outcome = await awaitLnSendOutcome('x', transport(['funded', 'filling', 'settled']), fast)
    expect(outcome).toEqual({ kind: 'settled' })
  })

  it('reports a terminal non-settled state as failed, naming it', async () => {
    // The user funded a covenant; being told which way it ended is the
    // difference between "wait for the refund" and "try again".
    expect(await awaitLnSendOutcome('x', transport(['refunded']), fast)).toEqual({
      kind: 'failed',
      state: 'refunded',
    })
  })

  it('gives up as pending, never as failed', async () => {
    // The covenant is funded and refundable either way, so an unknown outcome
    // must not be presented as a failed payment.
    let clock = 0
    const outcome = await awaitLnSendOutcome('x', transport(['funded']), {
      ...fast,
      timeoutMs: 10,
      now: () => (clock += 6),
    })
    expect(outcome).toEqual({ kind: 'pending' })
  })

  it('keeps asking when a status lookup fails, rather than calling it a verdict', async () => {
    // A restarting solver answers nothing; that is not evidence the payment
    // failed, and the covenant is already funded.
    let calls = 0
    const flaky = {
      requestQuote: async () => {
        throw new Error('unused')
      },
      status: async () => {
        calls++
        if (calls < 3) throw new Error('connection reset')
        return { v: 1, type: 'rfq_status', rfq_id: 'x', state: 'settled', profile: {} } as never
      },
      close: async () => {},
    }
    expect(await awaitLnSendOutcome('x', flaky, fast)).toEqual({ kind: 'settled' })
    expect(calls).toBe(3)
  })
})
