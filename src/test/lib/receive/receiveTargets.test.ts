import { describe, expect, it } from 'vitest'
import {
  receiveMethods,
  receiveTarget,
  type ReceiveInputs,
  type ReceiveMethod,
} from '../../../lib/receive/receiveTargets'
import { encodeBitcoinLink } from '../../../lib/bip21'

const base: ReceiveInputs = {
  ark: 'ark1x',
  btc: 'bc1x',
  invoice: '',
  lnurl: 'LNURL1X',
  lightningAddress: 'alice@a.test',
  sats: 0,
  tokensOffered: true,
}
const withAmount: ReceiveInputs = { ...base, sats: 20_000, invoice: 'lnbc1x' }
const shows = (m: ReceiveMethod, i: ReceiveInputs) => {
  const target = receiveTarget(m, i)
  return target && [target.qr, target.copy, target.kind]
}

describe('encodeBitcoinLink', () => {
  it.each([
    [{ lightning: 'alice@a.test' }, 'bitcoin:?lightning=alice@a.test'],
    [{ lightning: 'lnbc1x', sats: 20_000 }, 'bitcoin:?lightning=lnbc1x'],
    [{ ark: 'ark1x', sats: 20_000 }, 'bitcoin:?ark=ark1x&amount=0.0002'],
    [{ address: 'bc1x' }, 'bitcoin:bc1x'],
    [{ address: 'bc1x', sats: 20_000 }, 'bitcoin:bc1x?amount=0.0002'],
  ])('%j encodes as %s', (opts, uri) => expect(encodeBitcoinLink(opts)).toBe(uri))
})

describe('receiveTarget', () => {
  it('Any wallet links every rail and copies that link', () => {
    const link = 'bitcoin:bc1x?ark=ark1x&lightning=LNURL1X'
    expect(shows('full', base)).toEqual([link, link, 'bip21'])
    expect(shows('full', { ...base, lightningAddress: '' })).toEqual([link, link, 'bip21'])
    const amounted = 'bitcoin:bc1x?ark=ark1x&lightning=lnbc1x&amount=0.0002'
    expect(shows('full', withAmount)).toEqual([amounted, amounted, 'bip21'])
  })

  it('Any wallet has nothing to show when neither Arkade nor Bitcoin is allowed', () => {
    expect(receiveTarget('full', { ...base, ark: '', btc: '' })).toBeUndefined()
  })

  it('Lightning address links the address alone, copies it bare, and gives way to an invoice', () => {
    expect(shows('lnaddress', base)).toEqual(['bitcoin:?lightning=alice@a.test', 'alice@a.test', 'lnaddress'])
    expect(receiveTarget('lnaddress', withAmount)).toBeUndefined()
  })

  it('Lightning shows the bare LNURL, address or invoice', () => {
    expect(shows('lightning', base)).toEqual(['LNURL1X', 'LNURL1X', 'lnurl'])
    expect(shows('lightning', { ...base, lnurl: '' })).toEqual(['alice@a.test', 'alice@a.test', 'lnaddress'])
    expect(shows('lightning', withAmount)).toEqual(['lnbc1x', 'lnbc1x', 'invoice'])
    expect(receiveTarget('lightning', { ...withAmount, invoice: '' })).toBeUndefined()
  })

  it('Arkade and Bitcoin show the bare address, and keep the amount in their link once one is set', () => {
    expect(shows('ark', base)).toEqual(['ark1x', 'ark1x', 'ark'])
    expect(shows('btc', base)).toEqual(['bc1x', 'bc1x', 'btc'])
    expect(shows('ark', withAmount)).toEqual([
      'bitcoin:?ark=ark1x&amount=0.0002',
      'bitcoin:?ark=ark1x&amount=0.0002',
      'ark',
    ])
    expect(shows('btc', withAmount)).toEqual(['bitcoin:bc1x?amount=0.0002', 'bitcoin:bc1x?amount=0.0002', 'btc'])
    expect(receiveTarget('ark', { ...withAmount, ark: '' })).toBeUndefined()
  })

  it('a token QR holds its payment URI while Copy takes the bare deposit', () => {
    const quote = { value: 'ethereum:0xt@42161/transfer?address=0xd&uint256=1', destination: '0xd', amount: '17.156' }
    expect(shows('token', { ...withAmount, quote })).toEqual([quote.value, '0xd', 'token'])
    expect(receiveTarget('token', withAmount)).toBeUndefined()
  })
})

describe('receiveMethods', () => {
  it('offers every method with an lnurl-server and tokens on', () => {
    expect(receiveMethods(base)).toEqual(['full', 'lnaddress', 'lightning', 'ark', 'btc', 'token'])
  })

  it('offers Lightning for a nameless LNURL, and for an amount whose invoice came without one', () => {
    expect(receiveMethods({ ...base, lightningAddress: '' })).toContain('lightning')
    expect(receiveMethods({ ...withAmount, lnurl: '', lightningAddress: '' })).toContain('lightning')
    expect(receiveMethods({ ...withAmount, lnurl: '', lightningAddress: '', invoice: '' })).not.toContain('lightning')
  })

  it('offers no Lightning or stablecoins without an lnurl-server', () => {
    expect(receiveMethods({ ...base, lnurl: '', lightningAddress: '', tokensOffered: false })).toEqual([
      'full',
      'ark',
      'btc',
    ])
  })

  it('respects the limits that blank an address', () => {
    expect(receiveMethods({ ...base, btc: '' })).not.toContain('btc')
  })
})
