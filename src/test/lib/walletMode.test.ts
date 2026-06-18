import { describe, expect, it } from 'vitest'
import { resolveWalletMode } from '../../lib/walletMode'

describe('resolveWalletMode', () => {
  it('honors a requested hd mode for mnemonics', () => {
    expect(resolveWalletMode({ hasMnemonic: true, requested: 'hd', persisted: 'static' })).toBe('hd')
  })

  it('defaults to static for mnemonics with no request and no persisted mode', () => {
    expect(resolveWalletMode({ hasMnemonic: true })).toBe('static')
  })

  it('forces static for non-HD identities even when hd is requested (SingleKey guard)', () => {
    expect(resolveWalletMode({ hasMnemonic: false, requested: 'hd' })).toBe('static')
  })
})
