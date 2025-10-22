import { NetworkName, type ExtendedVirtualCoin } from '@arkade-os/sdk'

export type Addresses = {
  boardingAddr: string
  offchainAddr: string
}

export type Config = {
  apps: {
    boltz: {
      connected: boolean
    }
  }
  aspUrl: string
  boltzUrl: string
  esploraUrl: string
  indexerUrl: string
  currencyDisplay: CurrencyDisplay
  fiat: Fiats
  nostr: boolean
  notifications: boolean
  npub: string
  showBalance: boolean
  theme: Themes
  unit: Unit
}

export enum CurrencyDisplay {
  Both = 'Show both',
  Fiat = 'Fiat only',
  Sats = 'Sats only',
}

export enum Fiats {
  EUR = 'EUR',
  USD = 'USD',
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
  Backup = 'backup and privacy',
  General = 'general',
  Lock = 'lock wallet',
  Logs = 'logs',
  Notifications = 'notifications',
  Nostr = 'nostr',
  Notes = 'notes',
  Password = 'change password',
  Reset = 'reset wallet',
  Server = 'server',
  Vtxos = 'coin control',
  Theme = 'theme',
  Fiat = 'fiat currency',
  Display = 'display preferences',
}

export enum Themes {
  Dark = 'Dark',
  Light = 'Light',
}

export type Tx = {
  amount: number
  boardingTxid: string
  createdAt: number
  explorable: string | undefined
  preconfirmed: boolean
  redeemTxid: string
  roundTxid: string
  settled: boolean
  type: string
}

export enum TxType {
  swap = 'swap',
  utxo = 'utxo',
  vtxo = 'vtxo',
}

export enum Unit {
  BTC = 'btc',
  EUR = 'eur',
  USD = 'usd',
  SAT = 'sat',
}

export type Vtxo = ExtendedVirtualCoin

export type Wallet = {
  lockedByBiometrics?: boolean
  network?: NetworkName | ''
  nextRollover: number
  passkeyId?: string
  pubkey?: string
}
