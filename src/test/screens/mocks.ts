import { emptyAspInfo } from '../../lib/asp'
import { Pages, Tabs } from '../../providers/navigation'
import { emptyInitInfo, emptyNoteInfo, emptyRecvInfo, emptySendInfo } from '../../providers/flow'
import { AspInfo } from '../../providers/asp'
import { SingleKey } from '@arkade-os/sdk'
import { CurrencyDisplay, Fiats, Themes } from '../../lib/types'

const mockAspInfo: AspInfo = {
  ...emptyAspInfo,
  boardingExitDelay: BigInt(1024),
  checkpointTapscript: '',
  dust: BigInt(333),
  network: 'regtest',
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

export const mockConfigContextValue = {
  config: {
    currencyDisplay: CurrencyDisplay.Both,
    fiat: Fiats.EUR,
    nostrBackup: true,
    notifications: true,
    theme: Themes.Dark,
  },
  useFiat: false,
}

export const mockFiatContextValue = {
  fromFiat: (amount: number) => amount,
  toFiat: (amount: number) => amount,
}

export const mockLightningContextValue = {
  swapProvider: undefined,
  connected: false,
  calcSubmarineSwapFee: () => 0,
}

export const mockOptionsContextValue = {
  setOption: () => {},
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

export const mockSvcWallet = {
  identity: SingleKey.fromRandomBytes(),
  getAddress: () => '',
  getBoardingAddress: () => Promise.resolve(''),
  getBalance: () => Promise.resolve({}),
  getVtxos: () => Promise.resolve([]),
  getBoardingUtxos: () => Promise.resolve([]),
  getTransactionHistory: () => Promise.resolve([]),
  sendBitcoin: () => Promise.resolve(''),
  settle: () => Promise.resolve(''),
  walletRepository: {
    getVtxos: () => Promise.resolve([]),
    saveVtxos: () => Promise.resolve(),
    removeVtxo: () => Promise.resolve(),
    clearVtxos: () => Promise.resolve(),
    getUtxos: () => Promise.resolve([]),
    saveUtxos: () => Promise.resolve(),
    removeUtxo: () => Promise.resolve(),
    clearUtxos: () => Promise.resolve(),
    getTransactions: () => Promise.resolve([]),
    saveTransaction: () => Promise.resolve(),
    clearTransactions: () => Promise.resolve(),
    getTransactionHistory: () => Promise.resolve([]),
    saveTransactions: () => Promise.resolve(),
    getWalletState: () => Promise.resolve(null),
    saveWalletState: () => Promise.resolve(),
  },
  contractRepository: {
    getContractData: () => Promise.resolve(null),
    setContractData: () => Promise.resolve(),
    clearContractData: () => Promise.resolve(),
    deleteContractData: () => Promise.resolve(),
    getContractCollection: () => Promise.resolve([]),
    saveToContractCollection: () => Promise.resolve(),
    removeFromContractCollection: () => Promise.resolve(),
  },
  sendMessage: undefined,
  serviceWorker: {
    onstatechange: () => {},
    scriptURL: '',
    state: 'installing' as ServiceWorkerState,
    postMessage: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    onerror: () => {},
  },
  clear: undefined,
  getStatus: undefined,
  reload: undefined,
}
