import { IWallet } from '@arklabs/wallet-sdk'

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
  theme: Themes
  unit: Unit
}

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

export type Wallet = {
  arkAddress: string
  balance: number
  explorer: string
  initialized: boolean
  lastUpdate: number
  lockedByBiometrics?: boolean
  network: string
  nextRollover: number
  passkeyId?: string
  txs: Tx[]
  vtxos: Awaited<ReturnType<IWallet['getVtxos']>>
  // set when wallet is unlocked
  // TODO safe???
  seed?: Uint8Array
}
