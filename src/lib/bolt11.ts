import bolt11 from 'light-bolt11-decoder'

export interface DecodedInvoice {
  expiry: number
  amountSats: number
  description: string
  paymentHash: string
}

export const decodeInvoice = (invoice: string): DecodedInvoice => {
  const decoded = bolt11.decode(invoice)
  const millisats = Number(decoded.sections.find((s) => s.name === 'amount')?.value ?? '0')
  return {
    expiry: decoded.expiry ?? 3600,
    amountSats: Math.floor(millisats / 1000),
    description: decoded.sections.find((s) => s.name === 'description')?.value ?? '',
    paymentHash: decoded.sections.find((s) => s.name === 'payment_hash')?.value ?? '',
  }
}
