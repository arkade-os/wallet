import { act, render } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { WalletContext, WalletProvider } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { HOME_SNAPSHOT_SHAPE, readHomeSnapshot, saveHomeSnapshot, type HomeSnapshot } from '../../lib/bootCache'
import type { Tx } from '../../lib/types'
import { mockAspContextValue, mockConfigContextValue } from '../screens/mocks'

const KEY = new Uint8Array(32).fill(1)
const PUBKEY = hex.encode(secp256k1.getPublicKey(KEY))
const SERVER = mockConfigContextValue.config.aspUrl

const mocks = vi.hoisted(() => ({
  service: {
    activity: { use: vi.fn() },
    getVtxoManager: vi.fn().mockResolvedValue({ renewVtxos: async () => {} }),
    getStatus: vi.fn().mockResolvedValue({ walletInitialized: true }),
    getVtxos: vi.fn().mockResolvedValue([]),
    getActivityHistory: vi.fn().mockResolvedValue([]),
    getBalance: vi.fn(),
    getContractManager: vi.fn(async () => ({ getSyncState: () => ({}) })),
    assetManager: { getAssetDetails: vi.fn() },
    clear: vi.fn().mockResolvedValue(undefined),
    walletRepository: { clear: vi.fn().mockResolvedValue(undefined) },
    contractRepository: { clear: vi.fn().mockResolvedValue(undefined) },
  },
}))

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  ServiceWorkerWallet: { setup: async () => mocks.service },
  IndexedDBWalletRepository: class {
    async getWalletState() {
      return null
    }
  },
  IndexedDBContractRepository: class {},
}))
vi.mock('../../lib/lnurlPaymentRepository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/lnurlPaymentRepository')>()),
  clearLnurlPaymentsForReset: async () => {},
}))
vi.mock('../../lib/swapRepository', () => ({ assetSwapRepository: { clear: async () => {} } }))

const row = (n: number): Tx =>
  ({
    amount: 1000 + n,
    boardingTxid: '',
    createdAt: 1_700_000_000 + n,
    explorable: undefined,
    preconfirmed: false,
    redeemTxid: `stored-${n}`,
    roundTxid: '',
    settled: true,
    type: 'received',
  }) as Tx

const stored = (over: Partial<HomeSnapshot> = {}): HomeSnapshot => ({
  build: HOME_SNAPSHOT_SHAPE,
  pubkey: PUBKEY,
  aspUrl: SERVER,
  savedAt: 1,
  balance: 148_000,
  availableBalance: 140_000,
  assetBalances: [],
  availableAssetBalances: [],
  txs: [row(1), row(2)],
  ...over,
})

let wallet: React.ContextType<typeof WalletContext>
function Capture() {
  wallet = useContext(WalletContext)
  return null
}

const mount = (config = mockConfigContextValue) =>
  render(
    <AspContext.Provider value={mockAspContextValue}>
      <ConfigContext.Provider value={config}>
        <WalletProvider>
          <Capture />
        </WalletProvider>
      </ConfigContext.Provider>
    </AspContext.Provider>,
  )

/** A returning wallet: its record and what Home showed last are both in storage before anything mounts. */
const returning = (snapshot = stored()) => {
  localStorage.setItem('wallet', JSON.stringify({ nextRollover: 0, pubkey: PUBKEY }))
  saveHomeSnapshot(snapshot)
}

const load = async () => {
  await act(() => wallet.initWallet({ privateKey: KEY }))
  await act(() => wallet.reloadWallet(mocks.service as never))
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.service.getBalance.mockResolvedValue({
    total: 99_000,
    available: 99_000,
    unrolled: 0,
    assets: [],
    availableAssets: [],
  })
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistration: async () => undefined, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('Home from what it showed last time', () => {
  it('starts a returning wallet from its stored figures, marked as not yet synced', () => {
    returning()

    mount()

    expect(wallet.storedHome).toBe(true)
    expect(wallet.syncing).toBe(true)
    expect(wallet.dataReady).toBe(false)
    expect(wallet.balance).toBe(148_000)
    expect(wallet.txs.map((tx) => tx.redeemTxid)).toEqual(['stored-1', 'stored-2'])
  })

  // Keyed on its shape, not on the build: the first visit after a deploy still opens on Home.
  it('starts from a snapshot an earlier build wrote in the same shape', () => {
    returning(stored({ build: HOME_SNAPSHOT_SHAPE, savedAt: 1 }))

    mount()

    expect(wallet.balance).toBe(148_000)
  })

  it('does not start from a snapshot written in another shape', () => {
    returning(stored({ build: 'home-0' }))

    mount()

    expect(wallet.balance).toBe(0)
  })

  it('has nothing to start from on a first visit', () => {
    localStorage.setItem('wallet', JSON.stringify({ nextRollover: 0, pubkey: PUBKEY }))

    mount()

    expect(wallet.storedHome).toBe(false)
    expect(wallet.balance).toBe(0)
    expect(wallet.txs).toEqual([])
  })

  it('does not draw figures taken on another server', () => {
    returning(stored({ aspUrl: 'https://another.example' }))

    mount()

    expect(wallet.storedHome).toBe(false)
    expect(wallet.txs).toEqual([])
  })

  it('does not draw figures that belong to another wallet', () => {
    returning(stored({ pubkey: 'someone-else' }))

    mount()

    expect(wallet.storedHome).toBe(false)
    expect(wallet.balance).toBe(0)
  })

  it('hands over to the first load, and keeps that for next time', async () => {
    returning()
    mount()

    await load()

    expect(wallet.storedHome).toBe(false)
    expect(wallet.dataReady).toBe(true)
    expect(wallet.balance).toBe(99_000)
    expect(wallet.txs).toEqual([])
    expect(readHomeSnapshot(PUBKEY, HOME_SNAPSHOT_SHAPE)).toMatchObject({ balance: 99_000, aspUrl: SERVER, txs: [] })
  })

  it('saves nothing while it is still showing the stored figures', async () => {
    returning()
    mount()

    await act(() => wallet.initWallet({ privateKey: KEY }))

    expect(wallet.storedHome).toBe(true)
    expect(readHomeSnapshot(PUBKEY, HOME_SNAPSHOT_SHAPE)?.balance).toBe(148_000)
  })

  it('goes on with nothing, as before, when the first load fails and is dismissed', async () => {
    returning()
    mount()
    await act(() => wallet.initWallet({ privateKey: KEY }))
    mocks.service.getVtxos.mockRejectedValueOnce(new Error('offline'))
    await act(() => wallet.reloadWallet(mocks.service as never))
    expect(wallet.loadError).toBeTruthy()

    act(() => wallet.dismissLoadError())

    // Not the stored figures passed off as the wallet's: they stood in for a load that never came.
    expect(wallet.storedHome).toBe(false)
    expect(wallet.dataReady).toBe(true)
    expect(wallet.balance).toBe(0)
    expect(wallet.txs).toEqual([])
  })

  it('stops showing them when the wallet is locked', async () => {
    returning()
    mount()
    await act(() => wallet.initWallet({ privateKey: KEY }))

    await act(() => wallet.lockWallet())

    expect(wallet.storedHome).toBe(false)
  })

  it('leaves nothing behind after a reset, even if the figures change while it runs', async () => {
    returning()
    mount()
    await load()
    expect(readHomeSnapshot(PUBKEY, HOME_SNAPSHOT_SHAPE)).toBeDefined()

    // A balance that lands in the middle of the wipe must not be written back after it.
    let release: () => void = () => {}
    mocks.service.clear.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)))
    let reset: Promise<void> = Promise.resolve()
    await act(async () => {
      reset = wallet.resetWallet()
      await Promise.resolve()
    })
    mocks.service.getBalance.mockResolvedValue({ total: 5, available: 5, unrolled: 0, assets: [], availableAssets: [] })
    await act(() => wallet.reloadWallet(mocks.service as never))
    await act(async () => {
      release()
      await reset
    })

    expect(localStorage.getItem('homeSnapshot')).toBeNull()
  })
})
