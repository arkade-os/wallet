import { Config } from '../lib/types'
import { ConfigContext } from './config'
import { consoleError } from '@/lib/logs'
import { BackupEvent, NostrStorage } from '@/lib/nostr'
import { readSolverCardsFromStorage, saveSolverCardsToStorage } from '@/lib/storage'
import { LocalCardInput } from '@arkade-os/solver-discovery'
import { ReactNode, createContext, useContext, useEffect, useRef } from 'react'

/**
 * What this wallet backs up to Nostr. Events written by older versions also
 * carry Boltz swap arrays; those keys are simply not read any more — the
 * loader ignores unknown fields, so an old backup still restores its config
 * and solver cards rather than failing.
 */
type NostrStorageData = {
  config?: Config
  solverCards?: LocalCardInput[]
}

type BackupContextProps = {
  backupAndUpdateConfig: (config: Config) => void
  backupConfig: (config: Config) => Promise<void>
  backupSolverCards: (solverCards: LocalCardInput[]) => Promise<void>
  fullBackup: (config: Config) => Promise<void>
  restore: (secKey: Uint8Array) => Promise<void>
}

export const BackupContext = createContext<BackupContextProps>({
  backupConfig: async () => {},
  backupAndUpdateConfig: () => {},
  backupSolverCards: async () => {},
  fullBackup: async () => {},
  restore: async () => {},
})

export const BackupProvider = ({ children }: { children: ReactNode }) => {
  const { config, updateConfig } = useContext(ConfigContext)

  const nostrStorage = useRef<NostrStorage | null>(null)

  // restore() awaits the network for up to 10s, so a closed-over config can still
  // be the pre-hydration default by the time it resolves (see wallet.tsx)
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  }, [config])

  // initialize NostrStorage when we have a pubkey and nostrBackup is enabled
  useEffect(() => {
    if (!config.pubkey || !config.nostrBackup) return
    try {
      nostrStorage.current = new NostrStorage({ pubkey: config.pubkey })
    } catch (err) {
      consoleError(err, 'Failed to initialize NostrStorage:')
    }
  }, [config.pubkey, config.nostrBackup])

  /**
   * backup config to Nostr
   * @param config Config to backup
   */
  const backupConfig = async (config: Config) => {
    const data: NostrStorageData = { config }
    await nostrStorage.current?.save(JSON.stringify(data))
    if (!config.nostrBackup) nostrStorage.current = null
  }

  const backupAndUpdateConfig = (config: Config) => {
    backupConfig(config).catch((err) => consoleError(err, 'backupAndUpdateConfig:'))
    updateConfig(config)
  }

  /**
   * backup solver cards to Nostr
   * @param solverCards LocalCardInput[] to backup
   */
  const backupSolverCards = async (solverCards: LocalCardInput[]) => {
    const data: NostrStorageData = { solverCards }
    await nostrStorage.current?.save(JSON.stringify(data))
  }

  /**
   * does a full backup of config and solver cards to Nostr
   * @param config
   */
  const fullBackup = async (config: Config) => {
    const solverCards = readSolverCardsFromStorage()
    if (!solverCards.length) return backupConfig(config)
    await backupConfig(config)
    await backupSolverCards(solverCards)
  }

  /**
   * Restore data from Nostr
   * @param seckey secKey to restore data from Nostr
   */
  const restore = async (seckey: Uint8Array) => {
    const provider = new NostrStorage({ seckey })

    const data = (await loadData(provider)) as NostrStorageData

    // we enforce delegates on restore, and the server stays the locally configured one
    if (data?.config) updateConfig({ ...data.config, aspUrl: configRef.current.aspUrl, delegate: true })

    if (data?.solverCards) saveSolverCardsToStorage(data.solverCards)
  }

  /**
   * Initially data was saved in a unique event, until we reached the size limit.
   * Now we can have multiple events, so we need to load and merge them.
   * Events are sorted to have a deterministic order.
   * The map in swaps is used to avoid duplicates and use the latest data.
   * @returns Data stored on Nostr
   */
  const loadData = async (provider?: NostrStorage): Promise<NostrStorageData> => {
    const nostrProvider = provider ?? nostrStorage.current

    if (!nostrProvider) return { config: undefined, solverCards: [] }

    const loaded = {
      config: null as Config | null,
      solverCards: [] as LocalCardInput[],
    }

    const events = await nostrProvider.load()

    // An event ranks by the earlier of its own timestamp and its arrival, so its
    // position never depends on a clock we don't control. Ids break ties.
    const sortKey = (e: BackupEvent) => Math.min(e.created_at, e.receivedAt)
    const sorted = events.sort((a, b) => sortKey(a) - sortKey(b) || a.id.localeCompare(b.id))

    for (const event of sorted) {
      if (!event.content) continue

      let data: NostrStorageData | null = null
      try {
        data = JSON.parse(event.content) as NostrStorageData
      } catch (err) {
        consoleError(err, 'Failed to parse Nostr backup event')
        continue
      }
      if (!data) continue

      if (data.config) loaded.config = data.config

      if (data.solverCards) loaded.solverCards = data.solverCards
    }

    return { config: loaded.config ?? undefined, solverCards: loaded.solverCards }
  }

  return (
    <BackupContext.Provider
      value={{
        backupConfig,
        backupSolverCards,
        backupAndUpdateConfig,
        fullBackup,
        restore,
      }}
    >
      {children}
    </BackupContext.Provider>
  )
}
