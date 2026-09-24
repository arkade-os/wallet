import { toPayRequestUrl } from '@arkade-os/lnurl-client'
import { DecodedInvoice, decodeInvoice } from './bolt11'

// Everything the payer path needs now lives in @arkade-os/lnurl-client.
// What is left is fetchArkAddress, which calls the callback with ?method=ark —
// a parameter the Arkade lnurl-server does not implement, so the package has no
// equivalent by design. Removing it would be a behaviour change to whichever
// provider it does serve, so it stays until that is decided.

type ArkMethodResponse = {
  expiryDate: string
  address: string
  hint: string
}

const checkResponse = async <T = any>(response: Response): Promise<T> => {
  if (!response.ok) return Promise.reject(response)
  const data = await response.json()
  if (data.status === 'ERROR') return Promise.reject(data.reason || 'LNURL error')
  return data
}

// The client range-checks the amount but never decodes the invoice it returns (#1003).
export const checkLnUrlInvoice = (pr: string, sats: number): string => {
  let invoice: DecodedInvoice
  try {
    invoice = decodeInvoice(pr)
  } catch {
    throw new Error('Server returned an invalid invoice.')
  }
  if (invoice.milliSats !== Math.round(sats * 1000)) {
    throw new Error('Invoice amount does not match requested amount.')
  }
  return pr
}

export const fetchArkAddress = (lnurl: string): Promise<ArkMethodResponse> => {
  return new Promise<ArkMethodResponse>((resolve, reject) => {
    const url = toPayRequestUrl(lnurl).url + '?method=ark'
    fetch(url)
      .then(checkResponse<ArkMethodResponse>)
      .then(resolve)
      .catch(reject)
  })
}
