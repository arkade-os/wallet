import { describe, expect, it } from 'vitest'
import { extractError } from '../../lib/error'

describe('extractError', () => {
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
})
