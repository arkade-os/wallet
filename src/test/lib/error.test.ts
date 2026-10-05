import { describe, expect, it } from 'vitest'
import { extractError } from '../../lib/error'
import { TaxiError } from '@arkade-taxi/client'

describe('extractError', () => {
  it('identifies a Taxi funding refusal by its stable code instead of blaming the payer', () => {
    expect(extractError(new TaxiError('operator_inventory_insufficient', 'changed server detail'))).toBe(
      "Taxi can't fund this payment from its available coins while keeping its reserve. Your wallet balance is not the issue.",
    )
    expect(
      extractError({ response: { data: { code: 'operator_inventory_insufficient', error: 'server detail' } } }),
    ).toBe(
      "Taxi can't fund this payment from its available coins while keeping its reserve. Your wallet balance is not the issue.",
    )
  })

  it('explains legacy Taxi funding messages without remapping ordinary insufficient funds', () => {
    expect(extractError('insufficient compatible safe inventory after reservations and reserve')).toBe(
      "Taxi can't fund this payment from its available coins while keeping its reserve. Your wallet balance is not the issue.",
    )
    expect(extractError(new Error('Insufficient funds'))).toBe('Insufficient funds')
  })

  it('keeps valid known mappings for plain string messages', () => {
    expect(extractError('already unrolled')).toBe(
      'Your funds were recently settled onchain — please try again in a few hours',
    )
  })

  it('does not treat empty JSON message capture as a mapped message', () => {
    expect(extractError({ message: '{"message":""}' })).toBe('{"message":""}')
  })

  it('only maps response.data.error when it is a string', () => {
    expect(extractError({ response: { data: { error: 'unrolled vtxo' } } })).toBe(
      'Your funds were recently settled onchain — please try again in a few hours',
    )

    expect(extractError({ response: { data: { error: { message: 'unrolled vtxo' } } } })).toBe(
      '{"response":{"data":{"error":{"message":"unrolled vtxo"}}}}',
    )
  })

  it('formats 3600-second settlement wait correctly', () => {
    expect(extractError('vtxo script can be used for intent registration in 3600 seconds')).toBe(
      'Your funds were recently settled onchain — please try again in 1 hour',
    )
  })

  it('formats sub-hour settlement wait correctly', () => {
    expect(extractError('vtxo script can be used for intent registration in 1800 seconds')).toBe(
      'Your funds were recently settled onchain — please try again in 30 minutes',
    )
  })

  it('falls back to "shortly" when server reports 0 seconds', () => {
    expect(extractError('vtxo script can be used for intent registration in 0 seconds')).toBe(
      'Your funds were recently settled onchain — please try again shortly',
    )
  })
})
