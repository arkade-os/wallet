import {
  BoltzChainSwap,
  BoltzReverseSwap,
  BoltzSubmarineSwap,
  IndexedDbSwapRepository,
  ServiceWorkerArkadeSwaps,
} from '@arkade-os/boltz-swap'
import { Config } from '../lib/types'
import { ConfigContext } from './config'
import { consoleError } from '@/lib/logs'
import { BackupEvent, NostrStorage } from '@/lib/nostr'
import { readSolverCardsFromStorage, saveSolverCardsToStorage } from '@/lib/storage'
import { LocalCardInput } from '@arkade-os/solver-discovery'
import { ReactNode, createContext, useContext, useEffect, useRef } from 'react'

type NostrStorageData = {
  config?: Config
  reverseSwaps?: BoltzReverseSwap[]
  submarineSwaps?: BoltzSubmarineSwap[]
  chainSwaps?: BoltzChainSwap[]
  solverCards?: LocalCardInput[]
}

type BackupContextProps = {
  backupAndUpdateConfig: (config: Config) => void
  backupConfig: (config: Config) => Promise<void>
  backupChainSwap: (chainSwap: BoltzChainSwap) => Promise<void>
  backupSolverCards: (solverCards: LocalCardInput[]) => Promise<void>
  backupReverseSwap: (reverseSwap: BoltzReverseSwap) => Promise<void>
  backupSubmarineSwap: (submarineSwap: BoltzSubmarineSwap) => Promise<void>
  fullBackup: (config: Config, arkadeSwaps?: ServiceWorkerArkadeSwaps) => Promise<void>
  restore: (secKey: Uint8Array) => Promise<void>
}

export const BackupContext = createContext<BackupContextProps>({
  backupConfig: async () => {},
  backupAndUpdateConfig: () => {},
  backupChainSwap: async () => {},
  backupSolverCards: async () => {},
  backupReverseSwap: async () => {},
  backupSubmarineSwap: async () => {},
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
   * backup a submarine swap to Nostr
   * @param submarineSwap BoltzSubmarineSwap to backup
   */
  const backupChainSwap = async (chainSwap: BoltzChainSwap) => {
    const data: NostrStorageData = { chainSwaps: [chainSwap] }
    await nostrStorage.current?.save(JSON.stringify(data))
  }

  /**
   * backup a reverse swap to Nostr
   * @param reverseSwap BoltzReverseSwap to backup
   */
  const backupReverseSwap = async (reverseSwap: BoltzReverseSwap) => {
    const data: NostrStorageData = { reverseSwaps: [reverseSwap] }
    await nostrStorage.current?.save(JSON.stringify(data))
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
   * backup a submarine swap to Nostr
   * @param submarineSwap BoltzSubmarineSwap to backup
   */
  const backupSubmarineSwap = async (submarineSwap: BoltzSubmarineSwap) => {
    const data: NostrStorageData = { submarineSwaps: [submarineSwap] }
    await nostrStorage.current?.save(JSON.stringify(data))
  }

  /**
   * does a full backup of config and swaps to Nostr
   * If data size is larger than 65kb, splits into multiple events
   * @param config
   */
  const fullBackup = async (config: Config, arkadeSwaps?: ServiceWorkerArkadeSwaps) => {
    const allSwaps = arkadeSwaps ? await arkadeSwaps.getSwapHistory() : []
    const solverCards = readSolverCardsFromStorage()

    if (!allSwaps.length && !solverCards.length) return backupConfig(config)

    const data: NostrStorageData = {
      config,
      solverCards,
      chainSwaps: allSwaps.filter((s) => s.type === 'chain'),
      reverseSwaps: allSwaps.filter((s) => s.type === 'reverse'),
      submarineSwaps: allSwaps.filter((s) => s.type === 'submarine'),
    }

    const dataSize = JSON.stringify(data).length
    const solverCardsSize = JSON.stringify(solverCards).length

    if (dataSize > 65000) {
      if (config) await backupConfig(config)

      if (solverCards && solverCardsSize < 65000) await backupSolverCards(solverCards)

      for (const reverseSwap of data.reverseSwaps ?? []) {
        await backupReverseSwap(reverseSwap)
      }

      for (const submarineSwap of data.submarineSwaps ?? []) {
        await backupSubmarineSwap(submarineSwap)
      }

      for (const chainSwap of data.chainSwaps ?? []) {
        await backupChainSwap(chainSwap)
      }
    } else {
      await nostrStorage.current?.save(JSON.stringify(data))
    }
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

    // TODO: restore as contracts via ad-hoc utils in boltz-swap

    const swapRepository = new IndexedDbSwapRepository()

    for (const swap of data?.reverseSwaps ?? []) {
      await swapRepository.saveSwap(swap)
    }

    for (const swap of data?.submarineSwaps ?? []) {
      await swapRepository.saveSwap(swap)
    }

    for (const swap of data?.chainSwaps ?? []) {
      await swapRepository.saveSwap(swap)
    }
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

    if (!nostrProvider)
      return {
        config: undefined,
        solverCards: [],
        chainSwaps: [],
        reverseSwaps: [],
        submarineSwaps: [],
      }

    const loaded = {
      config: null as Config | null,
      solverCards: [] as LocalCardInput[],
      chainSwaps: new Map<string, BoltzChainSwap>(),
      reverseSwaps: new Map<string, BoltzReverseSwap>(),
      submarineSwaps: new Map<string, BoltzSubmarineSwap>(),
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

      for (const swap of data.reverseSwaps ?? []) {
        loaded.reverseSwaps.set(swap.id, swap)
      }

      for (const swap of data.submarineSwaps ?? []) {
        loaded.submarineSwaps.set(swap.id, swap)
      }

      for (const swap of data.chainSwaps ?? []) {
        loaded.chainSwaps.set(swap.id, swap)
      }
    }

    return {
      config: loaded.config ?? undefined,
      solverCards: loaded.solverCards,
      chainSwaps: Array.from(loaded.chainSwaps.values()),
      reverseSwaps: Array.from(loaded.reverseSwaps.values()),
      submarineSwaps: Array.from(loaded.submarineSwaps.values()),
    }
  }

  return (
    <BackupContext.Provider
      value={{
        backupConfig,
        backupChainSwap,
        backupSolverCards,
        backupReverseSwap,
        backupSubmarineSwap,
        backupAndUpdateConfig,
        fullBackup,
        restore,
      }}
    >
      {children}
    </BackupContext.Provider>
  )
}
