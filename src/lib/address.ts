import { bech32m, hex } from '@scure/base'

export const decodeArkAddress = (addr: string) => {
  const decoded = bech32m.decodeUnsafe(addr, 300)
  if (!decoded) throw 'Error'
  const buf = bech32m.fromWords(decoded.words)
  return {
    aspKey: hex.encode(buf.slice(0, 32)),
    usrKey: hex.encode(buf.slice(32)),
  }
}

export const isArkAddress = (data: string): boolean => {
  return /^t*ark1/.test(data)
}

export const isBTCAddress = (data: string): boolean => {
  return /^bc1/.test(data) || /^tb1/.test(data) || /^bcrt1/.test(data)
}
