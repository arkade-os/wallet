import { PendingReverseSwap, PendingSubmarineSwap } from '@arkade-os/boltz-swap'
import { ReactNode, createContext, useState } from 'react'
import type { AssetDetails } from '@arkade-os/sdk'
import { AssetBalance, Tx } from '../lib/types'

export interface InitInfo {
  password?: string
  privateKey?: Uint8Array
  restoring?: boolean
}

export interface NoteInfo {
  note: string
  satoshis: number
}

export interface DeepLinkInfo {
  appId: string
  query?: string
}

export interface AssetInfo {
  assetId?: string
  details?: AssetDetails
}

export interface RecvInfo {
  boardingAddr: string
  offchainAddr: string
  invoice?: string
  satoshis: number
  txid?: string
  assetId?: string
}

export type SendInfo = {
  address?: string
  assets?: AssetBalance[]
  arkAddress?: string
  invoice?: string
  lnUrl?: string
  pendingSwap?: PendingSubmarineSwap
  recipient?: string
  satoshis?: number
  swapId?: string
  total?: number
  text?: string
  txid?: string
}

export type SwapInfo = PendingSubmarineSwap | PendingReverseSwap | undefined

export type TxInfo = Tx | undefined

interface FlowContextProps {
  initInfo: InitInfo
  noteInfo: NoteInfo
  deepLinkInfo: DeepLinkInfo | undefined
  recvInfo: RecvInfo
  sendInfo: SendInfo
  swapInfo: SwapInfo
  txInfo: TxInfo
  setInitInfo: (arg0: InitInfo) => void
  setNoteInfo: (arg0: NoteInfo) => void
  setDeepLinkInfo: (arg0: DeepLinkInfo) => void
  setRecvInfo: (arg0: RecvInfo) => void
  setSendInfo: (arg0: SendInfo) => void
  setSwapInfo: (arg0: SwapInfo) => void
  setTxInfo: (arg0: TxInfo) => void
  assetInfo: AssetInfo
  setAssetInfo: (arg0: AssetInfo) => void
}

export const emptyInitInfo: InitInfo = {
  password: undefined,
  privateKey: undefined,
}

export const emptyNoteInfo: NoteInfo = {
  note: '',
  satoshis: 0,
}

export const emptyRecvInfo: RecvInfo = {
  boardingAddr: '',
  offchainAddr: '',
  satoshis: 0,
}

export const emptyAssetInfo: AssetInfo = {}

export const emptySendInfo: SendInfo = {
  address: '',
  arkAddress: '',
  recipient: '',
  satoshis: 0,
  total: 0,
  txid: '',
}

export const FlowContext = createContext<FlowContextProps>({
  initInfo: emptyInitInfo,
  noteInfo: emptyNoteInfo,
  deepLinkInfo: undefined,
  recvInfo: emptyRecvInfo,
  sendInfo: emptySendInfo,
  swapInfo: undefined,
  txInfo: undefined,
  setInitInfo: () => {},
  setNoteInfo: () => {},
  setDeepLinkInfo: () => {},
  setRecvInfo: () => {},
  setSendInfo: () => {},
  setSwapInfo: () => {},
  setTxInfo: () => {},
  assetInfo: emptyAssetInfo,
  setAssetInfo: () => {},
})

export const FlowProvider = ({ children }: { children: ReactNode }) => {
  const [initInfo, setInitInfo] = useState(emptyInitInfo)
  const [noteInfo, setNoteInfo] = useState(emptyNoteInfo)
  const [deepLinkInfo, setDeepLinkInfo] = useState<DeepLinkInfo | undefined>()
  const [recvInfo, setRecvInfo] = useState(emptyRecvInfo)
  const [sendInfo, setSendInfo] = useState(emptySendInfo)
  const [swapInfo, setSwapInfo] = useState<SwapInfo>()
  const [txInfo, setTxInfo] = useState<TxInfo>()
  const [assetInfo, setAssetInfo] = useState<AssetInfo>(emptyAssetInfo)

  return (
    <FlowContext.Provider
      value={{
        initInfo,
        noteInfo,
        deepLinkInfo,
        recvInfo,
        sendInfo,
        swapInfo,
        txInfo,
        setInitInfo,
        setNoteInfo,
        setDeepLinkInfo,
        setRecvInfo,
        setSendInfo,
        setSwapInfo,
        setTxInfo,
        assetInfo,
        setAssetInfo,
      }}
    >
      {children}
    </FlowContext.Provider>
  )
}
