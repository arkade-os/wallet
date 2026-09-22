import type { ArkTransaction } from '@arkade-os/sdk'
import { isCanonicalTxid } from './carrierActivity'
import { txidOfArkTransaction } from './transactionHistory'

const MAX_SATS = 2_100_000_000_000_000n
const MAX_ASSET_AMOUNT = 18_446_744_073_709_551_615n
const DECIMAL = /^(0|[1-9][0-9]*)$/
const ASSET_ID = /^[0-9a-f]{68}$/
const DIRECTIONS = ['sent', 'received'] as const

export type ActivityEvidenceDirection = (typeof DIRECTIONS)[number]

export interface ActivityEvidenceAsset {
  assetId: string
  amount: string
}

export interface ActivityEvidenceContribution {
  txid: string
  direction: ActivityEvidenceDirection
  sats: string
  assets: ActivityEvidenceAsset[]
}

export interface ActivityEvidence {
  version: 1
  contributions: ActivityEvidenceContribution[]
}

export interface ActivityEvidenceOperation {
  id: string
  fundingTxid: string
  spentTxid?: string
  fromAsset: string
  toAsset: string
  activityEvidence?: unknown
}

export interface AllocatedContribution {
  txid: string
  direction: ActivityEvidenceDirection
  sats: bigint
  assets: { assetId: string; amount: bigint }[]
}

export interface SwapActivityAllocation {
  status: 'missing' | 'invalid' | 'valid'
  contributions: AllocatedContribution[]
  funding?: AllocatedContribution
  fill?: AllocatedContribution
}

export interface MemberActivityAllocation {
  tx: ArkTransaction
  txid: string
  direction: ActivityEvidenceDirection
  allocations: { swapId: string; contribution: AllocatedContribution }[]
  remainderSats: bigint
  remainderAssets: { assetId: string; amount: bigint }[]
}

export interface ActivityEvidenceAllocation {
  member(tx: ArkTransaction): MemberActivityAllocation | undefined
  members(): MemberActivityAllocation[]
  swap(id: string): SwapActivityAllocation | undefined
}

export class ActivityEvidenceError extends Error {
  readonly field: string

  constructor(field: string) {
    super(`invalid activity evidence: ${field}`)
    this.name = 'ActivityEvidenceError'
    this.field = field
  }
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined

const exactFields = (raw: Record<string, unknown>, fields: readonly string[], path: string): void => {
  const allowed = new Set(fields)
  for (const key of Object.keys(raw)) if (!allowed.has(key)) throw new ActivityEvidenceError(`${path}.${key}`)
}

const decimal = (value: unknown, max: bigint, field: string, positive = false): bigint => {
  if (typeof value !== 'string' || !DECIMAL.test(value)) throw new ActivityEvidenceError(field)
  const amount = BigInt(value)
  if (amount > max || (positive && amount === 0n)) throw new ActivityEvidenceError(field)
  return amount
}

const isCanonicalAssetId = (value: unknown): value is string =>
  typeof value === 'string' && ASSET_ID.test(value) && !/^0{64}/.test(value)

export const parseActivityEvidence = (value: unknown): ActivityEvidence => {
  const raw = asRecord(value)
  if (!raw) throw new ActivityEvidenceError('activityEvidence')
  exactFields(raw, ['version', 'contributions'], 'activityEvidence')
  if (raw.version !== 1) throw new ActivityEvidenceError('version')
  if (!Array.isArray(raw.contributions)) throw new ActivityEvidenceError('contributions')
  const memberKeys = new Set<string>()
  const contributions = raw.contributions.map((value, contributionIndex): ActivityEvidenceContribution => {
    const path = `contributions[${contributionIndex}]`
    const contribution = asRecord(value)
    if (!contribution) throw new ActivityEvidenceError(path)
    exactFields(contribution, ['txid', 'direction', 'sats', 'assets'], path)
    if (!isCanonicalTxid(contribution.txid)) throw new ActivityEvidenceError(`${path}.txid`)
    if (typeof contribution.direction !== 'string' || !DIRECTIONS.includes(contribution.direction as never)) {
      throw new ActivityEvidenceError(`${path}.direction`)
    }
    const direction = contribution.direction as ActivityEvidenceDirection
    const key = `${contribution.txid}:${direction}`
    if (memberKeys.has(key)) throw new ActivityEvidenceError(path)
    memberKeys.add(key)
    const sats = decimal(contribution.sats, MAX_SATS, `${path}.sats`)
    if (!Array.isArray(contribution.assets)) throw new ActivityEvidenceError(`${path}.assets`)
    const assetIds = new Set<string>()
    const assets = contribution.assets.map((value, assetIndex): ActivityEvidenceAsset => {
      const assetPath = `${path}.assets[${assetIndex}]`
      const asset = asRecord(value)
      if (!asset) throw new ActivityEvidenceError(assetPath)
      exactFields(asset, ['assetId', 'amount'], assetPath)
      if (!isCanonicalAssetId(asset.assetId) || assetIds.has(asset.assetId)) {
        throw new ActivityEvidenceError(`${assetPath}.assetId`)
      }
      assetIds.add(asset.assetId)
      const amount = decimal(asset.amount, MAX_ASSET_AMOUNT, `${assetPath}.amount`, true)
      return { assetId: asset.assetId, amount: amount.toString() }
    })
    return { txid: contribution.txid, direction, sats: sats.toString(), assets }
  })
  return { version: 1, contributions }
}

export const readActivityEvidence = (value: unknown): ActivityEvidence | undefined => {
  try {
    return parseActivityEvidence(value)
  } catch {
    return undefined
  }
}

const directionOf = (tx: ArkTransaction): ActivityEvidenceDirection | undefined =>
  tx.type === 'SENT' ? 'sent' : tx.type === 'RECEIVED' ? 'received' : undefined

const memberKey = (txid: string, direction: ActivityEvidenceDirection): string => `${txid}:${direction}`

const contributionOf = (value: ActivityEvidenceContribution): AllocatedContribution => ({
  txid: value.txid,
  direction: value.direction,
  sats: BigInt(value.sats),
  assets: value.assets.map((asset) => ({ assetId: asset.assetId, amount: BigInt(asset.amount) })),
})

interface RawMember {
  tx: ArkTransaction
  txid: string
  direction: ActivityEvidenceDirection
  valid: boolean
  conflict: boolean
  sats: bigint
  assets: Map<string, bigint>
  signs: Map<string, bigint>
  signature: string
}

const rawMember = (tx: ArkTransaction): RawMember | undefined => {
  const txid = txidOfArkTransaction(tx)
  const direction = directionOf(tx)
  if (!isCanonicalTxid(txid) || !direction) return undefined
  let valid = Number.isSafeInteger(tx.amount) && Number.isFinite(tx.amount)
  const sats = valid ? BigInt(Math.abs(tx.amount)) : 0n
  if (sats > MAX_SATS) valid = false
  const assets = new Map<string, bigint>()
  const signs = new Map<string, bigint>()
  const signatureAssets: string[] = []
  if (tx.assets !== undefined && !Array.isArray(tx.assets)) valid = false
  for (const asset of Array.isArray(tx.assets) ? tx.assets : []) {
    signatureAssets.push(`${String(asset?.assetId)}:${typeof asset?.amount}:${String(asset?.amount)}`)
    if (!isCanonicalAssetId(asset?.assetId) || typeof asset?.amount !== 'bigint' || asset.amount === 0n) {
      valid = false
      continue
    }
    const magnitude = asset.amount < 0n ? -asset.amount : asset.amount
    if (magnitude > MAX_ASSET_AMOUNT || assets.has(asset.assetId)) {
      valid = false
      continue
    }
    assets.set(asset.assetId, magnitude)
    signs.set(asset.assetId, asset.amount < 0n ? -1n : 1n)
  }
  signatureAssets.sort()
  return {
    tx,
    txid,
    direction,
    valid,
    conflict: false,
    sats,
    assets,
    signs,
    signature: `${typeof tx.amount}:${String(tx.amount)}|${valid}|${signatureAssets.join(',')}`,
  }
}

const evidenceState = (operation: ActivityEvidenceOperation): SwapActivityAllocation => {
  if (!Object.prototype.hasOwnProperty.call(operation, 'activityEvidence')) {
    return { status: 'missing', contributions: [] }
  }
  const evidence = readActivityEvidence(operation.activityEvidence)
  return evidence
    ? { status: 'valid', contributions: evidence.contributions.map(contributionOf) }
    : { status: 'invalid', contributions: [] }
}

const operationSignature = (operation: ActivityEvidenceOperation, state: SwapActivityAllocation): string =>
  JSON.stringify({
    fundingTxid: operation.fundingTxid,
    spentTxid: operation.spentTxid,
    fromAsset: operation.fromAsset,
    toAsset: operation.toAsset,
    status: state.status,
    contributions: state.contributions.map((contribution) => ({
      ...contribution,
      sats: contribution.sats.toString(),
      assets: contribution.assets.map((asset) => ({ ...asset, amount: asset.amount.toString() })),
    })),
  })

export const allocateActivityEvidence = (
  operations: ActivityEvidenceOperation[],
  transactions: ArkTransaction[],
): ActivityEvidenceAllocation => {
  const operationById = new Map<
    string,
    { operation: ActivityEvidenceOperation; state: SwapActivityAllocation; signature: string }
  >()
  for (const operation of operations) {
    if (!operation.id) continue
    const state = evidenceState(operation)
    const signature = operationSignature(operation, state)
    const existing = operationById.get(operation.id)
    if (!existing) operationById.set(operation.id, { operation, state, signature })
    else if (existing.signature !== signature) existing.state = { status: 'invalid', contributions: [] }
  }

  const rawByKey = new Map<string, RawMember>()
  for (const tx of transactions) {
    const raw = rawMember(tx)
    if (!raw) continue
    const key = memberKey(raw.txid, raw.direction)
    const existing = rawByKey.get(key)
    if (!existing) rawByKey.set(key, raw)
    else if (existing.signature !== raw.signature) existing.conflict = true
  }

  const candidates = new Map<string, { swapId: string; contribution: AllocatedContribution }[]>()
  for (const [swapId, { state }] of operationById) {
    if (state.status !== 'valid') continue
    for (const contribution of state.contributions) {
      const key = memberKey(contribution.txid, contribution.direction)
      candidates.set(key, [...(candidates.get(key) ?? []), { swapId, contribution }])
    }
    state.contributions = []
  }

  const projections = new Map<string, MemberActivityAllocation>()
  for (const [key, raw] of rawByKey) {
    const allocations = candidates.get(key) ?? []
    let accepted = raw.valid && !raw.conflict
    let sats = 0n
    const assets = new Map<string, bigint>()
    for (const { contribution } of allocations) {
      sats += contribution.sats
      for (const asset of contribution.assets)
        assets.set(asset.assetId, (assets.get(asset.assetId) ?? 0n) + asset.amount)
    }
    if (sats > raw.sats) accepted = false
    for (const [assetId, amount] of assets) if (amount > (raw.assets.get(assetId) ?? -1n)) accepted = false
    const verified = accepted ? allocations : []
    for (const allocation of verified) {
      const entry = operationById.get(allocation.swapId)
      if (!entry || entry.state.status !== 'valid') continue
      entry.state.contributions.push(allocation.contribution)
      if (
        allocation.contribution.direction === 'sent' &&
        allocation.contribution.txid === entry.operation.fundingTxid
      ) {
        entry.state.funding = allocation.contribution
      }
      if (
        allocation.contribution.direction === 'received' &&
        allocation.contribution.txid === entry.operation.spentTxid
      ) {
        entry.state.fill = allocation.contribution
      }
    }
    const allocatedAssets = accepted ? assets : new Map<string, bigint>()
    projections.set(key, {
      tx: raw.tx,
      txid: raw.txid,
      direction: raw.direction,
      allocations: verified,
      remainderSats: raw.sats - (accepted ? sats : 0n),
      remainderAssets: [...raw.assets].flatMap(([assetId, amount]) => {
        const remainder = amount - (allocatedAssets.get(assetId) ?? 0n)
        return remainder > 0n ? [{ assetId, amount: remainder * (raw.signs.get(assetId) ?? 1n) }] : []
      }),
    })
  }

  return {
    member(tx) {
      const txid = txidOfArkTransaction(tx)
      const direction = directionOf(tx)
      return direction ? projections.get(memberKey(txid, direction)) : undefined
    },
    members: () => [...projections.values()],
    swap: (id) => operationById.get(id)?.state,
  }
}
