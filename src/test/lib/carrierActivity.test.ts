import { describe, expect, it } from 'vitest'
import {
  carrierBorrowedLabel,
  carrierDeliveryLabel,
  carrierPurchasedLiteralLabel,
  carrierPurchasedReceiptLabel,
  carrierServiceFareLabel,
  formatCarrierSats,
  hasTaxiCarrier,
  readCarrierActivity,
  type CarrierActivity,
} from '../../lib/carrierActivity'

const TXID_A = 'a'.repeat(64)
const TXID_B = 'b'.repeat(64)

/** Recycle329/receipt1: the worked example from the contract. */
const recycle = (over: Partial<Record<string, unknown>> = {}): Record<string, unknown> => ({
  version: 1,
  mode: 'recycle',
  physicalSats: '330',
  loanSats: '329',
  purchasedSats: '1',
  receiptSats: '1',
  serviceFareSats: '0',
  state: 'claimable',
  txids: [TXID_A],
  ...over,
})

const purchase = (over: Partial<Record<string, unknown>> = {}): Record<string, unknown> => ({
  version: 1,
  mode: 'purchase',
  physicalSats: '330',
  loanSats: '0',
  purchasedSats: '330',
  receiptSats: '0',
  serviceFareSats: '0',
  state: 'claimed',
  txids: [TXID_B],
  ...over,
})

describe('readCarrierActivity', () => {
  it('reads a recycle descriptor, keeping every amount canonical', () => {
    const carrier = readCarrierActivity(recycle({ taxi: { transferId: 'advance-1' } }))

    expect(carrier).toEqual({
      version: 1,
      mode: 'recycle',
      physicalSats: '330',
      loanSats: '329',
      purchasedSats: '1',
      receiptSats: '1',
      serviceFareSats: '0',
      taxi: { transferId: 'advance-1' },
      state: 'claimable',
      txids: [TXID_A],
    })
  })

  it('reads a purchase descriptor, which bought the whole carrier', () => {
    expect(readCarrierActivity(purchase())).toMatchObject({
      mode: 'purchase',
      purchasedSats: '330',
      loanSats: '0',
      receiptSats: '0',
    })
  })

  it('keeps a large amount exact — it never passes through Number', () => {
    // 21,000,000 BTC in sats, past Number.MAX_SAFE_INTEGER
    const huge = '2100000000000000'
    const carrier = readCarrierActivity(purchase({ physicalSats: huge, purchasedSats: huge }))

    expect(carrier?.physicalSats).toBe(huge)
    expect(formatCarrierSats(carrier!.purchasedSats)).toBe('2,100,000,000,000,000')
  })

  it.each([
    ['a missing descriptor', undefined],
    ['a non-object', 'carrier'],
    ['an unknown version', recycle({ version: 2 })],
    ['a zero version', recycle({ version: 0 })],
    ['an unknown mode', recycle({ mode: 'borrow' })],
    ['an unknown state', recycle({ state: 'settled' })],
    ['a non-string amount', recycle({ physicalSats: 330 })],
    ['a negative amount', recycle({ loanSats: '-1' })],
    ['a leading-zero amount', recycle({ physicalSats: '0330' })],
    ['a decimal amount', recycle({ physicalSats: '330.5' })],
    ['an empty amount', recycle({ loanSats: '' })],
    ['an amount past the supply', recycle({ physicalSats: '2100000000000001', loanSats: '1', purchasedSats: '1' })],
    ['a doubled-zero string', recycle({ serviceFareSats: '00' })],
    ['txids that are not a list', recycle({ txids: 'a'.repeat(64) })],
    ['an uppercase txid', recycle({ txids: [TXID_A.toUpperCase()] })],
    ['a short txid', recycle({ txids: ['abc'] })],
    ['a non-hex txid', recycle({ txids: ['z'.repeat(64)] })],
    ['an empty transferId', recycle({ taxi: { transferId: '' } })],
    ['a non-string transferId', recycle({ taxi: { transferId: 7 } })],
    ['an overly long transferId', recycle({ taxi: { transferId: 'x'.repeat(129) } })],
    ['a whitespace transferId', recycle({ taxi: { transferId: '   ' } })],
    ['a padded transferId', recycle({ taxi: { transferId: ' advance-1 ' } })],
    ['a non-canonical transferId', recycle({ taxi: { transferId: 'advance/1' } })],
    ['a non-object taxi', recycle({ taxi: 'advance-1' })],
    ['a taxi carrying an unknown field', recycle({ taxi: { transferId: 'advance-1', extra: true } })],
    ['an unknown top-level field', recycle({ extra: 'x' })],
  ])('ignores %s', (_label, value) => {
    expect(readCarrierActivity(value)).toBeUndefined()
  })

  it.each([
    ['a loan and receipt that do not add up to the carrier', { loanSats: '328' }],
    ['a zero loan', { loanSats: '0', purchasedSats: '1' }],
    ['a zero receipt', { receiptSats: '0', purchasedSats: '0' }],
    ['a purchased amount that is not the receipt', { purchasedSats: '2' }],
  ])('ignores recycle %s', (_label, over) => {
    expect(readCarrierActivity(recycle(over))).toBeUndefined()
  })

  it.each([
    ['a nonzero loan', { loanSats: '1', purchasedSats: '329' }],
    ['a nonzero receipt', { receiptSats: '1', purchasedSats: '329' }],
    ['a purchased amount that is not the carrier', { purchasedSats: '329' }],
  ])('ignores purchase %s', (_label, over) => {
    expect(readCarrierActivity(purchase(over))).toBeUndefined()
  })

  it('ignores a malformed descriptor without hiding the operation it belonged to', () => {
    expect(readCarrierActivity({ version: 1, mode: 'recycle' })).toBeUndefined()
  })
})

describe('hasTaxiCarrier', () => {
  it('is true only for real Taxi', () => {
    expect(hasTaxiCarrier(readCarrierActivity(recycle({ taxi: { transferId: 'advance-1' } })))).toBe(true)
  })

  it('is false for a direct solver purchase, which gets no badge', () => {
    expect(hasTaxiCarrier(readCarrierActivity(purchase()))).toBe(false)
    expect(hasTaxiCarrier(undefined)).toBe(false)
  })
})

describe('carrier receipt copy', () => {
  const carrier = (over: Partial<CarrierActivity> = {}): CarrierActivity =>
    readCarrierActivity(recycle(over)) as CarrierActivity

  it('separates borrowed from bought, so recycle329/receipt1 is not zero sats bought', () => {
    expect(carrierBorrowedLabel(carrier())).toBe('Borrowed 329 sats')
    expect(carrierPurchasedReceiptLabel(carrier())).toBe('1 sat (receipt reserve)')
  })

  it('names the whole carrier as bought on a purchase', () => {
    expect(carrierPurchasedLiteralLabel(readCarrierActivity(purchase()) as CarrierActivity)).toBe('330 sats')
  })

  it('keeps the service fare its own figure', () => {
    expect(carrierServiceFareLabel(carrier({ serviceFareSats: '1' }))).toBe('1 sat')
    expect(carrierServiceFareLabel(carrier())).toBe('0 sats')
  })

  it('names every delivery state, with receipt spelled out as merge-only', () => {
    const states = ['pending', 'claimable', 'claimed', 'receipt', 'cancelled', 'failed'] as const

    expect(states.map((state) => carrierDeliveryLabel(carrier({ state })))).toEqual([
      'Pending',
      'Claimable',
      'Claimed',
      'Merge-only receipt',
      'Cancelled',
      'Failed',
    ])
  })
})
