import bolt11 from 'light-bolt11-decoder'
import { NetworkName } from '@arkade-os/sdk/'

export interface DecodedInvoice {
  note: string
  expiry: number
  amountSats: number
  paymentHash: string
  /** Invoice creation time, in unix seconds. */
  timestamp: number
  /** Absolute expiry (timestamp + expiry), in unix seconds. */
  expiresAt: number
  /** bech32 prefix of the invoice: 'bc' | 'tb' | 'tbs' | 'bcrt', or '' when absent. */
  network: string
}

// BOLT11 carries the chain as a bech32 prefix, which is coarser than the Ark
// network list: signet and mutinynet are both plain signet on the Lightning
// side and share the 'tbs' prefix, so both map onto it.
const NETWORK_PREFIXES: Record<NetworkName, string> = {
  bitcoin: 'bc',
  testnet: 'tb',
  signet: 'tbs',
  mutinynet: 'tbs',
  regtest: 'bcrt',
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
  const timestampSection = decoded.sections.find((s) => s.name === 'timestamp')
  const networkSection = decoded.sections.find((s) => s.name === 'coin_network')
  const expiry = decoded.expiry ?? 3600
  const timestamp = typeof timestampSection?.value === 'number' ? timestampSection.value : 0
  return {
    expiry,
    timestamp,
    expiresAt: timestamp + expiry,
    network: networkSection && 'value' in networkSection ? (networkSection.value?.bech32 ?? '') : '',
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

/**
 * True when the invoice is past its absolute expiry.
 *
 * An invoice with no parseable timestamp is treated as expired: we cannot prove
 * it is still live, and paying an expired invoice loses the funds.
 */
export const isInvoiceExpired = (invoice: DecodedInvoice, nowSeconds = Math.floor(Date.now() / 1000)): boolean => {
  if (!invoice.timestamp) return true
  return nowSeconds >= invoice.expiresAt
}

/** True when the invoice was issued for the given Ark network. */
export const invoiceMatchesNetwork = (invoice: DecodedInvoice, network: NetworkName): boolean =>
  invoice.network === NETWORK_PREFIXES[network]
