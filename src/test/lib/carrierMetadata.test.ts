import { expect, it } from 'vitest'
import { readCarrierActivity } from '../../lib/carrierMetadata'

const receipt = () => ({
  version: 1,
  mode: 'recycle',
  physicalSats: '660',
  loanSats: '330',
  purchasedSats: '330',
  receiptSats: '330',
  serviceFareSats: '7',
  taxi: { transferId: 'transfer-1' },
  state: 'claimed',
  txids: ['a'.repeat(64)],
})

it('keeps the borrowed carrier and hosted receipt distinct in history', () => {
  expect(readCarrierActivity(receipt())).toEqual(receipt())
})

it('keeps a purchased carrier with no loan or receipt reserve', () => {
  const purchased = { ...receipt(), mode: 'purchase', physicalSats: '330', loanSats: '0', receiptSats: '0' }
  expect(readCarrierActivity(purchased)).toEqual(purchased)
})

it.each([
  { unknown: 'field' },
  { loanSats: '0330' },
  { physicalSats: '2100000000000001' },
  { purchasedSats: '329' },
  { receiptSats: '0' },
  { txids: ['A'.repeat(64)] },
  { taxi: { transferId: '../other' } },
  { state: 'settled' },
])('drops malformed history metadata %j', (changes) => {
  expect(readCarrierActivity({ ...receipt(), ...changes })).toBeUndefined()
})
