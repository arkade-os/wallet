import { encodeBitcoinLink } from '../bip21'

export type ReceiveMethod = 'full' | 'lnaddress' | 'lightning' | 'ark' | 'btc' | 'token'
/** Names what Copy puts on the clipboard; the copy button's test id is `${kind}-address-copy`. */
export type CopyKind = 'bip21' | 'lnaddress' | 'lnurl' | 'invoice' | 'ark' | 'btc' | 'token'
export interface TokenQuoteInput {
  value: string
  destination: string
  amount: string
}
export interface ReceiveInputs {
  ark: string
  btc: string
  invoice: string
  lnurl: string
  lightningAddress: string
  sats: number
  quote?: TokenQuoteInput
  tokensOffered: boolean
}
export interface ReceiveTarget {
  qr: string
  copy: string
  kind: CopyKind
}

export function receiveMethods(i: ReceiveInputs): ReceiveMethod[] {
  return [
    // One Lightning row: the address when there is one and no amount, else the invoice or the bare LNURL.
    i.lightningAddress && !(i.sats > 0) ? 'lnaddress' : undefined,
    i.ark || i.btc ? 'full' : undefined,
    (i.sats > 0 ? i.invoice : !i.lightningAddress && i.lnurl) ? 'lightning' : undefined,
    i.ark ? 'ark' : undefined,
    i.btc ? 'btc' : undefined,
    i.tokensOffered ? 'token' : undefined,
  ].filter((m): m is ReceiveMethod => Boolean(m))
}

/** What `method` puts in the QR and on the clipboard. Arkade and Bitcoin carry an amount only in their link;
 *  a token's QR is a payment URI that a wallet's address field rejects, so Copy takes the bare deposit. */
export function receiveTarget(method: ReceiveMethod, i: ReceiveInputs): ReceiveTarget | undefined {
  const sats = Math.max(i.sats, 0)
  const target = (qr: string, kind: CopyKind, copy = qr) => (qr && copy ? { qr, copy, kind } : undefined)
  switch (method) {
    case 'full': {
      if (!i.ark && !i.btc) return undefined
      const qr = encodeBitcoinLink({ address: i.btc, ark: i.ark, lightning: sats ? i.invoice : i.lnurl, sats })
      return target(qr, 'bip21')
    }
    // The unified address: one Lightning address whose server also pays out on Arkade and Bitcoin.
    case 'lnaddress':
      return sats
        ? undefined
        : target(encodeBitcoinLink({ lightning: i.lightningAddress }), 'lnaddress', i.lightningAddress)
    case 'lightning':
      if (sats) return target(i.invoice, 'invoice')
      return i.lnurl ? target(i.lnurl, 'lnurl') : target(i.lightningAddress, 'lnaddress')
    case 'ark':
      return i.ark ? target(sats ? encodeBitcoinLink({ ark: i.ark, sats }) : i.ark, 'ark') : undefined
    case 'btc':
      return i.btc ? target(sats ? encodeBitcoinLink({ address: i.btc, sats }) : i.btc, 'btc') : undefined
    case 'token':
      return i.quote ? target(i.quote.value, 'token', i.quote.destination) : undefined
  }
}
