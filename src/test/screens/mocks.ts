import { emptyInitInfo, emptyNoteInfo, emptyRecvInfo, emptySendInfo } from '../../providers/flow'

export const mockTxInfo = {
  amount: 100000,
  boardingTxid: '547b9e710c0b57197ab27faa2192601defe2efb08a45ee8ada765a6829ba451b',
  redeemTxid: '',
  roundTxid: '',
  createdAt: 1756749175,
  explorable: '547b9e710c0b57197ab27faa2192601defe2efb08a45ee8ada765a6829ba451b',
  preconfirmed: false,
  settled: true,
  type: 'received',
}

export const mockFlowContextValue = {
  txInfo: mockTxInfo,
  swapInfo: undefined,
  initInfo: emptyInitInfo,
  noteInfo: emptyNoteInfo,
  recvInfo: emptyRecvInfo,
  sendInfo: emptySendInfo,
  setInitInfo: () => {},
  setNoteInfo: () => {},
  setRecvInfo: () => {},
  setSendInfo: () => {},
  setSwapInfo: () => {},
  setTxInfo: () => {},
}

export const mockLimitsContextValue = {
  amountIsAboveMaxLimit: () => false,
  amountIsBelowMinLimit: () => false,
  lnSwapsAllowed: () => true,
  utxoTxsAllowed: () => true,
  vtxoTxsAllowed: () => true,
  validLnSwap: () => true,
  validUtxoTx: () => true,
  validVtxoTx: () => true,
  minSwapAllowed: () => 0,
  maxSwapAllowed: () => 0,
}
