import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockLoad, mockSave, mockGetContractCollection, mockSaveToContractCollection } = vi.hoisted(() => ({
  mockLoad: vi.fn(),
  mockSave: vi.fn(),
  mockGetContractCollection: vi.fn(),
  mockSaveToContractCollection: vi.fn(),
}))

vi.mock('../../lib/nostr', () => ({
  NostrStorage: vi.fn().mockImplementation(() => ({
    load: mockLoad,
    save: mockSave,
  })),
}))

vi.mock('@arkade-os/sdk', () => ({
  ContractRepositoryImpl: vi.fn().mockImplementation(() => ({
    getContractCollection: mockGetContractCollection,
    saveToContractCollection: mockSaveToContractCollection,
  })),
}))

vi.mock('@arkade-os/sdk/adapters/indexedDB', () => ({
  IndexedDBStorageAdapter: vi.fn(),
}))

import { BackupProvider } from '../../lib/backup'
import { NostrStorage } from '../../lib/nostr'
import { CurrencyDisplay, Fiats, Themes, Unit } from '../../lib/types'

const TEST_PUBKEY = 'a'.repeat(64)

const makeEvent = (content: object, created_at: number) => ({
  content: JSON.stringify(content),
  created_at,
})

const baseConfig = {
  announcementsSeen: [],
  apps: { boltz: { connected: true } },
  aspUrl: '',
  currencyDisplay: CurrencyDisplay.Both,
  fiat: Fiats.EUR,
  haptics: false,
  nostrBackup: true,
  notifications: false,
  pubkey: '',
  showBalance: true,
  theme: Themes.Auto,
  unit: Unit.SAT,
}

describe('BackupProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-apply constructor mock after clearAllMocks resets it in Vitest 3.x
    vi.mocked(NostrStorage).mockImplementation(
      () => ({ load: mockLoad, save: mockSave }) as unknown as NostrStorage,
    )
  })

  describe('restore / loadData merging', () => {
    it('empty events → updateConfig never called, no swaps saved', async () => {
      mockLoad.mockResolvedValue([])
      const provider = new BackupProvider({ pubkey: TEST_PUBKEY })
      const updateConfig = vi.fn()
      await provider.restore(updateConfig)
      expect(updateConfig).not.toHaveBeenCalled()
      expect(mockSaveToContractCollection).not.toHaveBeenCalled()
    })

    it('single config event → updateConfig called with that config', async () => {
      mockLoad.mockResolvedValue([makeEvent({ config: baseConfig }, 1000)])
      const provider = new BackupProvider({ pubkey: TEST_PUBKEY })
      const updateConfig = vi.fn()
      await provider.restore(updateConfig)
      expect(updateConfig).toHaveBeenCalledWith(baseConfig)
    })

    it('multiple config events → later event (by created_at) overwrites earlier', async () => {
      const oldConfig = { ...baseConfig, fiat: Fiats.USD }
      const newConfig = { ...baseConfig, fiat: Fiats.EUR }
      mockLoad.mockResolvedValue([
        makeEvent({ config: newConfig }, 2000),
        makeEvent({ config: oldConfig }, 1000),
      ])
      const provider = new BackupProvider({ pubkey: TEST_PUBKEY })
      const updateConfig = vi.fn()
      await provider.restore(updateConfig)
      expect(updateConfig).toHaveBeenCalledWith(newConfig)
    })

    it('reverse swaps deduplicated by id → later event wins', async () => {
      const swapV1 = { id: 'swap-1', amount: 1000 }
      const swapV2 = { id: 'swap-1', amount: 999 }
      mockLoad.mockResolvedValue([
        makeEvent({ reverseSwaps: [swapV1] }, 1000),
        makeEvent({ reverseSwaps: [swapV2] }, 2000),
      ])
      const provider = new BackupProvider({ pubkey: TEST_PUBKEY })
      await provider.restore(vi.fn())
      expect(mockSaveToContractCollection).toHaveBeenCalledTimes(1)
      expect(mockSaveToContractCollection).toHaveBeenCalledWith('reverseSwaps', swapV2, 'id')
    })

    it('submarine swaps deduplicated by id → later event wins', async () => {
      const swapV1 = { id: 'sub-1', amount: 500 }
      const swapV2 = { id: 'sub-1', amount: 501 }
      mockLoad.mockResolvedValue([
        makeEvent({ submarineSwaps: [swapV1] }, 1000),
        makeEvent({ submarineSwaps: [swapV2] }, 2000),
      ])
      const provider = new BackupProvider({ pubkey: TEST_PUBKEY })
      await provider.restore(vi.fn())
      expect(mockSaveToContractCollection).toHaveBeenCalledTimes(1)
      expect(mockSaveToContractCollection).toHaveBeenCalledWith('submarineSwaps', swapV2, 'id')
    })

    it('event with invalid JSON → skipped, remaining events processed', async () => {
      mockLoad.mockResolvedValue([
        { content: 'not-json', created_at: 1000 },
        makeEvent({ config: baseConfig }, 2000),
      ])
      const provider = new BackupProvider({ pubkey: TEST_PUBKEY })
      const updateConfig = vi.fn()
      await provider.restore(updateConfig)
      expect(updateConfig).toHaveBeenCalledWith(baseConfig)
    })

    it('mixed events (config-only + swap-only) → all merged', async () => {
      const reverseSwap = { id: 'r-1', amount: 2000 }
      const submarineSwap = { id: 's-1', amount: 1000 }
      mockLoad.mockResolvedValue([
        makeEvent({ config: baseConfig }, 1000),
        makeEvent({ reverseSwaps: [reverseSwap] }, 2000),
        makeEvent({ submarineSwaps: [submarineSwap] }, 3000),
      ])
      const provider = new BackupProvider({ pubkey: TEST_PUBKEY })
      const updateConfig = vi.fn()
      await provider.restore(updateConfig)
      expect(updateConfig).toHaveBeenCalledWith(baseConfig)
      expect(mockSaveToContractCollection).toHaveBeenCalledWith('reverseSwaps', reverseSwap, 'id')
      expect(mockSaveToContractCollection).toHaveBeenCalledWith('submarineSwaps', submarineSwap, 'id')
    })
  })

  describe('fullBackup', () => {
    it('data < 65kb → single save() call', async () => {
      mockGetContractCollection.mockResolvedValue([])
      const provider = new BackupProvider({ pubkey: TEST_PUBKEY })
      await provider.fullBackup(baseConfig)
      expect(mockSave).toHaveBeenCalledTimes(1)
    })

    it('data > 65kb → separate save() per config + per swap', async () => {
      const bigReverseSwap = { id: 'r-big', data: 'x'.repeat(34000) }
      const bigSubmarineSwap = { id: 's-big', data: 'x'.repeat(34000) }
      mockGetContractCollection.mockImplementation((type: string) => {
        if (type === 'reverseSwaps') return Promise.resolve([bigReverseSwap])
        if (type === 'submarineSwaps') return Promise.resolve([bigSubmarineSwap])
        return Promise.resolve([])
      })
      const provider = new BackupProvider({ pubkey: TEST_PUBKEY })
      await provider.fullBackup(baseConfig)
      // 1 for config + 1 for reverseSwap + 1 for submarineSwap
      expect(mockSave).toHaveBeenCalledTimes(3)
    })
  })
})
