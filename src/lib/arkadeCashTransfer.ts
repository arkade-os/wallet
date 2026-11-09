import { ArkadeCash, type ArkadeCashRecord } from '@arkade-os/sdk'

export interface CashRecord extends ArkadeCashRecord {
  token?: string
  status?: string
  updatedAt: number
}

export interface CashRecordStore {
  load(): Promise<CashRecord[]>
  save(records: CashRecord[]): Promise<void>
  clear(): Promise<void>
}

export const parseCashToken = (value: string): string => {
  const token = value.trim().replace(/^web\+arkade:\/\//i, '')
  if (!token) throw new Error('Not an Arkade Cash token')
  return ArkadeCash.fromString(token).toString()
}

export const mergeCash = (left: CashRecord[], right: CashRecord[]) => {
  const map = new Map<string, CashRecord>()
  for (const record of [...left, ...right]) {
    const old = map.get(record.id)
    const stamp = record.updatedAt ?? record.createdAt
    const oldStamp = old?.updatedAt ?? old?.createdAt ?? 0
    if (old && oldStamp > stamp) continue
    const { token: nextToken, ...publicRecord } = record
    map.set(record.id, {
      ...old,
      ...publicRecord,
      token: 'token' in record ? nextToken : old?.token,
      claimTxIds: record.claimTxIds,
      issueTxIds: record.issueTxIds,
      updatedAt: Math.max(record.updatedAt, old?.updatedAt ?? 0),
    })
  }
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt)
}

export const cashStatusLabel = (status: string | undefined, action: 'issued' | 'claimed') => {
  if (status === 'available') return action === 'issued' ? 'Unclaimed' : 'Available'
  if (status === 'recovering') return 'Recovery in progress'
  if (status === 'unissued') return 'Checking funding'
  if (status === 'claimed') return 'Claimed'
  if (status === 'sweep-pending') return 'Claim settling'
  if (status === 'expired') return 'Expired'
  if (status === 'exitable') return 'Ready to reclaim'
  if (status === 'exited') return 'Exited'
  return 'Checking status'
}
