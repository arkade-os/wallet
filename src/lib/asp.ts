import { ExtendedVirtualCoin, IWallet, ArkNote, ArkInfo, RestArkProvider } from '@arkade-os/sdk'
import { consoleError, consoleLog } from './logs'
import { Addresses, Satoshis, Tx } from './types'
import { vtxosRepository } from './db'

export const emptyAspInfo: ArkInfo & { unreachable: boolean; url: string } = {
  signerPubkey: '',
  vtxoTreeExpiry: BigInt(0),
  unilateralExitDelay: BigInt(0),
  roundInterval: BigInt(0),
  network: '',
  dust: BigInt(0),
  forfeitAddress: '',
  version: '',
  utxoMinAmount: BigInt(333),
  utxoMaxAmount: BigInt(-1), // -1 means no limit (default), 0 means boarding not allowed
  vtxoMinAmount: BigInt(1),
  vtxoMaxAmount: BigInt(-1), // -1 means no limit (default)
  boardingExitDelay: BigInt(0),
  unreachable: false,
  url: '',
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

export const getAspInfo = async (url: string): Promise<ArkInfo & { unreachable: boolean; url: string }> => {
  let fullUrl = url
  if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) fullUrl = 'http://' + url
  else if (!url.startsWith('http')) fullUrl = 'https://' + url
  const provider = new RestArkProvider(fullUrl)
  try {
    const infos = await provider.getInfo()
    return { ...infos, unreachable: false, url }
  } catch (err) {
    consoleError(err, 'error getting asp info')
    return { ...emptyAspInfo, unreachable: true, url }
  }
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
      const explorable = key.boardingTxid ? key.boardingTxid : key.commitmentTxid ? key.commitmentTxid : undefined
      txs.push({
        amount: Math.abs(amount),
        boardingTxid: key.boardingTxid,
        redeemTxid: key.arkTxid,
        roundTxid: key.commitmentTxid,
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
  const [offchainAddr, boardingAddr] = await Promise.all([wallet.getAddress(), wallet.getBoardingAddress()])
  return {
    boardingAddr,
    offchainAddr,
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
  const inputs = notes.map((note) => ArkNote.fromString(note))
  const amount = inputs.reduce((acc, curr) => acc + BigInt(curr.value), BigInt(0))

  const { offchainAddr } = await getReceivingAddresses(wallet)

  await wallet.settle({
    inputs,
    outputs: [{ address: offchainAddr, amount }],
  })
}

export const sendOffChain = async (wallet: IWallet, sats: number, address: string): Promise<string> => {
  return wallet.sendBitcoin({ address, amount: sats })
}

export const sendOnChain = async (wallet: IWallet, sats: number, address: string): Promise<string> => {
  return wallet.sendBitcoin({ address, amount: sats })
}

export const settleVtxos = async (wallet: IWallet): Promise<void> => {
  await wallet.settle(undefined, consoleLog)
}
