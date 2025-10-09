import { emptyAspInfo } from '../../lib/asp'
import { Pages, Tabs } from '../../providers/navigation'
import { emptyInitInfo, emptyNoteInfo, emptyRecvInfo, emptySendInfo } from '../../providers/flow'
import { AspInfo } from '../../providers/asp'

const mockAspInfo: AspInfo = {
  ...emptyAspInfo,
  boardingExitDelay: BigInt(7775744),
  checkpointTapscript: '',
}

export const mockTxId = '547b9e710c0b57197ab27faa2192601defe2efb08a45ee8ada765a6829ba451b'

export const mockTxInfo = {
  amount: 100000,
  boardingTxid: mockTxId,
  redeemTxid: '',
  roundTxid: '',
  createdAt: Math.floor(Date.now() / 1000) - 21, // 21 seconds ago
  explorable: mockTxId,
  preconfirmed: false,
  settled: true,
  type: 'received',
}

export const mockAspContextValue = {
  aspInfo: mockAspInfo,
  calcBestMarketHour: () => undefined,
  calcNextMarketHour: () => undefined,
  setAspInfo: () => {},
}

export const mockNavigationContextValue = {
  navigate: () => {},
  screen: Pages.Init,
  tab: Tabs.None,
}

export const mockWalletContextValue = {
  initWallet: () => Promise.resolve(),
  lockWallet: () => Promise.resolve(),
  resetWallet: () => Promise.resolve(),
  settlePreconfirmed: () => Promise.resolve(),
  updateWallet: () => {},
  reloadWallet: () => Promise.resolve(),
  wallet: {
    nextRollover: 0,
  },
  walletLoaded: false,
  svcWallet: undefined,
  isLocked: () => Promise.resolve(true),
  balance: 0,
  txs: [mockTxInfo],
  vtxos: { spendable: [], spent: [] },
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
