import {
  RestDelegateeProvider,
  timelockToSequence,
  watchDelegateeContracts,
  type DelegateeContractKeys,
  type DelegateeDelegationDetails,
  type DelegateeInfo,
  type DelegateeWatchRegistration,
  type DelegationParams,
  type NetworkName,
  type ServiceWorkerWallet,
} from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { AspInfo } from '../providers/asp'
import { getEmulatorPubkeyForNetwork } from './constants'

/** What restores one watch: the template and the variables the wallet registered, and its address. */
export type DelegationRecord = Pick<DelegateeWatchRegistration, 'address' | 'templateId' | 'variables'>

/**
 * The delegation under the default templates: the renewal address holding the delegated VTXOs, the
 * boarding address for on-chain deposits, and what derives both from the wallet's key alone.
 */
export type Delegation = {
  keys: DelegateeContractKeys
  params: DelegationParams
  renewal: DelegationRecord
  boarding: DelegationRecord
}

/** The renewal watch's state at the service: its VTXOs and when the next one is renewed. */
export type DelegationStatus = {
  renewal: DelegateeDelegationDetails
  /** Satoshis the service holds at the renewal address. */
  delegated: number
  /** Unix seconds of the next renewal, if a VTXO waits for one. */
  nextRenewal?: number
}

// About half a VTXO's life. regtest: the delegatee stack's arkd runs ARKD_VTXO_TREE_EXPIRY=512
// (docker-compose.regtest.yml); mutinynet and bitcoin: arkd's default of 604672 s (7 days,
// internal/config/config.go), no deployment-specific value is published. Change with the servers.
const RENEWAL_WINDOW_SECONDS: Record<NetworkName, number> = {
  bitcoin: 302336,
  mutinynet: 302336,
  signet: 302336,
  regtest: 256,
  testnet: 302336,
}

// the most a renewal may cost, in sats
const MAX_RENEWAL_FEE: Record<NetworkName, number> = {
  bitcoin: 300,
  mutinynet: 300,
  signet: 300,
  regtest: 100,
  testnet: 300,
}

type Keys = Pick<AspInfo, 'network' | 'signerPubkey'>

const xOnly = (key: string) => (key.length === 66 ? key.slice(2) : key).toLowerCase()

/** BIP 68 sequence of an arkd delay: blocks below 512, seconds from 512. */
const sequenceOf = (delay: bigint) =>
  Number(timelockToSequence({ value: delay, type: delay < 512n ? 'blocks' : 'seconds' }))

/** The params of this wallet's delegation: exit delays are the Ark server's, the rest per network. */
export const delegationParams = (
  aspInfo: Pick<AspInfo, 'network' | 'unilateralExitDelay' | 'boardingExitDelay'>,
): DelegationParams => ({
  exitDelay: sequenceOf(aspInfo.unilateralExitDelay),
  boardingExitDelay: sequenceOf(aspInfo.boardingExitDelay),
  renewalWindow: RENEWAL_WINDOW_SECONDS[aspInfo.network as NetworkName],
  maxFee: MAX_RENEWAL_FEE[aspInfo.network as NetworkName],
})

/** Throw unless the service works for this wallet's Ark server and, when pinned, its emulator. */
export const checkDelegateeKeys = (info: DelegateeInfo, aspInfo: Keys): void => {
  if (info.network !== aspInfo.network) throw new Error(`delegatee is on ${info.network}, not ${aspInfo.network}`)
  if (xOnly(info.serverPubkey) !== xOnly(aspInfo.signerPubkey)) {
    throw new Error('delegatee server key is not the Ark server key')
  }
  const emulator = getEmulatorPubkeyForNetwork(aspInfo.network as NetworkName)
  if (emulator && xOnly(info.emulatorPubkey) !== hex.encode(emulator)) {
    throw new Error('delegatee emulator key is not the configured emulator key')
  }
}

const record = ({ address, templateId, variables }: DelegateeWatchRegistration): DelegationRecord => ({
  address,
  templateId,
  variables,
})

let migration: Promise<Delegation> | undefined

/**
 * Migrate the wallet to the delegatee: register the renewal and boarding watches for its key, send
 * every VTXO still at an older contract (its own default or the retired delegator's) to the renewal
 * address and retire those contracts. Idempotent, so it runs at every startup and picks up coins
 * paid to a retired address since; concurrent calls share one run.
 */
export const enableDelegation = (wallet: ServiceWorkerWallet, aspInfo: AspInfo): Promise<Delegation> =>
  (migration ??= migrate(wallet, aspInfo).finally(() => (migration = undefined)))

const migrate = async (wallet: ServiceWorkerWallet, aspInfo: AspInfo): Promise<Delegation> => {
  const manager = await wallet.getDelegateeManager()
  if (!manager) throw new Error('delegatee is not configured')
  checkDelegateeKeys(await manager.getInfo(), aspInfo)
  await manager.defaultTemplates()
  const params = delegationParams(aspInfo)
  const boarding = await manager.registerBoarding(params)
  const renewal = await manager.delegateVtxos(params)
  return { keys: renewal.keys, params, renewal: record(renewal), boarding: record(boarding) }
}

/** Make the wallet watch its delegated contracts again, from config alone (restore, new device). */
export const watchDelegation = (wallet: ServiceWorkerWallet, delegation: Delegation) =>
  watchDelegateeContracts(wallet, delegation.keys, delegation.params)

/** Whether two delegations hold the same watches. */
export const sameDelegation = (a: unknown, b: Delegation): boolean =>
  isCurrentDelegation(a) && a.renewal.address === b.renewal.address && a.boarding.address === b.boarding.address

/** A delegation stored by an older wallet, under the retired templates, has no params. */
export const isCurrentDelegation = (delegation: unknown): delegation is Delegation =>
  typeof delegation === 'object' && delegation !== null && 'params' in delegation && 'renewal' in delegation

/** The renewal watch's state at the service. */
export const getDelegationStatus = async (delegateeUrl: string, delegation: Delegation): Promise<DelegationStatus> => {
  const renewal = await new RestDelegateeProvider(delegateeUrl).getDelegation(delegation.renewal.address)
  const due = renewal.vtxos.map((v) => v.renewableAt).filter((t): t is number => t !== undefined)
  return {
    renewal,
    delegated: renewal.vtxos.reduce((sum, v) => sum + v.amount, 0),
    nextRenewal: due.length > 0 ? Math.min(...due) : undefined,
  }
}
