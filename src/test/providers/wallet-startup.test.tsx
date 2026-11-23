import { act, render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WalletContext, WalletProvider } from '../../providers/wallet'
import { AspContext, type AspInfo } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { mockAspContextValue, mockConfigContextValue } from '../screens/mocks'
import fixtures from '../fixtures.json'

// A fresh service per test: a provider outlives its test (its status ping keeps running), and must
// not count toward the next test's reloads.
const makeService = () => {
  const sync: { state: { lastSyncedAt?: number } } = { state: {} }
  return {
    sync,
    activity: { use: vi.fn() },
    getVtxoManager: vi.fn().mockResolvedValue({ renewVtxos: async () => {} }),
    getStatus: vi.fn().mockResolvedValue({ walletInitialized: true }),
    getVtxos: vi.fn().mockResolvedValue([]),
    getAddress: vi.fn<() => Promise<string>>(),
    getContractManager: vi.fn(async () => ({ getSyncState: () => sync.state })),
  }
}

const mocks = vi.hoisted(() => {
  const current = { service: undefined as unknown as ReturnType<typeof makeService> }
  return { current, setup: vi.fn(async () => current.service) }
})

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
  const tree = (aspInfo: AspInfo) => (
    <AspContext.Provider value={{ ...mockAspContextValue, aspInfo }}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <WalletProvider>
          <Capture />
        </WalletProvider>
      </ConfigContext.Provider>
    </AspContext.Provider>
  )
  const { rerender } = render(tree(mockAspContextValue.aspInfo))
  await act(() => wallet.initWallet({ privateKey: new Uint8Array(32).fill(1) }))
  return (aspInfo: AspInfo) => rerender(tree(aspInfo))
}

// reloadWallet is the only caller of an unfiltered getVtxos()
const reloads = () => mocks.current.service.getVtxos.mock.calls.filter((args) => args.length === 0).length

beforeEach(() => {
  vi.clearAllMocks()
  mocks.current.service = makeService()
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistration: async () => undefined, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  })
})
afterEach(() => vi.unstubAllGlobals())

it('starts the worker without holding the boot on contract sync', async () => {
  await startWallet()

  expect(mocks.setup).toHaveBeenCalledWith(expect.objectContaining({ lazyInitialization: true }))
})

it('reports syncing until the worker finishes its first sync, then reloads', async () => {
  await startWallet()
  expect(wallet.syncing).toBe(true)
  const before = reloads()

  mocks.current.service.sync.state = { lastSyncedAt: Date.now() }

  await vi.waitFor(() => expect(wallet.syncing).toBe(false), { timeout: 3000 })
  await vi.waitFor(() => expect(reloads()).toBe(before + 1), { timeout: 3000 })
})

it('tries one restart for a persistent signer mismatch and resumes after the signer matches', async () => {
  const updateOperator = await startWallet()
  const [oldAddress, newAddress] = fixtures.lib.address.ark
  const { getAddress } = mocks.current.service
  getAddress.mockResolvedValue(oldAddress.address)
  const operator = { ...mockAspContextValue.aspInfo, signerPubkey: newAddress.serverPubKey }

  updateOperator({ ...operator, unreachable: true })
  expect(wallet.revalidatingOperator).toBe(true)
  updateOperator(operator)
  await waitFor(() => expect(mocks.setup).toHaveBeenCalledTimes(2))

  updateOperator({ ...operator })
  await waitFor(() => expect(wallet.operatorRevalidationFailed).toBe(true))
  expect(wallet.revalidatingOperator).toBe(true)
  expect(mocks.setup).toHaveBeenCalledTimes(2)

  getAddress.mockResolvedValue(newAddress.address)
  updateOperator({ ...operator })
  await waitFor(() => expect(wallet.revalidatingOperator).toBe(false))
  expect(wallet.operatorRevalidationFailed).toBe(false)
  expect(mocks.setup).toHaveBeenCalledTimes(2)
})

it.each(['vtxo_received', 'vtxo_spent'])('reloads when a contract event reports %s', async (eventType) => {
  await startWallet()
  const before = reloads()
  const onMessage = vi
    .mocked(navigator.serviceWorker.addEventListener)
    .mock.calls.filter(([type]) => type === 'message')
    .at(-1)![1] as (event: MessageEvent) => void

  onMessage({ data: { type: 'CONTRACT_EVENT', payload: { event: { type: eventType } } } } as MessageEvent)

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
