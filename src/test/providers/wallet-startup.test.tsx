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
  const executor = { registerBoarding: vi.fn() }
  return {
    sync,
    executor,
    activity: { use: vi.fn() },
    getExecutorManager: vi.fn(async () => executor),
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
  mocks.current.service = makeService()
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistration: async () => undefined, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

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

it('registers the boarding watch with a configured Executor, then reloads', async () => {
  vi.stubEnv('VITE_EXECUTOR_URL', 'https://executor.example')
  let registered!: () => void
  mocks.current.service.executor.registerBoarding.mockReturnValue(new Promise<void>((r) => (registered = r)))
  await startWallet()

  expect(mocks.setup).toHaveBeenCalledWith(expect.objectContaining({ executorUrl: 'https://executor.example' }))
  // the mocked Ark server is on regtest, whose VTXOs expire after a day
  await vi.waitFor(() =>
    expect(mocks.current.service.executor.registerBoarding).toHaveBeenCalledWith(
      { renewalWindow: 43_200, maxFee: 1_000 },
      { emulatorPubkey: '02999413c46fa10ada5cbc4bcc79a1d09160c2ba3cfc812705d7a13e5e545fb2a9' },
    ),
  )
  const before = reloads()
  registered()

  await vi.waitFor(() => expect(reloads()).toBe(before + 1), { timeout: 3000 })
})

it('registers against the configured emulator key', async () => {
  const emulator = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
  vi.stubEnv('VITE_EXECUTOR_URL', 'https://executor.example')
  vi.stubEnv('VITE_EMULATOR_PUBKEY', emulator)
  await startWallet()

  await vi.waitFor(() =>
    expect(mocks.current.service.executor.registerBoarding).toHaveBeenCalledWith(expect.anything(), {
      emulatorPubkey: emulator,
    }),
  )
})

it('starts the wallet when the Executor refuses the registration', async () => {
  vi.stubEnv('VITE_EXECUTOR_URL', 'https://executor.example')
  mocks.current.service.executor.registerBoarding.mockRejectedValue(new Error('unreachable'))
  await startWallet()

  await vi.waitFor(() => expect(mocks.current.service.executor.registerBoarding).toHaveBeenCalled())
  expect(wallet.svcWallet).toBe(mocks.current.service)
})

it('leaves the Executor alone when none is configured', async () => {
  // blank, not unset: a developer's .env.local may name one
  vi.stubEnv('VITE_EXECUTOR_URL', '')
  await startWallet()

  expect(mocks.setup).toHaveBeenCalledWith(expect.objectContaining({ executorUrl: undefined }))
  expect(mocks.current.service.getExecutorManager).not.toHaveBeenCalled()
})
