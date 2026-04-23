import {
  BoltzChainSwap,
  BoltzReverseSwap,
  BoltzSubmarineSwap,
  ServiceWorkerArkadeSwaps,
  SwapRepository,
} from '@arkade-os/boltz-swap'
import { getPublicKey } from 'nostr-tools/pure'
import { NostrStorage } from './nostr'
import { Config } from './types'
import { consoleError } from './logs'
import { toXOnlyHex } from './keys'

type NostrStorageData = {
  config?: Config
  reverseSwaps?: BoltzReverseSwap[]
  submarineSwaps?: BoltzSubmarineSwap[]
  chainSwaps?: BoltzChainSwap[]
}
export class BackupProvider {
  private nostrStorage: NostrStorage
  private seckey: Uint8Array | null
  private pubkey: string

  /**
   * Initialize Backup with either a secret key or public key
   * @param options.seckey - Optional secret key (Uint8Array). If provided, pubkey is derived.
   * @param options.pubkey - Optional public key (hex string). Required if seckey not provided.
   * @throws Error if neither seckey nor pubkey is provided, or if pubkey format is invalid
   */
  constructor(
    options: { pubkey?: string; seckey?: Uint8Array },
    private readonly swapRepository: SwapRepository,
  ) {
    if (options.seckey) {
      this.pubkey = getPublicKey(options.seckey)
      this.seckey = options.seckey
      this.nostrStorage = new NostrStorage({ seckey: this.seckey })
    } else if (options.pubkey) {
      this.pubkey = toXOnlyHex(options.pubkey)
      if (this.pubkey.length !== 64) throw new Error('Invalid pubkey length')
      this.nostrStorage = new NostrStorage({ pubkey: this.pubkey })
      this.seckey = null
    } else {
      throw new Error('Either seckey or pubkey must be provided')
    }
  }

  /**
   * Backup config to Nostr
   * @param config Config to backup
   */
  backupConfig = async (config: Config) => {
    const data: NostrStorageData = { config }
    await this.nostrStorage.save(JSON.stringify(data))
  }

  /**
   * Backup a reverse swap to Nostr
   * @param reverseSwap BoltzReverseSwap to backup
   */
  backupReverseSwap = async (reverseSwap: BoltzReverseSwap) => {
    const data: NostrStorageData = { reverseSwaps: [reverseSwap] }
    await this.nostrStorage.save(JSON.stringify(data))
  }

  /**
   * Backup a submarine swap to Nostr
   * @param submarineSwap BoltzSubmarineSwap to backup
   */
  backupSubmarineSwap = async (submarineSwap: BoltzSubmarineSwap) => {
    const data: NostrStorageData = { submarineSwaps: [submarineSwap] }
    await this.nostrStorage.save(JSON.stringify(data))
  }

  /**
   * Backup a submarine swap to Nostr
   * @param submarineSwap BoltzSubmarineSwap to backup
   */
  backupChainSwap = async (chainSwap: BoltzChainSwap) => {
    const data: NostrStorageData = { chainSwaps: [chainSwap] }
    await this.nostrStorage.save(JSON.stringify(data))
  }

  /**
   * Does a full backup of config and swaps to Nostr
   * If data size is larger than 65kb, splits into multiple events
   * @param config
   */
  fullBackup = async (config: Config, arkadeSwaps?: ServiceWorkerArkadeSwaps) => {
    if (!arkadeSwaps) return this.backupConfig(config)

    const allSwaps = await arkadeSwaps.getSwapHistory()
    const data: NostrStorageData = {
      config,
      chainSwaps: allSwaps.filter((s) => s.type === 'chain'),
      reverseSwaps: allSwaps.filter((s) => s.type === 'reverse'),
      submarineSwaps: allSwaps.filter((s) => s.type === 'submarine'),
    }

    const dataSize = JSON.stringify(data).length

    if (dataSize > 65000) {
      if (config) await this.backupConfig(config)

      for (const reverseSwap of data.reverseSwaps ?? []) {
        await this.backupReverseSwap(reverseSwap)
      }

      for (const submarineSwap of data.submarineSwaps ?? []) {
        await this.backupSubmarineSwap(submarineSwap)
      }

      for (const chainSwap of data.chainSwaps ?? []) {
        await this.backupChainSwap(chainSwap)
      }
    } else {
      await this.nostrStorage.save(JSON.stringify(data))
    }
  }

  /**
   * Restore data from Nostr
   * @param updateConfig func to update Config
   */
  restore = async (updateConfig: (config: Config) => void) => {
    const data = (await this.loadData()) as NostrStorageData

    if (data?.config) updateConfig(data.config)

    // TODO: restore as contracts via ad-hoc utils in boltz-swap

    for (const swap of data?.reverseSwaps ?? []) {
      await this.swapRepository.saveSwap(swap)
    }

    for (const swap of data?.submarineSwaps ?? []) {
      await this.swapRepository.saveSwap(swap)
    }

    for (const swap of data?.chainSwaps ?? []) {
      await this.swapRepository.saveSwap(swap)
    }
  }

  /**
   * Initially data was saved in a unique event, until we reached the size limit.
   * Now we can have multiple events, so we need to load and merge them.
   * Events are sorted by created_at to have a deterministic order.
   * The map in swaps is used to avoid duplicates and use the latest data.
   * @returns Data stored on Nostr
   */
  private loadData = async (): Promise<NostrStorageData> => {
    const loaded = {
      config: null as Config | null,
      chainSwaps: new Map<string, BoltzChainSwap>(),
      reverseSwaps: new Map<string, BoltzReverseSwap>(),
      submarineSwaps: new Map<string, BoltzSubmarineSwap>(),
    }

    const events = await this.nostrStorage.load()

    // Events are sorted by created_at to have a deterministic order.
    const sorted = events.sort((a, b) => a.created_at - b.created_at)

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
      chainSwaps: Array.from(loaded.chainSwaps.values()),
      reverseSwaps: Array.from(loaded.reverseSwaps.values()),
      submarineSwaps: Array.from(loaded.submarineSwaps.values()),
    }
  }
}
