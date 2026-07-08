import { BoltzSwap } from '@arkade-os/boltz-swap'
import { ReactNode, createContext, useState } from 'react'
import type { Asset, AssetDetails, ServiceWorkerWalletMode } from '@arkade-os/sdk'
import { Tx } from '../lib/types'

export interface InitInfo {
  password?: string
  privateKey?: Uint8Array
  mnemonic?: string
  restoring?: boolean
  walletMode?: ServiceWorkerWalletMode
  // passkey with PRF support: the vault key is derived from prfOutput
  prf?: { credentialId: string; prfOutput: Uint8Array }
  // passkey without PRF: password carries the legacy userHandle secret
  legacyPasskey?: { credentialId: string }
}

export interface NoteInfo {
  note: string
  satoshis: number
}

export interface DeepLinkInfo {
  appId: string
  query?: string
}

export interface RecvInfo {
  boardingAddr: string
  offchainAddr: string
  onchainAddr?: string
  invoice?: string
  satoshis: number
  txid?: string
  addressError?: string
  assetId?: string
  assetAmount?: bigint
  receivedAssets?: Asset[]
  received: boolean
}

export type SendInfo = {
  address?: string
  assets?: Asset[]
  arkAddress?: string
  invoice?: string
  lnUrl?: string
  pendingSwap?: BoltzSwap
  recipient?: string
  satoshis?: number
  scan?: boolean
  swapId?: string
  total?: number
  text?: string
  txid?: string
}

export type SwapInfo = BoltzSwap | undefined

export type TxInfo = Tx | undefined

export type LnUrlInfo = Uint8Array | undefined

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
  assetInfo: AssetDetails
  setAssetInfo: (arg0: AssetDetails) => void
  lnurlInfo: LnUrlInfo
  setLnurlInfo: (arg0: LnUrlInfo) => void
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
  received: false,
  satoshis: 0,
}

export const emptyAssetInfo: AssetDetails = { assetId: '', supply: BigInt(0) }

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
  lnurlInfo: undefined,
  setLnurlInfo: () => {},
})

export const FlowProvider = ({ children }: { children: ReactNode }) => {
  const [initInfo, setInitInfo] = useState(emptyInitInfo)
  const [noteInfo, setNoteInfo] = useState(emptyNoteInfo)
  const [deepLinkInfo, setDeepLinkInfo] = useState<DeepLinkInfo | undefined>()
  const [recvInfo, setRecvInfo] = useState(emptyRecvInfo)
  const [sendInfo, setSendInfo] = useState(emptySendInfo)
  const [swapInfo, setSwapInfo] = useState<SwapInfo>()
  const [txInfo, setTxInfo] = useState<TxInfo>()
  const [assetInfo, setAssetInfo] = useState<AssetDetails>(emptyAssetInfo)
  const [lnurlInfo, setLnurlInfo] = useState<LnUrlInfo>()

  return (
    <FlowContext.Provider
      value={{
        initInfo,
        noteInfo,
        deepLinkInfo,
        lnurlInfo,
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
        setLnurlInfo,
      }}
    >
      {children}
    </FlowContext.Provider>
  )
}
