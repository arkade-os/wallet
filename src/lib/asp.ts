import { ExtendedVirtualCoin, IWallet, ArkNote } from '@arkade-os/sdk'
import { consoleError, consoleLog } from './logs'
import { Addresses, Satoshis, Tx } from './types'
import { vtxosRepository } from './db'

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
  utxoMinAmount: number
  utxoMaxAmount: number
  vtxoMinAmount: number
  vtxoMaxAmount: number
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
  utxoMinAmount: 333,
  utxoMaxAmount: -1,
  vtxoMinAmount: 333,
  vtxoMaxAmount: -1,
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

export const collaborativeExit = async (wallet: IWallet, amount: number, address: string): Promise<string> => {
  const vtxos = await getVtxos()
  const selectedVtxos = []
  let selectedAmount = 0
  for (const vtxo of vtxos) {
    if (selectedAmount >= amount) break
    selectedVtxos.push(vtxo)
    selectedAmount += vtxo.value
  }
  const changeAmount = selectedAmount - amount

  const outputs = [{ address, amount: BigInt(amount) }]
  if (changeAmount > 0) {
    const { offchainAddr } = await getReceivingAddresses(wallet)
    outputs.push({ address: offchainAddr, amount: BigInt(changeAmount) })
  }

  return wallet.settle({ inputs: selectedVtxos, outputs }, consoleLog)
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
          utxoMinAmount,
          utxoMaxAmount,
          vtxoMinAmount,
          vtxoMaxAmount,
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
          utxoMinAmount: typeof utxoMinAmount === 'undefined' ? Number(dust) : Number(utxoMinAmount),
          utxoMaxAmount: typeof utxoMaxAmount === 'undefined' ? -1 : Number(utxoMaxAmount),
          vtxoMinAmount: typeof vtxoMinAmount === 'undefined' ? Number(dust) : Number(vtxoMinAmount),
          vtxoMaxAmount: typeof vtxoMaxAmount === 'undefined' ? -1 : Number(vtxoMaxAmount),
        })
      })
      .catch((err) => {
        consoleError(err, 'error getting asp info')
        resolve({ ...emptyAspInfo, unreachable: true })
      })
  })
}

export const getBalance = async (wallet: IWallet): Promise<Satoshis> => {
  const balance = await wallet.getBalance()
  const { total } = balance
  return total
}

export const getTxHistory = async (wallet: IWallet): Promise<Tx[]> => {
  const txs: Tx[] = []
  try {
    const res = await wallet.getTransactionHistory()
    if (!res) return []
    for (const tx of res) {
      const date = new Date(tx.createdAt)
      const unix = Math.floor(date.getTime() / 1000)
      const { key, settled, type, amount } = tx
      const explorable = key.boardingTxid ? key.boardingTxid : key.roundTxid ? key.roundTxid : undefined
      txs.push({
        amount: Math.abs(amount),
        boardingTxid: key.boardingTxid,
        redeemTxid: key.redeemTxid,
        roundTxid: key.roundTxid,
        createdAt: unix,
        explorable,
        preconfirmed: !settled,
        settled: type === 'SENT' ? true : settled, // show all sent tx as settled
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

export const getReceivingAddresses = async (wallet: IWallet): Promise<Addresses> => {
  const address = await wallet.getAddress()
  return {
    boardingAddr: address.boarding ?? '',
    offchainAddr: address.offchain ?? '',
  }
}

async function getVtxos(): Promise<ExtendedVirtualCoin[]> {
  try {
    return vtxosRepository.getSpendableVtxos()
  } catch (err) {
    consoleError(err, 'error getting vtxos from DB')
    return []
  }
}

export const redeemNotes = async (wallet: IWallet, notes: string[]): Promise<void> => {
  const totalNoteAmount = notes
    .map((note) => {
      const { value } = ArkNote.fromString(note).data
      return value
    })
    .reduce((acc, curr) => acc + curr, 0)

  const { offchainAddr } = await getReceivingAddresses(wallet)

  await wallet.settle({
    inputs: notes,
    outputs: [{ address: offchainAddr, amount: BigInt(totalNoteAmount) }],
  })
}

export const sendOffChain = async (wallet: IWallet, sats: number, address: string): Promise<string> => {
  const withZeroFees = true
  return wallet.sendBitcoin({ address, amount: sats }, withZeroFees)
}

export const sendOnChain = async (wallet: IWallet, sats: number, address: string): Promise<string> => {
  return wallet.sendBitcoin({ address, amount: sats })
}

export const settleVtxos = async (wallet: IWallet): Promise<void> => {
  await wallet.settle(undefined, consoleLog)
}
