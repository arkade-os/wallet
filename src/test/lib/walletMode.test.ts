import { describe, expect, it } from 'vitest'
import { resolveWalletMode } from '../../lib/walletMode'

describe('resolveWalletMode', () => {
  it('honors a requested hd mode for mnemonics', () => {
    expect(resolveWalletMode({ hasMnemonic: true, requested: 'hd' })).toBe('hd')
  })

  it('inherits a persisted hd mode when nothing is requested (unlock / untouched restore)', () => {
    expect(resolveWalletMode({ hasMnemonic: true, persisted: 'hd' })).toBe('hd')
  })

  it('lets an explicit request override the persisted mode', () => {
    expect(resolveWalletMode({ hasMnemonic: true, requested: 'static', persisted: 'hd' })).toBe('static')
  })

  it('defaults to static for mnemonics with no request and no persisted mode', () => {
    expect(resolveWalletMode({ hasMnemonic: true })).toBe('static')
  })

  it('forces static for non-HD identities even when hd is requested (SingleKey guard)', () => {
    expect(resolveWalletMode({ hasMnemonic: false, requested: 'hd' })).toBe('static')
  })
})
