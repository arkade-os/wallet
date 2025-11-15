import { Identity } from '@arkade-os/sdk'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { bech32, hex, utf8 } from '@scure/base'

const emailRegex =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

type LnUrlResponse = {
  commentAllowed?: number
  callback: string
  minSendable: number
  maxSendable: number
  metadata: string
  transferAmounts?: {
    method: string
    available: boolean
  }[]
}

type ArkMethodResponse = {
  expiryDate: string
  address: string
  hint: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type LnUrlCallbackResponse = {
  pr: string
}

const checkResponse = <T = any>(response: Response): Promise<T> => {
  console.log('response', response)
  if (!response.ok) return Promise.reject(response)
  return response.json()
}

const checkLnUrlResponse = (amount: number, data: LnUrlResponse) => {
  if (amount < data.minSendable || amount > data.maxSendable) {
    throw new Error('Amount not in LNURL range.')
  }
  return data
}

const fetchLnUrlInvoice = async (amount: number, note: string, data: LnUrlResponse) => {
  let url = `${data.callback}?amount=${amount}`
  if (note) url += `&comment=${note}`
  const res = await fetch(url).then(checkResponse<LnUrlCallbackResponse>)
  return res.pr
}

const isValidBech32 = (data: string) => {
  try {
    bech32.decodeToBytes(data)
    return true
  } catch {
    return false
  }
}

const isLnUrl = (data: string) => {
  return data.toLowerCase().startsWith('lnurl') && isValidBech32(data)
}

const isLnAddress = (data: string) => {
  return data.includes('@') && emailRegex.test(data)
}

export const isValidLnUrl = (data: string): boolean => isLnUrl(data) || isLnAddress(data)

export const getCallbackUrl = (lnurl: string): string => {
  if (isLnAddress(lnurl)) {
    // Lightning address
    const urlsplit = lnurl.split('@')
    return `https://${urlsplit[1]}/.well-known/lnurlp/${urlsplit[0]}`
  }
  // LNURL
  const { bytes } = bech32.decodeToBytes(lnurl)
  return utf8.encode(bytes)
}

export const parseLoginLnUrl = (lnurl: string): { k1?: string; url: string } => {
  const { bytes } = bech32.decodeToBytes(lnurl)
  const url = utf8.encode(bytes)
  const queryParams = new URLSearchParams(url.split('?')[1])
  const tag = queryParams.get('tag')
  if (tag === 'login') {
    return { k1: queryParams.get('k1')!, url }
  }

  return { url }
}

export const loginLnUrl = async (lnurl: string, k1: string, identity: Identity): Promise<Response> => {
  const k1bytes = hex.decode(k1)
  const sig = await identity.signMessage(k1bytes, 'ecdsa')
  const key = await identity.compressedPublicKey()
  const url = new URL(lnurl)

  const derSigEncoding = secp256k1.Signature.fromBytes(sig).toHex('der')
  url.searchParams.delete('tag')
  url.searchParams.set('sig', derSigEncoding)
  url.searchParams.set('key', hex.encode(key))

  const targetUrl = url.toString()

  // if current page is localhost, use cors proxy
  if (window.location.hostname === 'localhost') {
    const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
    return fetch(corsProxyUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
  }

  return fetch(targetUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })
}

export const checkLnUrlConditions = (lnurl: string): Promise<LnUrlResponse> => {
  return new Promise<LnUrlResponse>((resolve, reject) => {
    const url = getCallbackUrl(lnurl)
    fetch(url)
      .then(checkResponse<LnUrlResponse>)
      .then(resolve)
      .catch(reject)
  })
}

export const fetchInvoice = (lnurl: string, sats: number, note: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const url = getCallbackUrl(lnurl)
    const amount = Math.round(sats * 1000) // millisatoshis
    fetch(url)
      .then(checkResponse<LnUrlResponse>)
      .then((data) => checkLnUrlResponse(amount, data))
      .then((data) => fetchLnUrlInvoice(amount, note, data))
      .then(resolve)
      .catch(reject)
  })
}

export const fetchArkAddress = (lnurl: string): Promise<ArkMethodResponse> => {
  return new Promise<ArkMethodResponse>((resolve, reject) => {
    const url = getCallbackUrl(lnurl) + '?method=ark'
    fetch(url)
      .then(checkResponse<ArkMethodResponse>)
      .then(resolve)
      .catch(reject)
  })
}
