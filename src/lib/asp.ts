import { consoleError, consoleLog } from './logs'
import { invalidNpub } from './privateKey'
import { Addresses, Satoshis, Tx, Vtxo, Vtxos } from './types'

export interface AspInfo {
  boardingDescriptorTemplate: string
  code?: number
  dust: number
  forfeitAddress: string
  network: string
  pubkey: string
  roundInterval: number
  unilateralExitDelay: number
  unreachable: boolean
  url: string
  vtxoTreeExpiry: number
  marketHour: {
    nextStartTime: number
    nextEndTime: number
    period: number
    roundInterval: number
  }
}

export const emptyAspInfo: AspInfo = {
  boardingDescriptorTemplate: '',
  dust: 0,
  forfeitAddress: '',
  network: '',
  pubkey: '',
  roundInterval: 0,
  unilateralExitDelay: 0,
  unreachable: false,
  url: '',
  vtxoTreeExpiry: 0,
  marketHour: {
    nextStartTime: 0,
    nextEndTime: 0,
    period: 0,
    roundInterval: 0,
  },
}

export interface MarketHour {
  startTime: number
  duration: number
  period: number
}

const headers = { 'Content-Type': 'application/json' }

const get = async (endpoint: string, url: string) => {
  const response = await fetch(url + endpoint, { headers })
  return await response.json()
}

export const collaborativeExit = async (amount: number, address: string): Promise<string> => {
  return await window.collaborativeExit(address, amount, false)
}

export const getAspInfo = async (url: string): Promise<AspInfo> => {
  return new Promise((resolve) => {
    let fullUrl = url
    if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) fullUrl = 'http://' + url
    else if (!url.startsWith('http')) fullUrl = 'https://' + url
    get('/v1/info', fullUrl)
      .then((info: AspInfo) => {
        if (info?.code === 5) {
          consoleError('invalid response from server')
          resolve({ ...emptyAspInfo, unreachable: true })
        }
        const {
          boardingDescriptorTemplate,
          dust,
          forfeitAddress,
          network,
          pubkey,
          roundInterval,
          unilateralExitDelay,
          vtxoTreeExpiry,
          marketHour,
        } = info
        resolve({
          boardingDescriptorTemplate,
          dust: Number(dust),
          forfeitAddress,
          network,
          pubkey,
          roundInterval: Number(roundInterval),
          unilateralExitDelay: Number(unilateralExitDelay),
          unreachable: false,
          url: fullUrl,
          vtxoTreeExpiry: Number(vtxoTreeExpiry ?? '0'),
          marketHour: {
            nextStartTime: Number(marketHour.nextStartTime),
            nextEndTime: Number(marketHour.nextEndTime),
            period: Number(marketHour.period),
            roundInterval: Number(marketHour.roundInterval),
          },
        })
      })
      .catch((err) => {
        consoleError(err, 'error getting asp info')
        resolve({ ...emptyAspInfo, unreachable: true })
      })
  })
}

export const getBalance = async (): Promise<Satoshis> => {
  return new Promise((resolve) => {
    window
      .balance(false)
      .then((balance) => {
        if (!balance) resolve(0)
        const { offchainBalance, onchainBalance } = balance
        resolve(offchainBalance + onchainBalance.spendable + onchainBalance.locked)
      })
      .catch((err) => {
        consoleError(err, 'error getting balance')
        resolve(0)
      })
  })
}

export const notifyIncomingFunds = async (): Promise<number> => {
  const { offchainAddr } = await getReceivingAddresses()
  const res = await window.notifyIncomingFunds(offchainAddr)
  const { incomingVtxos } = JSON.parse(res)
  if (!incomingVtxos) throw new Error('No incoming vtxos')
  return incomingVtxos.reduce((acc: number, vtxo: any) => acc + vtxo.Amount, 0)
}

export const getPrivateKey = async () => {
  return window.dump()
}

export const getTxHistory = async (): Promise<Tx[]> => {
  const txs: Tx[] = []
  try {
    const res = await window.getTransactionHistory()
    if (!res) return []
    for (const tx of JSON.parse(res)) {
      const date = new Date(tx.createdAt)
      const unix = Math.floor(date.getTime() / 1000)
      const { boardingTxid, settled, redeemTxid, roundTxid, type } = tx
      const explorable = boardingTxid ? boardingTxid : roundTxid ? roundTxid : undefined
      txs.push({
        amount: Math.abs(parseInt(tx.amount, 10)),
        boardingTxid,
        createdAt: unix,
        explorable,
        pending: !settled,
        settled: type === 'SENT' ? true : settled, // show all sent tx as settled
        redeemTxid,
        roundTxid,
        type: type.toLowerCase(),
      })
    }
  } catch (err) {
    consoleError(err, 'error getting tx history')
    return []
  }
  // sort by date, if have same date, put 'received' txs first
  txs.sort((a, b) => {
    if (a.createdAt === b.createdAt) return a.type === 'sent' ? -1 : 1
    return a.createdAt > b.createdAt ? -1 : 1
  })
  return txs
}

export const getReceivingAddresses = async (): Promise<Addresses> => {
  return await window.receive()
}

export const getVtxos = async (): Promise<Vtxos> => {
  const toVtxo = (v: any): Vtxo => {
    return {
      amount: v.Amount,
      createdAt: v.CreatedAt,
      descriptor: v.Descriptor,
      expireAt: v.ExpiresAt,
      pending: v.IsPending,
      roundTxid: v.RoundTxid,
      redeemTx: v.RedeemTx,
      spent: v.Spent,
      spentBy: v.SpentBy,
      txid: v.Txid,
      vout: v.VOut,
    }
  }
  try {
    const json = await window.listVtxos()
    const data = JSON.parse(json)
    const spendable = data.spendable?.map(toVtxo) ?? []
    const spent = data.spent?.map(toVtxo) ?? []
    return { spendable, spent }
  } catch {
    return { spendable: [], spent: [] }
  }
}

export const lock = async (): Promise<void> => {
  return await window.lock()
}

export const redeemNotes = async (notes: string[]): Promise<void> => {
  try {
    await window.redeemNotes(notes)
  } catch {
    await window.redeemNotes(notes)
  }
}

export const sendOffChain = async (sats: number, address: string): Promise<string> => {
  const withZeroFees = true
  const withExpiryCoinselect = false
  return await window.sendOffChain(withExpiryCoinselect, [{ To: address, Amount: sats }], withZeroFees)
}

export const sendOnChain = async (sats: number, address: string): Promise<string> => {
  return await window.sendOnChain([{ To: address, Amount: sats }])
}

export const settleVtxos = async (): Promise<void> => {
  try {
    await window.settle()
  } catch (err) {
    consoleError(err, 'error settling vtxos')
    throw err
  }
}

export const setNostrNotificationRecipient = async (npub: string): Promise<void> => {
  if (invalidNpub(npub)) return
  return window.setNostrNotificationRecipient(npub)
}

export const startListenTransactionStream = async (callback: () => {}) => {
  consoleLog('start listening', typeof callback)
  // return await window.getTransactionStream(callback)
}

export const unlock = async (password: string): Promise<void> => {
  return await window.unlock(password)
}

export const walletLocked = async (): Promise<boolean> => {
  return await window.locked()
}
