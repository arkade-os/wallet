import { NetworkName } from './network'

export type Addresses = {
  boardingAddr: string
  offchainAddr: string
}

export type Config = {
  aspUrl: string
  nostr: boolean
  notifications: boolean
  npub: string
  showBalance: boolean
  showFiat: boolean
  theme: Themes
  unit: Unit
}

export type Mnemonic = string

export type Password = string

export type Satoshis = number

export enum SettingsSections {
  Advanced = 'Advanced',
  General = 'General',
  Security = 'Security',
}

export enum SettingsOptions {
  Menu = 'menu',
  About = 'about',
  Appearance = 'appearance',
  Backup = 'backup',
  Lock = 'lock wallet',
  Logs = 'logs',
  Notifications = 'notifications',
  Nostr = 'nostr',
  Notes = 'notes',
  Password = 'password',
  Reset = 'reset wallet',
  Server = 'server',
  Vtxos = 'coin control',
}

export enum Themes {
  Dark = 'Dark',
  Light = 'Light',
}

export type Transaction = {
  amount: number
  date: string
  hex?: string
  txid: string
  refresh?: number
  sweep?: boolean
  unixdate: number
}
export type Transactions = Record<NetworkName, Transaction[]>

export type Tx = {
  amount: number
  boardingTxid: string
  createdAt: number
  explorable: string | undefined
  pending: boolean
  redeemTxid: string
  roundTxid: string
  settled: boolean
  type: string
}

export enum Unit {
  BTC = 'btc',
  EUR = 'eur',
  USD = 'usd',
  SAT = 'sat',
}

export type Vtxo = {
  amount: number
  createdAt: string
  descriptor: string
  expireAt: number
  pending: boolean
  roundTxid: string
  redeemTx: string
  spent: boolean
  spentBy: string
  txid: string
  vout: number
}

export type Vtxos = {
  spendable: Vtxo[]
  spent: Vtxo[]
}

export type Wallet = {
  arkAddress: string
  balance: number
  explorer: string
  initialized: boolean
  lastUpdate: number
  lockedByBiometrics?: boolean
  network: string
  nextRollover: number
  txs: Tx[]
  vtxos: Vtxos
  wasmVersion: string
}
