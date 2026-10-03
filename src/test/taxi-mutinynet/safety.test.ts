import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertNoSecrets, reserveFunding } from './safety'

describe('live run safety', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('reserves the complete budget before any send and never permits overspending', () => {
    const alice = reserveFunding(0, 3_000)
    const bob = reserveFunding(alice, 1_500)
    expect(reserveFunding(bob, 500)).toBe(5_000)
    for (const [total, amount] of [
      [5_000, 1],
      [0, 5_001],
      [0, 0],
      [0, -1],
      [0, 1.5],
      [-1, 1],
    ])
      expect(() => reserveFunding(total, amount)).toThrow()
  })

  it('allows public evidence and rejects secret values and sensitive fields', () => {
    expect(() => assertNoSecrets({ transferId: 'abc', sats: '100' }, ['private phrase'])).not.toThrow()
    for (const value of [{ note: 'private phrase' }, { note: 'private%20phrase' }, { privateKey: 'abc' }])
      expect(() => assertNoSecrets(value, ['private phrase'])).toThrow('Refusing to write evidence')
  })

  it('rejects JSON-escaped credentials in evidence and errors', () => {
    for (const secret of ['fake"password', 'fake\\password', 'fake\npassword']) {
      expect(() => assertNoSecrets({ note: secret }, [secret])).toThrow('Refusing to write evidence')
      expect(() => assertNoSecrets({ message: `Request failed: ${secret}` }, [secret])).toThrow()
    }
  })

  it('allows a public Taxi URL when the admin username is generic and rejects combined credentials', () => {
    vi.stubEnv('TAXI_ADMIN_USER', 'taxi')
    vi.stubEnv('TAXI_ADMIN_PASS', 'private-test-pass')
    expect(() => assertNoSecrets({ url: 'https://taxi.example.test' })).not.toThrow()
    expect(() => assertNoSecrets({ note: 'private-test-pass' }, ['fresh actor phrase'])).toThrow()
    expect(() => assertNoSecrets({ note: 'fresh actor phrase' }, ['fresh actor phrase'])).toThrow()
    for (const note of ['taxi:private-test-pass', Buffer.from('taxi:private-test-pass').toString('base64')])
      expect(() => assertNoSecrets({ note })).toThrow('Refusing to write evidence')
  })
})
