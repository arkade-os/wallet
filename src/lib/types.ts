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
  delegate: boolean
  fiat: Currencies
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
  BTC = 'BTC',
}

export enum SettingsSections {
  Advanced = 'Advanced',
  Display = 'Display',
  Security = 'Security',
  Config = 'Config',
}

export enum SettingsOptions {
  Menu = 'menu',
  About = 'about',
  Advanced = 'advanced',
  ArkadeMint = 'Arkade Mint',
  Backup = 'backup',
  Boltz = 'Boltz',
  Contracts = 'contracts',
  Delegates = 'delegates',
  BitcoinUnit = 'bitcoin unit',
  Display = 'display',
  Currency = 'Currency',
  Haptics = 'haptic feedback',
  Lock = 'lock wallet',
  Logs = 'logs',
  Notifications = 'notifications',
  Notes = 'notes',
  Password = 'change password',
  Reset = 'reset wallet',
  Server = 'server',
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
  assets?: Asset[]
  boardingTxid: string
  createdAt: number
  explorable: string | undefined
  preconfirmed: boolean
  redeemTxid: string
  roundTxid: string
  settled: boolean
  type: string
  prototypeSwap?: {
    fromTicker: string
    toTicker: string
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
}
