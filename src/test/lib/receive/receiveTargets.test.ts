import { describe, expect, it } from 'vitest'
import { qrPart, receiveMethods, receiveParts, type ReceiveInputs } from '../../../lib/receive/receiveTargets'
import { encodeBitcoinLink } from '../../../lib/bip21'

const base: ReceiveInputs = {
  ark: 'ark1x',
  btc: 'bc1x',
  invoice: '',
  lnurl: 'LNURL1X',
  lightningAddress: 'alice@a.test',
  sats: 0,
  amountText: '',
  tokensOffered: true,
}
const withAmount: ReceiveInputs = { ...base, sats: 20_000, amountText: '20000', invoice: 'lnbc1x' }
const ids = (m: Parameters<typeof receiveParts>[0], i: ReceiveInputs) =>
  receiveParts(m, i).map((p) => `${p.id}=${p.value}`)

describe('encodeBitcoinLink', () => {
  it.each([
    [{ lightning: 'alice@a.test' }, 'bitcoin:?lightning=alice@a.test'],
    [{ lightning: 'lnbc1x', sats: 20_000 }, 'bitcoin:?lightning=lnbc1x'],
    [{ ark: 'ark1x', sats: 20_000 }, 'bitcoin:?ark=ark1x&amount=0.0002'],
    [{ address: 'bc1x' }, 'bitcoin:bc1x'],
    [{ address: 'bc1x', sats: 20_000 }, 'bitcoin:bc1x?amount=0.0002'],
  ])('%j encodes as %s', (opts, uri) => expect(encodeBitcoinLink(opts)).toBe(uri))
})

describe('receiveParts', () => {
  it('Lightning-address mode: the address with no amount, an invoice-only link with one', () => {
    expect(ids('lnaddress', base)).toEqual(['link=bitcoin:?lightning=alice@a.test', 'lnaddress=alice@a.test'])
    expect(ids('lnaddress', withAmount)).toEqual(['amount=20000', 'link=bitcoin:?lightning=lnbc1x', 'invoice=lnbc1x'])
  })

  it('never links an empty invoice while one is being minted', () => {
    expect(ids('lnaddress', { ...withAmount, invoice: '' })).toEqual(['amount=20000'])
  })

  it('Full details keeps every part, with the LNURL until an invoice exists', () => {
    expect(ids('full', base)).toEqual([
      'link=bitcoin:bc1x?ark=ark1x&lightning=LNURL1X',
      'lnurl=LNURL1X',
      'ark=ark1x',
      'btc=bc1x',
    ])
    expect(ids('full', withAmount)).toEqual([
      'amount=20000',
      'link=bitcoin:bc1x?ark=ark1x&lightning=lnbc1x&amount=0.0002',
      'invoice=lnbc1x',
      'ark=ark1x',
      'btc=bc1x',
    ])
  })

  it('Arkade and Bitcoin carry the amount in their link', () => {
    expect(ids('ark', withAmount)).toEqual(['amount=20000', 'link=bitcoin:?ark=ark1x&amount=0.0002', 'ark=ark1x'])
    expect(ids('btc', base)).toEqual(['link=bitcoin:bc1x', 'btc=bc1x'])
  })

  it('Lightning links the LNURL, or the address of a receiver without one, with no amount', () => {
    expect(ids('lightning', base)).toEqual(['link=lightning:LNURL1X', 'lnurl=LNURL1X', 'lnaddress=alice@a.test'])
    expect(ids('lightning', { ...base, lightningAddress: '' })).toEqual(['link=lightning:LNURL1X', 'lnurl=LNURL1X'])
    expect(ids('lightning', { ...base, lnurl: '' })).toEqual(['link=lightning:alice@a.test', 'lnaddress=alice@a.test'])
  })

  it('Lightning links the invoice with an amount, and has no link until it exists', () => {
    expect(ids('lightning', withAmount)).toEqual(['amount=20000', 'link=lightning:lnbc1x', 'invoice=lnbc1x'])
    expect(ids('lightning', { ...withAmount, invoice: '' })).toEqual(['amount=20000'])
  })

  it('a token quote shows its URI and deposit, and a bare Tron deposit has no link row', () => {
    const quote = { value: 'ethereum:0xt@42161/transfer?address=0xd&uint256=1', destination: '0xd', amount: '17.156' }
    expect(ids('token', { ...withAmount, quote })).toEqual(['amount=17.156', `link=${quote.value}`, 'deposit=0xd'])
    expect(ids('token', { ...withAmount, quote: { value: 'T9yD', destination: 'T9yD', amount: '17.156' } })).toEqual([
      'amount=17.156',
      'deposit=T9yD',
    ])
  })

  it('the amount row is copy-only', () => {
    expect(receiveParts('full', withAmount).find((p) => p.id === 'amount')?.selectable).toBe(false)
  })
})

describe('receiveMethods', () => {
  it('offers every method with an lnurl-server and tokens on', () => {
    expect(receiveMethods(base)).toEqual(['lnaddress', 'full', 'lightning', 'ark', 'btc', 'token'])
  })

  it('offers Lightning for a nameless LNURL, and for an amount whose invoice came without one', () => {
    expect(receiveMethods({ ...base, lightningAddress: '' })).toContain('lightning')
    expect(receiveMethods({ ...withAmount, lnurl: '', lightningAddress: '' })).toContain('lightning')
    expect(receiveMethods({ ...withAmount, lnurl: '', lightningAddress: '', invoice: '' })).not.toContain('lightning')
  })

  it('offers no Lightning address or stablecoins without an lnurl-server', () => {
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

describe('qrPart', () => {
  it('uses the remembered part, or falls back to the link when it is gone', () => {
    const parts = receiveParts('lnaddress', base)
    expect(qrPart(parts, 'lnaddress')?.id).toBe('lnaddress')
    expect(qrPart(receiveParts('full', base), 'lnaddress')?.id).toBe('link')
    expect(qrPart(parts)?.id).toBe('link')
  })

  it('falls back to the first selectable part when there is no link', () => {
    const tron = receiveParts('token', { ...withAmount, quote: { value: 'T9yD', destination: 'T9yD', amount: '1' } })
    expect(qrPart(tron, 'link')?.id).toBe('deposit')
  })
})
