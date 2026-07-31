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
    boltz: {
      connected: boolean
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
  Boltz = 'Boltz',
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

export type Tx = {
  amount: number
  assetAction?: 'issued' | 'reissued' | 'burned'
  assets?: Asset[]
  boardingTxid: string
  createdAt: number
  destination?: string
  explorable: string | undefined
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
