import { Asset, NetworkName, type ExtendedVirtualCoin, type ServiceWorkerWalletMode } from '@arkade-os/sdk'

export type Addresses = {
  boardingAddr: string
  offchainAddr: string
}

export type Config = {
  announcementsSeen: string[]
  apps: {
    assets: {
      enabled: boolean
    }
  }
  aspUrl: string
  currency: Currencies
  delegate: boolean
  importedAssets: string[]
  haptics: boolean
  nostrBackup: boolean
  notifications: boolean
  pubkey: string
  showBalance: boolean
  dismissedBanners: string[]
  theme: Themes
  unit: Unit
  walletMode: ServiceWorkerWalletMode
  // deprecated
  currencyDisplay?: string
  fiat?: Currencies
}

export type Delegate = {
  fee: number
  url: string
  name: string
  pubkey: string
  address: string
}

export enum Currencies {
  USD = 'USD',
  EUR = 'EUR',
  CHF = 'CHF',
  GBP = 'GBP',
  JPY = 'JPY',
  CNY = 'CNY',
  BRL = 'BRL',
  BTC = 'BTC',
}

export enum SettingsSections {
  Advanced = 'Advanced',
  General = 'General',
  Security = 'Security',
  Display = 'Display',
}

export enum SettingsOptions {
  Menu = 'menu',
  About = 'about',
  Advanced = 'advanced',
  ArkadeMint = 'Arkade Mint',
  Backup = 'backup',
  BitcoinUnit = 'bitcoin unit',
  Contracts = 'contracts',
  Currency = 'Currency',
  Delegates = 'delegates',
  Display = 'display',
  General = 'general',
  Haptics = 'haptic feedback',
  Lock = 'lock wallet',
  Logs = 'logs',
  Notifications = 'notifications',
  Notes = 'notes',
  Password = 'change password',
  Reset = 'reset wallet',
  Server = 'server',
  Solvers = 'solvers',
  Support = 'support',
  Theme = 'theme',
  Vtxos = 'coin control',
}

export enum Themes {
  Auto = 'Auto',
  Dark = 'Dark',
  Light = 'Light',
}

/**
 * The lockup leg of a Lightning send, recorded against its funding txid.
 *
 * A Lightning send is two transactions, not one: the tx the wallet signs funds
 * the lockup covenant, and a second tx spends it — the solver's claim once it
 * has paid the invoice, or the refund back to us when it could not. Only the
 * first is the wallet's own, so nothing in tx history can name the second; the
 * covenant's script is what lets the receipt find it.
 */
export type LnSendActivity = {
  /** Hex pkScript of the lockup covenant — the indexer's watch key. */
  swapPkScript: string
  /** The tx that ended the swap, absent until one exists. */
  spend?: LnSendSpend
}

/** The tx that spent a lockup, and which of the two spends it was. One type
 * because neither half means anything alone. */
export type LnSendSpend = {
  spentTxid: string
  outcome: 'completed' | 'refunded'
}

export type Tx = {
  amount: number
  assetAction?: 'issued' | 'reissued' | 'burned'
  assets?: Asset[]
  boardingTxid: string
  createdAt: number
  destination?: string
  explorable: string | undefined
  /** Stable identity for this history row, from the activity that produced it.
   *  Not a txid — never render it, never build an explorer link from it. */
  historyKey?: string
  /** Present only on a Lightning send: its lockup covenant and that
   * covenant's spender, which is a second tx the wallet never signed. */
  lnSend?: LnSendActivity
  /** Present on a row the swap activity resolver grouped. `label` and
   * `outcome` are the resolver's own — opaque tokens, not display text, which
   * `lnSwapLabel` turns into copy; the two txids are the receipt's rows. */
  lnSwap?: { label?: string; outcome?: string; fundingTxid?: string; spendTxid?: string }
  networkFee?: number
  preconfirmed: boolean
  redeemTxid: string
  roundTxid: string
  settled: boolean
  type: string
  assetSwap?: {
    fromAssetId?: string
    fromTicker: string
    fromDecimals?: number
    fromAmount?: bigint
    toAssetId?: string
    toTicker: string
    toDecimals?: number
    toAmount?: bigint
    fiatAmount?: number
    status?: 'pending' | 'failed' | 'completed' | 'cancelled' | 'recoverable'
    feeBps?: number
    fiatCurrency?: string
    fundingTxid?: string
    fillTxid?: string
  }
}

export enum Unit {
  BTC = 'BTC',
  SATS = 'sats',
  BIP177 = '₿',
}

export type Vtxo = ExtendedVirtualCoin

export type Wallet = {
  thresholdMs?: number
  lockedByBiometrics?: boolean
  network?: NetworkName | ''
  nextRollover: number
  passkeyId?: string
  pubkey?: string
}

export interface AssetOption {
  assetId: string
  name: string
  ticker: string
  balance: bigint
  decimals: number
  icon?: string
  /** id-verified via the asset registry; a self-reported ticker must never
   * earn currency treatment (pricing, fiat formatting) without this */
  trusted?: boolean
}
