import { Config } from '../lib/types'
import { ConfigContext } from './config'
import { consoleError } from '@/lib/logs'
import { NostrStorage } from '@/lib/nostr'
import { readSolverCards, saveSolverCards } from '@/lib/solverCards'
import { LocalCardInput } from '@arkade-os/solver-discovery'
import { createContext, useContext, useRef, type ReactNode } from 'react'
import { mergeCash, type CashRecord } from '../lib/arkadeCashTransfer'
import { mergeBackupSnapshots } from '../lib/cashBackup'
import { hex } from '@scure/base'

interface BackupContextProps {
  backupAndUpdateConfig: (config: Config) => void
  backupConfig: (config: Config, force?: boolean) => Promise<void>
  backupSolverCards: (cards: LocalCardInput[], config?: Config) => Promise<void>
  fullBackup: (config: Config) => Promise<void>
  initialiseNostrBackup: (key: Uint8Array) => void
  restore: (key: Uint8Array) => Promise<void>
  getCashRecords: () => CashRecord[]
  backupCashRecords: (records: CashRecord[], config?: Config) => Promise<void>
}

export const BackupContext = createContext<BackupContextProps>({
  backupConfig: async () => {},
  backupAndUpdateConfig: () => {},
  backupSolverCards: async () => {},
  initialiseNostrBackup: () => {},
  fullBackup: async () => {},
  restore: async () => {},
  getCashRecords: () => [],
  backupCashRecords: async () => {},
})

export function BackupProvider({ children }: { children: ReactNode }) {
  const { config, updateConfig } = useContext(ConfigContext)
  const storage = useRef<NostrStorage | null>(null)
  const configRef = useRef(config)
  const cashRecords = useRef<CashRecord[]>([])
  const cashKey = useRef<string>()
  configRef.current = config

  const initialiseNostrBackup = (key: Uint8Array) => {
    try {
      const nextKey = hex.encode(key)
      if (cashKey.current && cashKey.current !== nextKey) cashRecords.current = []
      cashKey.current = nextKey
      storage.current = new NostrStorage(key)
    } catch (err) {
      consoleError(err, 'Failed to initialize Nostr backup')
    }
  }

  const backupConfig = async (next: Config, force = false) => {
    if (!next.nostrBackup && !force) return
    await storage.current?.save(JSON.stringify({ config: next }))
  }

  const backupAndUpdateConfig = (next: Config) => {
    void backupConfig(next).catch((err) => consoleError(err, 'Backup config failed'))
    updateConfig(next)
  }

  const backupSolverCards = async (cards: LocalCardInput[], override?: Config) => {
    if (!(override ?? configRef.current).nostrBackup) return
    await storage.current?.save(JSON.stringify({ solverCards: cards }))
  }

  const fullBackup = async (next: Config) => {
    await backupConfig(next)
    const cards = readSolverCards()
    await backupCashRecords(cashRecords.current, next)
    if (cards.length) {
      await backupSolverCards(cards, next)
    }
  }

  const backupCashRecords = async (records: CashRecord[], override?: Config) => {
    cashRecords.current = records
    const current = override ?? configRef.current
    const key = storage.current
    if (!current.nostrBackup || !key) return
    const snapshot = { records, updatedAt: Math.floor(Date.now() / 1000) }
    await key.save(JSON.stringify({ cash: snapshot }))
  }

  const restore = async (key: Uint8Array) => {
    const incoming = new NostrStorage(key)
    const events = await incoming.load()
    const snapshots: { records: CashRecord[]; updatedAt: number }[] = []
    const loaded: { config?: Config; solverCards?: LocalCardInput[] } = {}
    const sorted = events.sort(
      (a, b) => Math.min(a.created_at, a.receivedAt) - Math.min(b.created_at, b.receivedAt) || a.id.localeCompare(b.id),
    )
    for (const event of sorted) {
      if (!event.content) continue
      let data: any
      try {
        data = JSON.parse(event.content)
      } catch (err) {
        consoleError(err, 'Failed to parse Nostr backup event')
        continue
      }
      if (data.config) {
        loaded.config = data.config
      }
      if (data.cash?.records) {
        try {
          snapshots.push({
            records: data.cash.records,
            updatedAt: data.cash.updatedAt ?? event.created_at,
          })
        } catch (err) {
          consoleError(err, 'Could not recover a Cash backup')
        }
      }
      if (data.solverCards) {
        try {
          loaded.solverCards = data.solverCards
        } catch (err) {
          consoleError(err, 'Failed to restore solver cards')
        }
      }
    }
    if (loaded.config) updateConfig({ ...loaded.config, aspUrl: configRef.current.aspUrl, delegate: true })
    if (loaded.solverCards) {
      try {
        saveSolverCards(loaded.solverCards)
      } catch (err) {
        consoleError(err, 'Failed to restore solver cards')
      }
    }
    cashRecords.current = mergeCash(cashRecords.current, mergeBackupSnapshots(snapshots.map((cash) => ({ cash }))))
    storage.current = incoming
  }

  return (
    <BackupContext.Provider
      value={{
        backupConfig,
        backupAndUpdateConfig,
        backupSolverCards,
        fullBackup,
        initialiseNostrBackup,
        restore,
        getCashRecords: () => cashRecords.current,
        backupCashRecords,
      }}
    >
      {children}
    </BackupContext.Provider>
  )
}
