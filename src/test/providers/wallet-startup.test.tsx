import { act, render } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WalletContext, WalletProvider } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { mockAspContextValue, mockConfigContextValue } from '../screens/mocks'

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

const renderWallet = () =>
  render(
    <AspContext.Provider value={mockAspContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <WalletProvider>
          <Capture />
        </WalletProvider>
      </ConfigContext.Provider>
    </AspContext.Provider>,
  )

type Credentials = Parameters<typeof wallet.initWallet>[0]

const startWallet = async (credentials: Credentials = { privateKey: new Uint8Array(32).fill(1) }) => {
  renderWallet()
  await act(() => wallet.initWallet(credentials))
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

const words = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const passkeyUnlock = { passkeyPrf: true, passkeyId: 'ab', passkeyRpId: 'localhost', lockedByBiometrics: false }

it('saves how a passkey wallet unlocks in the same write as its pubkey', async () => {
  localStorage.clear()
  await startWallet({ mnemonic: words, passkeyUnlock })

  expect(wallet.wallet).toMatchObject({ pubkey: expect.any(String), ...passkeyUnlock })
})

it('saves nothing about the passkey when the init fails', async () => {
  localStorage.clear()
  mocks.setup.mockRejectedValueOnce(new Error('worker is gone'))
  renderWallet()

  await expect(act(() => wallet.initWallet({ mnemonic: words, passkeyUnlock }))).rejects.toThrow()
  expect(wallet.wallet.passkeyPrf).toBeUndefined()
  expect(wallet.wallet.pubkey).toBeUndefined()
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
