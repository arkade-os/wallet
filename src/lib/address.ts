import { bech32m } from '@scure/base'

export const decodeArkAddress = (addr: string) => {
  const decoded = bech32m.decodeUnsafe(addr, 300)
  if (!decoded) throw 'Error'
  const buf = bech32m.fromWords(decoded.words)
  return {
    aspKey: Buffer.from(buf.slice(0, 32)).toString('hex'),
    usrKey: Buffer.from(buf.slice(32)).toString('hex'),
  }
}

export const isArkAddress = (data: string): boolean => {
  return /^t*ark1/.test(data)
}

export const isBTCAddress = (data: string): boolean => {
  return /^bc1/.test(data) || /^tb1/.test(data) || /^bcrt1/.test(data)
}
