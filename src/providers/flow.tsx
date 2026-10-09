import { readInitialAppIntent, type AppIntentState } from '../lib/appIntent'
import type { LnSendRequest } from '../lib/lnSwap'
import { ReactNode, SetStateAction, createContext, useState } from 'react'
import type { Asset, AssetDetails, ServiceWorkerWalletMode } from '@arkade-os/sdk'
import { Tx } from '../lib/types'
import type { FiatAccountSend } from '../lib/accountAssets'

export interface InitInfo {
  password?: string
  privateKey?: Uint8Array
  mnemonic?: string
  restoring?: boolean
  walletMode?: ServiceWorkerWalletMode
}

export interface NoteInfo {
  note: string
  satoshis: number
}

export interface DeepLinkInfo {
  appId: string
  query?: string
}

/**
 * What the receive screen renders about a negotiated Lightning receive — and
 * nothing more.
 *
 * The covenant, the claim secrets and the expected amount live with
 * `LnReceiveProvider`, which is what claims the lockup. Keeping the whole
 * `LnReceiveRequest` here once invited a second claim path written against flow
 * state, which is the thing Stage 1 removes.
 */
export interface PendingLnReceive {
  rfqId: string
  invoice: string
  /** What the payer is asked for, sats — larger than the amount received. */
  payAmount: number
  /** Last moment the invoice can be paid, unix seconds. */
  invoiceExpiresAt: number
}

export interface RecvInfo {
  boardingAddr: string
  offchainAddr: string
  onchainAddr?: string
  /** The solver's hold invoice, once an RFQ receive has been negotiated. */
  invoice?: string
  pendingLnReceive?: PendingLnReceive
  satoshis: number
  txid?: string
  addressError?: string
  assetId?: string
  assetAmount?: bigint
  receivedAssets?: Asset[]
  received: boolean
}

export type SendInfo = {
  account?: FiatAccountSend
  address?: string
  assets?: Asset[]
  arkAddress?: string
  invoice?: string
  lnUrl?: string
  pendingLnSend?: LnSendRequest
  recipient?: string
  satoshis?: number
  scan?: boolean
  total?: number
  text?: string
  txid?: string
}

export type TxInfo = Tx | undefined

interface FlowContextProps {
  initInfo: InitInfo
  noteInfo: NoteInfo
  deepLinkInfo: DeepLinkInfo | undefined
  appIntent: AppIntentState | undefined
  recvInfo: RecvInfo
  sendInfo: SendInfo
  swapFromAssetId: string | undefined
  txInfo: TxInfo
  setInitInfo: (arg0: InitInfo) => void
  setNoteInfo: (arg0: NoteInfo) => void
  setDeepLinkInfo: (arg0: DeepLinkInfo) => void
  setAppIntent: (arg0: AppIntentState | undefined) => void
  setRecvInfo: (arg0: SetStateAction<RecvInfo>) => void
  setSendInfo: (arg0: SetStateAction<SendInfo>) => void
  setSwapFromAssetId: (arg0: string | undefined) => void
  setTxInfo: (arg0: TxInfo) => void
  assetInfo: AssetDetails
  setAssetInfo: (arg0: AssetDetails) => void
  resetFlow: () => void
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
  appIntent: undefined,
  recvInfo: emptyRecvInfo,
  sendInfo: emptySendInfo,
  swapFromAssetId: undefined,
  txInfo: undefined,
  setInitInfo: () => {},
  setNoteInfo: () => {},
  setDeepLinkInfo: () => {},
  setAppIntent: () => {},
  setRecvInfo: () => {},
  setSendInfo: () => {},
  setSwapFromAssetId: () => {},
  setTxInfo: () => {},
  assetInfo: emptyAssetInfo,
  setAssetInfo: () => {},
  resetFlow: () => {},
})

export const FlowProvider = ({ children }: { children: ReactNode }) => {
  const [initInfo, setInitInfo] = useState(emptyInitInfo)
  const [noteInfo, setNoteInfo] = useState(emptyNoteInfo)
  const [deepLinkInfo, setDeepLinkInfo] = useState<DeepLinkInfo | undefined>()
  // Captured during the first render, before any navigation pushState clears the query.
  const [appIntent, setAppIntent] = useState<AppIntentState | undefined>(readInitialAppIntent)
  const [recvInfo, setRecvInfo] = useState(emptyRecvInfo)
  const [sendInfo, setSendInfo] = useState(emptySendInfo)
  const [swapFromAssetId, setSwapFromAssetId] = useState<string | undefined>()
  const [txInfo, setTxInfo] = useState<TxInfo>()
  const [assetInfo, setAssetInfo] = useState<AssetDetails>(emptyAssetInfo)

  const resetFlow = () => {
    setAppIntent(undefined)
    setAssetInfo(emptyAssetInfo)
    setDeepLinkInfo(undefined)
    setInitInfo(emptyInitInfo)
    setNoteInfo(emptyNoteInfo)
    setRecvInfo(emptyRecvInfo)
    setSendInfo(emptySendInfo)
    setSwapFromAssetId(undefined)
    setTxInfo(undefined)
  }

  return (
    <FlowContext.Provider
      value={{
        initInfo,
        noteInfo,
        deepLinkInfo,
        appIntent,
        recvInfo,
        sendInfo,
        swapFromAssetId,
        txInfo,
        setInitInfo,
        setNoteInfo,
        setDeepLinkInfo,
        setAppIntent,
        setRecvInfo,
        setSendInfo,
        setSwapFromAssetId,
        setTxInfo,
        assetInfo,
        setAssetInfo,
        resetFlow,
      }}
    >
      {children}
    </FlowContext.Provider>
  )
}
