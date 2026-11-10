import { mergeCash, type CashRecord } from './arkadeCashTransfer'

export interface CashBackup {
  records: CashRecord[]
  updatedAt: number
}

export function mergeBackupSnapshots(events: { cash?: CashBackup }[]): CashRecord[] {
  const ordered = [...events].sort((a, b) => (a.cash?.updatedAt ?? 0) - (b.cash?.updatedAt ?? 0))
  const active = new Map<string, string | undefined>()
  const stamps = new Map<string, number>()
  const records = new Map<string, CashRecord>()
  for (const event of ordered) {
    if (!event.cash) continue
    const eventTime = event.cash.updatedAt * 1000
    for (const record of event.cash.records) {
      active.set(record.id, record.token)
      const previous = stamps.get(record.id)
      if (previous !== undefined && previous > record.updatedAt) continue
      if (previous === record.updatedAt && records.get(record.id)?.token) continue
      stamps.set(record.id, Math.max(record.updatedAt, eventTime))
      records.set(record.id, { ...record, updatedAt: Math.max(record.updatedAt, eventTime) })
    }
  }
  return mergeCash(
    [],
    [...records.values()].map((record) => ({ ...record, token: active.get(record.id) })),
  )
}
