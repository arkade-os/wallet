// BOLT12 Offer handling via Boltz API

export interface Bolt12InvoiceResponse {
  invoice: string
}

/**
 * Checks if a string is a BOLT12 offer
 * BOLT12 offers use the "lno1" prefix (Lightning Network Offer)
 */
export const isBolt12Offer = (data: string): boolean => {
  return data.toLowerCase().startsWith('lno1')
}

/**
 * Fetches a BOLT12 invoice from an offer via Boltz API
 * @param offer - BOLT12 offer string (lno1...)
 * @param amount - Amount in satoshis (optional, depends on offer)
 * @param apiUrl - Boltz API URL
 * @returns BOLT11 invoice string
 */
export const fetchBolt12Invoice = async (
  offer: string,
  amount: number | undefined,
  apiUrl: string,
): Promise<string> => {
  const endpoint = `${apiUrl}/v2/swap/bolt12`

  const body: { offer: string; amount?: number } = { offer }
  if (amount) {
    body.amount = amount
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch BOLT12 invoice: ${error}`)
  }

  const data: Bolt12InvoiceResponse = await response.json()

  if (!data.invoice) {
    throw new Error('No invoice returned from BOLT12 offer')
  }

  return data.invoice
}
