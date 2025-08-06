import { bech32, utf8 } from '@scure/base'

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
  } catch (e) {
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
    console.log('Fetching invoice for LNURL:', lnurl, 'with amount:', sats, 'and note:', note)
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
    console.log('Fetching Ark address for LNURL:', lnurl)
    const url = getCallbackUrl(lnurl) + '?method=ark'
    fetch(url)
      .then(checkResponse<ArkMethodResponse>)
      .then(resolve)
      .catch(reject)
  })
}
