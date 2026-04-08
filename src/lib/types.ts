import { Asset, NetworkName, type ExtendedVirtualCoin } from '@arkade-os/sdk'

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
  currencyDisplay: CurrencyDisplay
  delegate: boolean
  fiat: Fiats
  importedAssets: string[]
  haptics: boolean
  nostrBackup: boolean
  notifications: boolean
  pubkey: string
  showBalance: boolean
  dismissedBanners: string[]
  theme: Themes
  unit: Unit
}

export enum CurrencyDisplay {
  Both = 'Show both',
  Fiat = 'Fiat only',
  Sats = 'Sats only',
}

export type Delegate = {
  fee: number
  url: string
  name: string
  pubkey: string
  address: string
}

export enum Fiats {
  EUR = 'EUR',
  USD = 'USD',
  CHF = 'CHF',
  JPY = 'JPY',
  GBP = 'GBP',
  CNY = 'CNY',
}

export type Satoshis = number

export enum SettingsSections {
  Advanced = 'Advanced',
  General = 'General',
  Security = 'Security',
  Config = 'Config',
}

export enum SettingsOptions {
  Menu = 'menu',
  About = 'about',
  Advanced = 'advanced',
  Backup = 'backup',
  General = 'general',
  Haptics = 'haptics feedback',
  Lock = 'lock wallet',
  Logs = 'logs',
  Notifications = 'notifications',
  Notes = 'notes',
  Password = 'change password',
  Reset = 'reset wallet',
  Server = 'server',
  Support = 'support',
  Vtxos = 'coin control',
  Theme = 'theme',
  Fiat = 'fiat currency',
  Display = 'display preferences',
  Delegates = 'delegates',
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
}

export enum Unit {
  BTC = 'btc',
  EUR = 'eur',
  USD = 'usd',
  CHF = 'chf',
  SAT = 'sat',
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
  balance: number
  decimals: number
  icon?: string
}
