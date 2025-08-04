import { PendingSubmarineSwap } from '@arkade-os/boltz-swap'
import { ReactNode, createContext, useState } from 'react'
import { Tx } from '../lib/types'
import { PendingSubmarineSwap } from '../lib/boltz'

export interface InitInfo {
  password?: string
  privateKey?: Uint8Array
  restoring?: boolean
}

export interface NoteInfo {
  note: string
  satoshis: number
}

export interface RecvInfo {
  boardingAddr: string
  offchainAddr: string
  invoice?: string
  satoshis: number
  txid?: string
}

export type SendInfo = {
  address?: string
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

export type TxInfo = Tx | undefined

interface FlowContextProps {
  initInfo: InitInfo
  noteInfo: NoteInfo
  recvInfo: RecvInfo
  sendInfo: SendInfo
  txInfo: TxInfo
  setInitInfo: (arg0: InitInfo) => void
  setNoteInfo: (arg0: NoteInfo) => void
  setRecvInfo: (arg0: RecvInfo) => void
  setSendInfo: (arg0: SendInfo) => void
  setTxInfo: (arg0: TxInfo) => void
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
  recvInfo: emptyRecvInfo,
  sendInfo: emptySendInfo,
  txInfo: undefined,
  setInitInfo: () => {},
  setNoteInfo: () => {},
  setRecvInfo: () => {},
  setSendInfo: () => {},
  setTxInfo: () => {},
})

export const FlowProvider = ({ children }: { children: ReactNode }) => {
  const [initInfo, setInitInfo] = useState(emptyInitInfo)
  const [noteInfo, setNoteInfo] = useState(emptyNoteInfo)
  const [recvInfo, setRecvInfo] = useState(emptyRecvInfo)
  const [sendInfo, setSendInfo] = useState(emptySendInfo)
  const [txInfo, setTxInfo] = useState<TxInfo>()

  return (
    <FlowContext.Provider
      value={{
        initInfo,
        noteInfo,
        recvInfo,
        sendInfo,
        txInfo,
        setInitInfo,
        setNoteInfo,
        setRecvInfo,
        setSendInfo,
        setTxInfo,
      }}
    >
      {children}
    </FlowContext.Provider>
  )
}
