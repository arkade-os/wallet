import { PendingReverseSwap, PendingSubmarineSwap } from '@arkade-os/boltz-swap'
import { ContractRepositoryImpl } from '@arkade-os/sdk'
import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB'
import { NostrStorageData, NostrStorage, nostrAppName } from './nostr'
import { Config } from './types'

const storage = new IndexedDBStorageAdapter('arkade-service-worker')
const contractRepo = new ContractRepositoryImpl(storage)

export const handleNostrBackup = async (config: Config) => {
  // data to backup
  const backupData: NostrStorageData = {
    config,
    reverseSwaps: (await contractRepo.getContractCollection('reverseSwaps')) as PendingReverseSwap[],
    submarineSwaps: (await contractRepo.getContractCollection('submarineSwaps')) as PendingSubmarineSwap[],
  }
  // save to nostr
  const nostrStorage = new NostrStorage({ pubkey: config.pubkey })
  await nostrStorage.save(nostrAppName, backupData)
}

export const handleNostrRestore = async (
  seckey: Uint8Array,
  updateConfig: (config: Config, backup: boolean) => void,
) => {
  const nostrStorage = new NostrStorage({ seckey })
  const data = await nostrStorage.load(nostrAppName)
  if (!data) return null
  const { config, reverseSwaps, submarineSwaps } = data
  // restore config and swaps
  updateConfig(config, false)
  for (const swap of reverseSwaps) {
    console.log('restoring reverse swap:', swap.id)
    await contractRepo.saveToContractCollection('reverseSwaps', swap, 'id')
  }
  for (const swap of submarineSwaps) {
    console.log('restoring submarine swap:', swap.id)
    await contractRepo.saveToContractCollection('submarineSwaps', swap, 'id')
  }
}
