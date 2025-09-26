import bolt11 from 'light-bolt11-decoder'

export interface DecodedInvoice {
  note: string
  expiry: number
  amountSats: number
  paymentHash: string
}

const extractNote = (data: string): string => {
  if (!/^\[/.test(data)) return data
  try {
    return JSON.parse(data)[0][1]
  } catch {
    return ''
  }
}

export const decodeInvoice = (invoice: string): DecodedInvoice => {
  const decoded = bolt11.decode(invoice)
  const millisats = Number(decoded.sections.find((s) => s.name === 'amount')?.value ?? '0')
  const description = decoded.sections.find((s) => s.name === 'description')?.value ?? ''
  return {
    expiry: decoded.expiry ?? 3600,
    note: extractNote(description),
    amountSats: Math.floor(millisats / 1000),
    paymentHash: decoded.sections.find((s) => s.name === 'payment_hash')?.value ?? '',
  }
}

export const isValidInvoice = (data: string): boolean => {
  try {
    decodeInvoice(data)
    return true
  } catch {
    return false
  }
}
