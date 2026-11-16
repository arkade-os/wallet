import { act, render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WalletContext, WalletProvider } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { mockAspContextValue, mockConfigContextValue } from '../screens/mocks'

const makeService = () => {
  const sync: { state: { lastSyncedAt?: number } } = { state: {} }
  const updates = new Set<(update: unknown) => void>()
  const unsubscribe = vi.fn()
  return {
    sync,
    unsubscribe,
    onWalletUpdate: vi.fn((callback: (update: unknown) => void) => {
      updates.add(callback)
      return () => {
        updates.delete(callback)
        unsubscribe()
      }
    }),
    emit: (update: unknown) => {
      for (const callback of updates) callback(update)
    },
    activity: { use: vi.fn() },
    getVtxoManager: vi.fn().mockResolvedValue({ renewVtxos: async () => {} }),
    getStatus: vi.fn().mockResolvedValue({ walletInitialized: true }),
    getVtxos: vi.fn().mockResolvedValue([]),
    getBalance: vi.fn().mockResolvedValue({ total: 100, available: 100, unrolled: 0, assets: [], availableAssets: [] }),
    getActivityHistory: vi.fn().mockResolvedValue([]),
    assetManager: { getAssetDetails: vi.fn().mockRejectedValue(new Error('wallet scope changed')) },
    getContractManager: vi.fn(async () => ({ getSyncState: () => sync.state })),
  }
}

const mocks = vi.hoisted(() => {
  const current = { service: undefined as unknown as ReturnType<typeof makeService> }
  return { current, setup: vi.fn(async () => current.service), swapRecords: vi.fn() }
})

vi.mock('@arkade-os/swap/protocol', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap/protocol')>()),
  getAssetSwaps: mocks.swapRecords,
}))

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  ServiceWorkerWallet: { setup: mocks.setup },
  IndexedDBWalletRepository: class {
    async getWalletState() {
      return null
    }
  },
  IndexedDBContractRepository: class {},
}))

let wallet: React.ContextType<typeof WalletContext>
function Capture() {
  wallet = useContext(WalletContext)
  return null
}

const startWallet = async () => {
  render(
    <AspContext.Provider value={mockAspContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <WalletProvider>
          <Capture />
        </WalletProvider>
      </ConfigContext.Provider>
    </AspContext.Provider>,
  )
  await act(() => wallet.initWallet({ privateKey: new Uint8Array(32).fill(1) }))
}

// reloadWallet is the only caller of an unfiltered getVtxos()
const reloads = () => mocks.current.service.getVtxos.mock.calls.filter((args) => args.length === 0).length

beforeEach(() => {
  vi.clearAllMocks()
  mocks.swapRecords.mockReset().mockResolvedValue([])
  mocks.current.service = makeService()
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistration: async () => undefined, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  })
})
afterEach(() => vi.unstubAllGlobals())

it('starts the worker without holding the boot on contract sync', async () => {
  await startWallet()

  expect(mocks.setup).toHaveBeenCalledWith(
    expect.objectContaining({
      lazyInitialization: true,
      expectedNetwork: mockAspContextValue.aspInfo.network,
      arkServer: { url: mockAspContextValue.aspInfo.url },
    }),
  )
})

it('reports syncing until the worker finishes its first sync, then reloads', async () => {
  await startWallet()
  expect(wallet.syncing).toBe(true)
  const before = reloads()

  mocks.current.service.sync.state = { lastSyncedAt: Date.now() }

  await vi.waitFor(() => expect(wallet.syncing).toBe(false), { timeout: 3000 })
  await vi.waitFor(() => expect(reloads()).toBe(before + 1), { timeout: 3000 })
})

it.each(['vtxo_received', 'vtxo_spent'])('reloads when a contract event reports %s', async (eventType) => {
  await startWallet()
  const before = reloads()
  mocks.current.service.emit({ type: 'CONTRACT_EVENT', payload: { event: { type: eventType } } })

  await vi.waitFor(() => expect(reloads()).toBe(before + 1), { timeout: 3000 })
})

it('prefetches newly referenced assets after overlapping wallet reloads', async () => {
  localStorage.clear()
  await startWallet()

  const first = 'a'.repeat(68)
  const second = 'b'.repeat(68)
  const third = 'c'.repeat(68)
  let releaseFirst: () => void = () => {}
  const firstRequest = new Promise<void>((resolve) => (releaseFirst = resolve))
  const getAssetDetails = vi.fn(async (assetId: string) => {
    if (assetId === first) await firstRequest
    return { assetId, metadata: { name: `Asset ${assetId[0]}`, ticker: assetId[0].toUpperCase(), decimals: 0 } }
  })
  let assets = [{ assetId: first, amount: 1n }]
  const service = {
    ...mocks.current.service,
    getActivityHistory: vi.fn().mockResolvedValue([]),
    getBalance: vi.fn(async () => ({ total: 0, available: 0, unrolled: 0, assets, availableAssets: assets })),
    assetManager: { getAssetDetails },
  }

  await act(() => wallet.reloadWallet(service as never))
  await waitFor(() => expect(getAssetDetails).toHaveBeenCalledWith(first))

  assets = [{ assetId: second, amount: 1n }]
  await act(() => wallet.reloadWallet(service as never))
  assets = [
    { assetId: second, amount: 1n },
    { assetId: third, amount: 1n },
  ]
  await act(() => wallet.reloadWallet(service as never))
  expect(getAssetDetails).toHaveBeenCalledTimes(1)

  await act(async () => releaseFirst())
  await waitFor(() => expect(wallet.assetMetadataCache.get(second)?.metadata?.name).toBe('Asset b'))
  await waitFor(() => expect(wallet.assetMetadataCache.get(third)?.metadata?.name).toBe('Asset c'))
  expect(getAssetDetails).toHaveBeenCalledTimes(3)
})

it.each(['CONTRACT_EVENT', 'VTXO_UPDATE', 'UTXO_UPDATE'])('ignores raw foreign %s wakeups', async (type) => {
  await startWallet()
  const before = reloads()
  const event = {
    data: {
      type,
      broadcast: true,
      walletRequestBinding: { scope: 'b'.repeat(64), network: 'regtest' },
      payload: { event: { type: 'vtxo_received' }, newVtxos: [{ value: 500 }], coins: [{ value: 500 }] },
    },
  } as MessageEvent
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  try {
    await act(async () => {
      for (const [name, listener] of vi.mocked(navigator.serviceWorker.addEventListener).mock.calls)
        if (name === 'message') (listener as (event: MessageEvent) => void)(event)
      await vi.advanceTimersByTimeAsync(1001)
    })
    expect(reloads()).toBe(before)
    expect(mocks.current.service.onWalletUpdate).toHaveBeenCalledOnce()
  } finally {
    vi.useRealTimers()
  }
})

it('ignores retained callbacks from an obsolete wallet and keeps the new subscription live', async () => {
  await startWallet()
  const first = mocks.current.service
  const oldUpdate = first.onWalletUpdate.mock.calls[0][0]
  const second = makeService()
  mocks.current.service = second
  await act(() => wallet.initWallet({ privateKey: new Uint8Array(32).fill(2) }))
  expect(first.unsubscribe).toHaveBeenCalledOnce()
  const firstReads = first.getVtxos.mock.calls.length
  const secondReads = second.getVtxos.mock.calls.length
  const secondReloads = reloads()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  try {
    await act(async () => {
      oldUpdate({ type: 'VTXO_UPDATE', payload: { newVtxos: [{ value: 500 }] } })
      await vi.advanceTimersByTimeAsync(1001)
    })
    expect(first.getVtxos).toHaveBeenCalledTimes(firstReads)
    expect(second.getVtxos).toHaveBeenCalledTimes(secondReads)
    await act(async () => {
      second.emit({ type: 'VTXO_UPDATE', payload: { newVtxos: [{ value: 500 }] } })
      await vi.advanceTimersByTimeAsync(1001)
    })
    expect(reloads()).toBe(secondReloads + 1)
  } finally {
    vi.useRealTimers()
  }
})

it('discards an old reload after app storage yields to a new wallet, while preserving startup reloads', async () => {
  const history = (id: string, amount: number) => [
    {
      id,
      txs: [{ key: { arkTxid: id }, createdAt: 1, settled: false, type: 'RECEIVED', amount }],
    },
  ]
  await startWallet()
  const first = mocks.current.service
  const firstWallet = wallet.svcWallet!
  first.getActivityHistory.mockResolvedValue(history('a', 100))
  await act(() => wallet.reloadWallet(firstWallet))
  expect(wallet.balance).toBe(100)
  expect(wallet.ungroupedTxs.map((tx) => tx.redeemTxid)).toEqual(['a'])

  first.getBalance.mockResolvedValue({
    total: 900,
    available: 900,
    unrolled: 0,
    assets: [{ assetId: 'old-wallet-asset', amount: 1n }],
    availableAssets: [],
  })
  let releaseStorage!: () => void
  let enteredStorage!: () => void
  const entered = new Promise<void>((resolve) => (enteredStorage = resolve))
  mocks.swapRecords.mockImplementationOnce(async () => {
    enteredStorage()
    await new Promise<void>((resolve) => (releaseStorage = resolve))
    return []
  })
  let oldReload!: Promise<void>
  await act(async () => {
    oldReload = wallet.reloadWallet(firstWallet)
    await entered
  })

  const second = makeService()
  second.getBalance.mockResolvedValue({ total: 200, available: 200, unrolled: 0, assets: [], availableAssets: [] })
  second.getActivityHistory.mockResolvedValue(history('b', 200))
  mocks.current.service = second
  await act(async () => {
    await wallet.initWallet({ privateKey: new Uint8Array(32).fill(2) })
    expect(wallet.svcWallet).toBe(firstWallet)
    await wallet.reloadWallet(second as unknown as typeof firstWallet)
  })
  expect(wallet.balance).toBe(200)
  expect(wallet.ungroupedTxs.map((tx) => tx.redeemTxid)).toEqual(['b'])

  await act(async () => {
    releaseStorage()
    await oldReload
  })
  expect(wallet.balance).toBe(200)
  expect(wallet.availableBalance).toBe(200)
  expect(wallet.assetBalances).toEqual([])
  expect(wallet.ungroupedTxs.map((tx) => tx.redeemTxid)).toEqual(['b'])
  expect(first.assetManager.getAssetDetails).not.toHaveBeenCalled()
})
