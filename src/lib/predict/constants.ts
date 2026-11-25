import { networks, type Network, type NetworkName } from '@arkade-os/sdk'
import { fromRuntimeEnv } from '../constants'

export const PAIR = 'arkade:BTC->arkade:BTC-OPTION'
export const RFQ_KIND = 24859
export const POSITION_KIND = 30078
export const POSITION_TAG = 'arkade-option'
export const PREDICT_VAULT_PROGRAM_ID = 'PredictVaultV2'

export const DUST_SATS = 330n
export const BEACON_READ_FEE = 1_000n
export const QUOTE_TTL_S = 30
export const PRICE_MAX = 1_000_000_000n
export const VAULT_EXPIRY_LAG = 60n

export const DEFAULT_RELAYS = ['wss://nostr.arkade.sh']

export type PredictKind = 2 | 3 // 2 = Higher, 3 = Lower

export const PREDICT_GRID_S = 300
export const PREDICT_LOCK_S = 60
export const PREDICT_MIN_LEFT_S = 60
export const PREDICT_MAX_AHEAD_S = 3600
export const STAKE_MIN = 10_000n
export const STAKE_MAX_MUTINYNET = 1_000_000n
export const STAKE_MAX_MAINNET = 100_000n
export const Q_MAX_MUTINYNET = 1_000_000_000n
export const Q_MAX_MAINNET = 50_000_000n

export const PREDICT_EDGE = 0.05
export const MULTIPLIER_MIN = 1.05
export const MULTIPLIER_MAX = 10
export const PREDICT_VOID_AFTER = 86_400n

export const MUTINYNET_EXIT = 2048n
export const MUTINYNET_FALLBACK_DELAY = 22_016n
export const MUTINYNET_FINAL_EXIT_DELAY = 108_032n

export const MAINNET_EXIT = 605_184n
export const MAINNET_FALLBACK_DELAY = 605_184n
export const MAINNET_FINAL_EXIT_DELAY = 691_200n

export type PredictNetworkId = 'bitcoin' | 'mutinynet' | 'regtest' | 'testnet' | 'signet'

export interface PredictNetworkProfile {
  id: PredictNetworkId
  label: string
  isMainnet: boolean
  network: Network
  hrp: string
  arkUrl: string
  emulatorUrl: string
  executorUrl: string
  exit: bigint
  voidAfter: bigint
  fallbackDelay: bigint
  finalExitDelay: bigint
  qMax: bigint
  stakeMin: bigint
  stakeMax: bigint
}

export interface PredictDeskConfig {
  name: string
  pubkey: string
}

export interface PredictBeaconStatus {
  pubkeys: string[]
  assetId: string
  issueTxid: string
  address: string
  args: {
    ctrlTxid: string
    domain: string
    expiryLag: number
    readFee: number
    adminPk: string
    exit: number
  }
}

export interface PredictConfig {
  enabled: boolean
  demoMode: boolean
  profile: PredictNetworkProfile
  relays: string[]
  desks: PredictDeskConfig[]
  backupPubkey: string | null
  beacon: PredictBeaconStatus
  oraclePricesUrl: string
}

const PROFILES: Record<PredictNetworkId, PredictNetworkProfile> = {
  bitcoin: {
    id: 'bitcoin',
    label: 'Bitcoin',
    isMainnet: true,
    network: networks.bitcoin,
    hrp: networks.bitcoin.hrp,
    arkUrl: 'https://arkade.computer',
    emulatorUrl: 'https://emulator.arkade.computer',
    executorUrl: 'https://executor.arkade.sh',
    exit: MAINNET_EXIT,
    voidAfter: PREDICT_VOID_AFTER,
    fallbackDelay: MAINNET_FALLBACK_DELAY,
    finalExitDelay: MAINNET_FINAL_EXIT_DELAY,
    qMax: Q_MAX_MAINNET,
    stakeMin: STAKE_MIN,
    stakeMax: STAKE_MAX_MAINNET,
  },
  mutinynet: {
    id: 'mutinynet',
    label: 'Mutinynet',
    isMainnet: false,
    network: networks.mutinynet,
    hrp: networks.mutinynet.hrp,
    arkUrl: 'https://mutinynet.arkade.sh',
    emulatorUrl: 'https://emulator.mutinynet.arkade.sh',
    executorUrl: 'https://executor.mutinynet.arkade.sh',
    exit: MUTINYNET_EXIT,
    voidAfter: PREDICT_VOID_AFTER,
    fallbackDelay: MUTINYNET_FALLBACK_DELAY,
    finalExitDelay: MUTINYNET_FINAL_EXIT_DELAY,
    qMax: Q_MAX_MUTINYNET,
    stakeMin: STAKE_MIN,
    stakeMax: STAKE_MAX_MUTINYNET,
  },
  regtest: {
    id: 'regtest',
    label: 'Regtest',
    isMainnet: false,
    network: networks.regtest,
    hrp: networks.regtest.hrp,
    arkUrl: 'http://127.0.0.1:7070',
    emulatorUrl: 'http://127.0.0.1:7073',
    executorUrl: '',
    exit: MUTINYNET_EXIT,
    voidAfter: PREDICT_VOID_AFTER,
    fallbackDelay: MUTINYNET_FALLBACK_DELAY,
    finalExitDelay: MUTINYNET_FINAL_EXIT_DELAY,
    qMax: Q_MAX_MUTINYNET,
    stakeMin: STAKE_MIN,
    stakeMax: STAKE_MAX_MUTINYNET,
  },
  testnet: {
    id: 'testnet',
    label: 'Testnet',
    isMainnet: false,
    network: networks.testnet,
    hrp: networks.testnet.hrp,
    arkUrl: 'https://mutinynet.arkade.sh',
    emulatorUrl: 'https://emulator.mutinynet.arkade.sh',
    executorUrl: 'https://executor.mutinynet.arkade.sh',
    exit: MUTINYNET_EXIT,
    voidAfter: PREDICT_VOID_AFTER,
    fallbackDelay: MUTINYNET_FALLBACK_DELAY,
    finalExitDelay: MUTINYNET_FINAL_EXIT_DELAY,
    qMax: Q_MAX_MUTINYNET,
    stakeMin: STAKE_MIN,
    stakeMax: STAKE_MAX_MUTINYNET,
  },
  signet: {
    id: 'signet',
    label: 'Signet',
    isMainnet: false,
    network: networks.signet,
    hrp: networks.signet.hrp,
    arkUrl: 'https://mutinynet.arkade.sh',
    emulatorUrl: 'https://emulator.mutinynet.arkade.sh',
    executorUrl: 'https://executor.mutinynet.arkade.sh',
    exit: MUTINYNET_EXIT,
    voidAfter: PREDICT_VOID_AFTER,
    fallbackDelay: MUTINYNET_FALLBACK_DELAY,
    finalExitDelay: MUTINYNET_FINAL_EXIT_DELAY,
    qMax: Q_MAX_MUTINYNET,
    stakeMin: STAKE_MIN,
    stakeMax: STAKE_MAX_MUTINYNET,
  },
}

// Live Bitcoin mainnet COINFLIP production pins (verified from coinflip-mainnet-production.up.railway.app).
export const MAINNET_DESK: PredictDeskConfig = {
  name: 'COINFLIP',
  pubkey: '5e38115019ef7f12437ac8c9aa92205ed937c7c737e9d1c2100fffe104c34ed3',
}

export const MAINNET_BACKUP_PUBKEY = '0d81ac7eff0c1d6263ee37ee8e7e966f5a23b6ab4be34184b568e69c140f27c5'

export const MAINNET_BEACON_STATUS: PredictBeaconStatus = {
  pubkeys: ['8fe6e977203e72ed451ac868119134793fb319757e9f902f16ab778d0241bde4'],
  assetId: '659d1a9b6b73ab12a06a57eae4f57b82dfeb4dfc4f396edd8898f3768fcd83e30000',
  issueTxid: '659d1a9b6b73ab12a06a57eae4f57b82dfeb4dfc4f396edd8898f3768fcd83e3',
  address:
    'ark1qzpq904am6clw3pgqwyh4p02708fy4xs0hcpwt7rwfdttuxsjamect9lvzlx9f8mngcuw5726v07gcqdhveuceslj8sxjtukzanf8hra6kwf8t',
  args: {
    ctrlTxid: 'e383cd8f76f39888dd6e394ffc4debdf827bf5e4ea576aa012ab736b9b1a9d65',
    domain: '4254435553442d464958',
    expiryLag: 60,
    readFee: 1000,
    adminPk: '8fe6e977203e72ed451ac868119134793fb319757e9f902f16ab778d0241bde4',
    exit: 605184,
  },
}

export const MUTINYNET_DESK: PredictDeskConfig = {
  name: 'Mutinynet',
  pubkey: 'eb36be79b231beeecbea9609767139974137d1f5dbaab56f19396bda3f07edc9',
}

export const MUTINYNET_BEACON_STATUS: PredictBeaconStatus = {
  pubkeys: ['e96d459a88359d713db09e7b226644b84765ac33b0b84f4cb60bc9d39ffb5bbe'],
  assetId: '58db69a7a8a64cd1b16fa7ec4dba2c49a62815d88d0f7a660e216c0206e975c20000',
  issueTxid: '58db69a7a8a64cd1b16fa7ec4dba2c49a62815d88d0f7a660e216c0206e975c2',
  address:
    'tark1qqcpq7yq3e8hhsx6ml3fud93m7827qggaurtzu3zwsr4a0qs0gf849c8k9fmuplslxvex94jqct8d58l229c0jh2seve4ky0n3xy0rjwr978pd',
  args: {
    ctrlTxid: 'c275e906026c210e667a0f8dd81528a6492cba4deca76fb1d14ca6a8a769db58',
    domain: '4254435553442d464958',
    expiryLag: 60,
    readFee: 1000,
    adminPk: 'e96d459a88359d713db09e7b226644b84765ac33b0b84f4cb60bc9d39ffb5bbe',
    exit: 2048,
  },
}

export function normalizePredictNetwork(name?: NetworkName | string | null): PredictNetworkId {
  const clean = name?.trim().toLowerCase() ?? ''
  if (clean === 'mainnet' || clean === 'bitcoin' || clean === '') return 'bitcoin'
  if (clean === 'mutinynet') return 'mutinynet'
  if (clean === 'regtest') return 'regtest'
  if (clean === 'testnet') return 'testnet'
  if (clean === 'signet') return 'signet'
  return 'bitcoin'
}

export function getPredictNetworkProfile(name?: NetworkName | string | null): PredictNetworkProfile {
  return PROFILES[normalizePredictNetwork(name)]
}

const HEX64 = /^[0-9a-f]{64}$/

export function getPredictConfig(network?: NetworkName | string | null, arkServerUrl?: string): PredictConfig {
  const baseProfile = getPredictNetworkProfile(network)
  const demoMode = fromRuntimeEnv(import.meta.env.VITE_PREDICT_DEMO) === 'true'
  const envDeskPubkey = fromRuntimeEnv(import.meta.env.VITE_PREDICT_DESK_PUBKEY)
    ?.trim()
    .toLowerCase()
  const envDeskName = fromRuntimeEnv(import.meta.env.VITE_PREDICT_DESK_NAME)?.trim()
  const envBackup = fromRuntimeEnv(import.meta.env.VITE_PREDICT_BACKUP_PUBKEY)
    ?.trim()
    .toLowerCase()
  const envRelays = fromRuntimeEnv(import.meta.env.VITE_PREDICT_RELAYS)
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const envEmulatorUrl = fromRuntimeEnv(import.meta.env.VITE_PREDICT_EMULATOR_URL)
  const envExecutorUrl = fromRuntimeEnv(import.meta.env.VITE_PREDICT_EXECUTOR_URL)
  const envOracleUrl = fromRuntimeEnv(import.meta.env.VITE_PREDICT_ORACLE_URL)

  const defaultDesk = baseProfile.isMainnet ? MAINNET_DESK : MUTINYNET_DESK
  const desk: PredictDeskConfig =
    envDeskPubkey && HEX64.test(envDeskPubkey)
      ? { name: envDeskName || defaultDesk.name, pubkey: envDeskPubkey }
      : { name: envDeskName || defaultDesk.name, pubkey: defaultDesk.pubkey }

  const backupPubkey =
    envBackup && HEX64.test(envBackup) ? envBackup : baseProfile.isMainnet ? MAINNET_BACKUP_PUBKEY : null

  const profile: PredictNetworkProfile = {
    ...baseProfile,
    arkUrl: arkServerUrl || baseProfile.arkUrl,
    emulatorUrl: envEmulatorUrl || baseProfile.emulatorUrl,
    executorUrl: envExecutorUrl ?? baseProfile.executorUrl,
  }

  return {
    enabled: profile.id === 'bitcoin' || profile.id === 'mutinynet' || demoMode,
    demoMode,
    profile,
    relays: envRelays && envRelays.length > 0 ? envRelays : DEFAULT_RELAYS,
    desks: [desk],
    backupPubkey,
    beacon: baseProfile.isMainnet ? MAINNET_BEACON_STATUS : MUTINYNET_BEACON_STATUS,
    oraclePricesUrl: envOracleUrl || '/predict-api/oracle/prices',
  }
}
