import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockSvcWallet,
  mockTxId,
  mockWalletContextValue,
} from '../test/screens/mocks'
import { MUTINYNET_USDT_ASSET_ID } from '../lib/accountAssets'
import { Currencies, Themes, Unit } from '../lib/types'
import { SwapsContext } from '../providers/swaps'

const BTC_PRICE = 120_000
const OFFCHAIN =
  'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98ndah6u2nd5ac7lsqhsqxq84kgxzs7rj8vsp4ktjhny6chy9j6dr0q9qdmc7e3'
const BOARDING = 'tb1pq6gt72nxevsxk5fwl3h2sx56jeah6qfzh98mksxyakkg5l0q65gs7dp0x9'
const now = Math.floor(Date.now() / 1000)

const txs = [
  {
    amount: 21021,
    boardingTxid: '',
    redeemTxid: mockTxId,
    roundTxid: '',
    createdAt: now - 60 * 60 * 3,
    explorable: mockTxId,
    preconfirmed: false,
    settled: true,
    type: 'sent',
    lnurl: { address: 'maya@example.com', rail: 'arkade' },
    historyKey: 'tx-1',
  },
  {
    amount: 25000,
    boardingTxid: '',
    redeemTxid: mockTxId.replace('5', '6'),
    roundTxid: '',
    createdAt: now - 60 * 60 * 15,
    explorable: mockTxId,
    preconfirmed: false,
    settled: true,
    type: 'received',
    historyKey: 'tx-2',
  },
  {
    amount: 5000,
    boardingTxid: mockTxId.replace('5', '7'),
    redeemTxid: '',
    roundTxid: '',
    createdAt: now - 60 * 60 * 30,
    explorable: mockTxId,
    preconfirmed: true,
    settled: false,
    type: 'received',
    historyKey: 'tx-3',
  },
  {
    amount: 120000,
    boardingTxid: '',
    redeemTxid: mockTxId.replace('5', '8'),
    roundTxid: '',
    createdAt: now - 60 * 60 * 52,
    explorable: mockTxId,
    preconfirmed: false,
    settled: true,
    type: 'sent',
    historyKey: 'tx-4',
  },
]

export function buildFixtures(theme: Themes, variant: string) {
  const empty = variant === 'empty'
  const balance = empty ? 0 : 3_512_500
  const fiat = {
    ...mockFiatContextValue,
    toFiat: (sats = 0) => (sats * BTC_PRICE) / 1e8,
    fromFiat: (value = 0) => Math.round((value * 1e8) / BTC_PRICE),
    toFiatAmount: (amount: number) => (amount * BTC_PRICE) / 1e8,
    fromFiatAmount: (amount: number) => Math.round((amount * 1e8) / BTC_PRICE),
    fiatDecimals: () => 2,
  }
  return {
    asp: { ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' } },
    assets: { isRegistered: (assetId: string) => assetId === MUTINYNET_USDT_ASSET_ID },
    config: {
      ...mockConfigContextValue,
      config: {
        ...mockConfigContextValue.config,
        // state=btc: a Bitcoin-only wallet set to BTC, whose amounts are the longest the UI shows.
        currency: variant === 'btc' ? Currencies.BTC : Currencies.USD,
        unit: variant === 'btc' ? Unit.BTC : Unit.SATS,
        theme,
        showBalance: variant !== 'hidden',
      },
      effectiveTheme: theme,
      systemTheme: theme,
    },
    fiat,
    flow: {
      ...mockFlowContextValue,
      txInfo: txs[0],
      sendInfo: {
        ...mockFlowContextValue.sendInfo,
        arkAddress: OFFCHAIN,
        recipient: OFFCHAIN,
        satoshis: variant === 'btc' ? 10_000 : 21000,
        total: variant === 'btc' ? 10_021 : 21021,
      },
      recvInfo: {
        ...mockFlowContextValue.recvInfo,
        satoshis: 25000,
        boardingAddr: 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297',
        offchainAddr:
          'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t567uy9ukgfl2ntulzvlzj7swsprfs4wy4h47m7z48khygt7qsyazckttpz',
      },
    },
    limits: mockLimitsContextValue,
    swaps: { ...((SwapsContext as any)._currentValue ?? {}), swapAvailable: true, swaps: [], markets: [] },
    wallet: {
      ...mockWalletContextValue,
      walletLoaded: true,
      dataReady: true,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => Promise.resolve(OFFCHAIN),
        getBoardingAddress: () => Promise.resolve(BOARDING),
      },
      wallet: { ...mockWalletContextValue.wallet, pubkey: '02'.padEnd(66, 'a') },
      balance,
      availableBalance: balance,
      txs: empty ? [] : txs,
      ungroupedTxs: empty ? [] : txs,
      isVerifiedAsset: (assetId: string) => assetId === MUTINYNET_USDT_ASSET_ID,
      assetBalances: empty ? [] : [{ assetId: MUTINYNET_USDT_ASSET_ID, amount: BigInt(17_000) }],
      availableAssetBalances: empty ? [] : [{ assetId: MUTINYNET_USDT_ASSET_ID, amount: BigInt(17_000) }],
      assetMetadataCache: new Map([
        [MUTINYNET_USDT_ASSET_ID, { metadata: { decimals: 2, name: 'Tether USD', ticker: 'USDT' } }],
      ]),
    },
  }
}
