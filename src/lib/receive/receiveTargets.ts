import { encodeBitcoinLink } from '../bip21'

export type ReceiveMethod = 'lnaddress' | 'full' | 'ark' | 'btc' | 'token'
export type PartId = 'link' | 'lnaddress' | 'lnurl' | 'invoice' | 'ark' | 'btc' | 'amount' | 'deposit'
export interface ReceivePart {
  id: PartId
  value: string
  selectable: boolean
}
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
  amountText: string
  quote?: TokenQuoteInput
  tokensOffered: boolean
}

const part = (id: PartId, value: string, selectable = true): ReceivePart[] => (value ? [{ id, value, selectable }] : [])
const amountPart = (i: ReceiveInputs) => (i.sats > 0 ? part('amount', i.amountText, false) : [])

export function receiveMethods(i: ReceiveInputs): ReceiveMethod[] {
  return [
    i.lightningAddress ? 'lnaddress' : undefined,
    i.ark || i.btc ? 'full' : undefined,
    i.ark ? 'ark' : undefined,
    i.btc ? 'btc' : undefined,
    i.tokensOffered ? 'token' : undefined,
  ].filter((m): m is ReceiveMethod => Boolean(m))
}

export function receiveParts(method: ReceiveMethod, i: ReceiveInputs): ReceivePart[] {
  const amounted = i.sats > 0
  switch (method) {
    case 'lnaddress': {
      const lightning = amounted ? i.invoice : i.lightningAddress
      return [
        ...amountPart(i),
        ...(lightning ? part('link', encodeBitcoinLink({ lightning })) : []),
        ...(amounted ? part('invoice', i.invoice) : part('lnaddress', i.lightningAddress)),
      ]
    }
    case 'full': {
      const lightning = amounted ? i.invoice : i.lnurl
      return [
        ...amountPart(i),
        ...part('link', encodeBitcoinLink({ address: i.btc, ark: i.ark, lightning, sats: i.sats })),
        ...(amounted ? part('invoice', i.invoice) : part('lnurl', i.lnurl)),
        ...part('ark', i.ark),
        ...part('btc', i.btc),
      ]
    }
    case 'ark':
      return [...amountPart(i), ...part('link', encodeBitcoinLink({ ark: i.ark, sats: i.sats })), ...part('ark', i.ark)]
    case 'btc':
      return [
        ...amountPart(i),
        ...part('link', encodeBitcoinLink({ address: i.btc, sats: i.sats })),
        ...part('btc', i.btc),
      ]
    case 'token': {
      const q = i.quote
      if (!q) return []
      return [
        ...part('amount', q.amount, false),
        ...(q.value !== q.destination ? part('link', q.value) : []),
        ...part('deposit', q.destination),
      ]
    }
  }
}

export function qrPart(parts: ReceivePart[], remembered?: PartId): ReceivePart | undefined {
  const selectable = parts.filter((p) => p.selectable)
  return selectable.find((p) => p.id === remembered) ?? selectable.find((p) => p.id === 'link') ?? selectable[0]
}
