import { act, render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WalletContext, WalletProvider } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { mockAspContextValue, mockConfigContextValue } from '../screens/mocks'

// A fresh service per test: a provider outlives its test (its status ping keeps running), and must
// not count toward the next test's reloads.
const makeService = () => {
  const sync: { state: { lastSyncedAt?: number } } = { state: {} }
  const executor = { registerBoarding: vi.fn(), registerRenewal: vi.fn() }
  const vtxoManager = { renewVtxos: vi.fn(async () => {}) }
  return {
    sync,
    executor,
    activity: { use: vi.fn() },
    getExecutorManager: vi.fn(async () => executor),
    vtxoManager,
    getVtxoManager: vi.fn(async () => vtxoManager),
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

const renderWallet = (config = mockConfigContextValue.config) =>
  render(
    <AspContext.Provider value={mockAspContextValue}>
      <ConfigContext.Provider value={{ ...mockConfigContextValue, config }}>
        <WalletProvider>
          <Capture />
        </WalletProvider>
      </ConfigContext.Provider>
    </AspContext.Provider>,
  )

const startWallet = async (
  config = mockConfigContextValue.config,
  credentials: Parameters<typeof wallet.initWallet>[0] = { privateKey: new Uint8Array(32).fill(1) },
) => {
  renderWallet(config)
  await act(() => wallet.initWallet(credentials))
}

// reloadWallet is the only caller of an unfiltered getVtxos()
const reloads = () => mocks.current.service.getVtxos.mock.calls.filter((args) => args.length === 0).length

beforeEach(() => {
  vi.clearAllMocks()
  mocks.current.service = makeService()
  // blank, not unset: a developer's .env.local may set one
  vi.stubEnv('VITE_EXECUTOR_RENEWAL_WINDOW', '')
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

const words = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const passkeyUnlock = { passkeyPrf: true, passkeyId: 'ab', passkeyRpId: 'localhost', lockedByBiometrics: false }

it('saves how a passkey wallet unlocks in the same write as its pubkey', async () => {
  localStorage.clear()
  await startWallet(mockConfigContextValue.config, { mnemonic: words, passkeyUnlock })

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

  // one after the boarding registration, one after the renewal
  await vi.waitFor(() => expect(reloads()).toBe(before + 2), { timeout: 3000 })
})

it('registers the renewal watch after boarding, with the same params', async () => {
  vi.stubEnv('VITE_EXECUTOR_URL', 'https://executor.example')
  let registered!: () => void
  const { executor } = mocks.current.service
  executor.registerBoarding.mockReturnValue(new Promise<void>((r) => (registered = r)))
  await startWallet()

  await vi.waitFor(() => expect(executor.registerBoarding).toHaveBeenCalled())
  // renewal also covers the keys that hold a live boarding watch, so it waits for boarding
  expect(executor.registerRenewal).not.toHaveBeenCalled()
  registered()

  await vi.waitFor(() =>
    expect(executor.registerRenewal).toHaveBeenCalledWith(...executor.registerBoarding.mock.calls[0]),
  )
})

it('reloads after boarding when the Executor refuses the renewal', async () => {
  vi.stubEnv('VITE_EXECUTOR_URL', 'https://executor.example')
  const { executor } = mocks.current.service
  let registered!: () => void
  executor.registerBoarding.mockReturnValue(new Promise<void>((r) => (registered = r)))
  executor.registerRenewal.mockRejectedValue(new Error('parameters differ'))
  await startWallet()

  await vi.waitFor(() => expect(executor.registerBoarding).toHaveBeenCalled())
  const before = reloads()
  registered()

  await vi.waitFor(() => expect(executor.registerRenewal).toHaveBeenCalled())
  await vi.waitFor(() => expect(reloads()).toBe(before + 1), { timeout: 3000 })
  expect(wallet.svcWallet).toBe(mocks.current.service)
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
  await vi.waitFor(() =>
    expect(mocks.current.service.executor.registerRenewal).toHaveBeenCalledWith(expect.anything(), {
      emulatorPubkey: emulator,
    }),
  )
})

it('starts the wallet when the Executor refuses the registration', async () => {
  vi.stubEnv('VITE_EXECUTOR_URL', 'https://executor.example')
  mocks.current.service.executor.registerBoarding.mockRejectedValue(new Error('unreachable'))
  await startWallet()

  await vi.waitFor(() => expect(mocks.current.service.executor.registerBoarding).toHaveBeenCalled())
  // the renewal of the displayed key needs no boarding watch, so it is still tried
  await vi.waitFor(() => expect(mocks.current.service.executor.registerRenewal).toHaveBeenCalled())
  expect(wallet.svcWallet).toBe(mocks.current.service)
})

it("uses the network's Executor unless the URL is overridden", async () => {
  // blank, not unset: a developer's .env.local may name one
  vi.stubEnv('VITE_EXECUTOR_URL', '')
  await startWallet()

  expect(mocks.setup).toHaveBeenCalledWith(expect.objectContaining({ executorUrl: 'http://localhost:7280' }))
})

it('leaves the Executor alone when the user turned it off', async () => {
  await startWallet({ ...mockConfigContextValue.config, executor: false })

  expect(mocks.setup).toHaveBeenCalledWith(expect.objectContaining({ executorUrl: undefined }))
  expect(mocks.current.service.getExecutorManager).not.toHaveBeenCalled()
})

// the SDK leaves the coins under a live renewal watch to the Executor
it.each([true, false])('renews its own coins at startup (Executor %s)', async (executor) => {
  await startWallet({ ...mockConfigContextValue.config, executor })

  await vi.waitFor(() => expect(mocks.current.service.vtxoManager.renewVtxos).toHaveBeenCalled())
})

describe('Executor registration state', () => {
  const RENEWAL = 'tark1renewalcontract'
  const registration = (address: string) => ({ address, templateId: 't', variables: {}, keys: [], params: {} })
  const withExecutor = () => vi.stubEnv('VITE_EXECUTOR_URL', 'https://executor.example')
  // a promise's state, without waiting on it
  const isPending = async (p: Promise<unknown>) => {
    const sentinel = Symbol('pending')
    return (await Promise.race([p, Promise.resolve(sentinel)])) === sentinel
  }

  it('settles after both registrations', async () => {
    withExecutor()
    mocks.current.service.executor.registerRenewal.mockResolvedValue(registration(RENEWAL))
    await startWallet()

    await expect(wallet.executorSettled()).resolves.toEqual({ status: 'success' })
    expect(wallet.executorStatus).toBe('success')
    expect(wallet.executorSettledCount).toBe(1)
  })

  it('waits for the renewal before settling', async () => {
    withExecutor()
    let renewed!: (r: unknown) => void
    mocks.current.service.executor.registerRenewal.mockReturnValue(new Promise((r) => (renewed = r)))
    await startWallet()

    await vi.waitFor(() => expect(mocks.current.service.executor.registerRenewal).toHaveBeenCalled())
    expect(wallet.executorStatus).toBe('pending')
    expect(await isPending(wallet.executorSettled())).toBe(true)
    await act(async () => renewed(registration(RENEWAL)))
    await expect(wallet.executorSettled()).resolves.toMatchObject({ status: 'success' })
  })

  it('settles as a failure when the boarding registration fails', async () => {
    withExecutor()
    mocks.current.service.executor.registerBoarding.mockRejectedValue(new Error('unreachable'))
    mocks.current.service.executor.registerRenewal.mockResolvedValue(registration(RENEWAL))
    await startWallet()

    await expect(wallet.executorSettled()).resolves.toEqual({ status: 'failure' })
  })

  it('settles as a failure when the renewal registration fails', async () => {
    withExecutor()
    mocks.current.service.executor.registerRenewal.mockRejectedValue(new Error('parameters differ'))
    await startWallet()

    await expect(wallet.executorSettled()).resolves.toEqual({ status: 'failure' })
  })

  it('settles at once without an Executor URL', async () => {
    await startWallet({ ...mockConfigContextValue.config, executor: false })

    await expect(wallet.executorSettled()).resolves.toEqual({ status: 'no-executor' })
    expect(wallet.executorStatus).toBe('no-executor')
  })

  it('settles when the worker has no executor manager', async () => {
    withExecutor()
    mocks.current.service.getExecutorManager.mockResolvedValue(undefined as never)
    await startWallet()

    await expect(wallet.executorSettled()).resolves.toEqual({ status: 'no-executor' })
    await vi.waitFor(() => expect(wallet.executorSettledCount).toBe(1))
  })

  it('settles on lock', async () => {
    withExecutor()
    let renewed!: (r: unknown) => void
    mocks.current.service.executor.registerRenewal.mockReturnValue(new Promise((r) => (renewed = r)))
    Object.assign(mocks.current.service, { clear: vi.fn(async () => {}) })
    await startWallet()
    await vi.waitFor(() => expect(mocks.current.service.executor.registerRenewal).toHaveBeenCalled())
    const pending = wallet.executorSettled()

    await act(() => wallet.lockWallet())

    await expect(pending).resolves.toEqual({ status: 'no-executor' })
    // the aborted session cannot come back with its late answer
    await act(async () => renewed(registration(RENEWAL)))
    expect(wallet.executorStatus).toBe('no-executor')
    expect(wallet.executorSettledCount).toBe(0)
  })

  it.each(['resolves', 'rejects'])(
    'does not start the renewal of a session locked while boarding %s',
    async (outcome) => {
      withExecutor()
      const { executor } = mocks.current.service
      let finish!: () => void
      executor.registerBoarding.mockReturnValue(
        new Promise<void>(
          (resolve, reject) => (finish = outcome === 'resolves' ? resolve : () => reject(new Error('late'))),
        ),
      )
      Object.assign(mocks.current.service, { clear: vi.fn(async () => {}) })
      await startWallet()
      await vi.waitFor(() => expect(executor.registerBoarding).toHaveBeenCalled())

      await act(() => wallet.lockWallet())
      await act(async () => finish())
      await new Promise((r) => setTimeout(r, 50))

      expect(executor.registerRenewal).not.toHaveBeenCalled()
    },
  )

  it('does not start the renewal of a session replaced while boarding was pending', async () => {
    withExecutor()
    const { executor } = mocks.current.service
    let first!: () => void
    executor.registerBoarding.mockReturnValueOnce(new Promise<void>((r) => (first = r)))
    await startWallet()
    await vi.waitFor(() => expect(executor.registerBoarding).toHaveBeenCalledTimes(1))

    executor.registerBoarding.mockResolvedValueOnce(undefined)
    await act(() => wallet.initWallet({ privateKey: new Uint8Array(32).fill(1) }))
    await vi.waitFor(() => expect(executor.registerRenewal).toHaveBeenCalledTimes(1))
    await act(async () => first())
    await new Promise((r) => setTimeout(r, 50))

    // only the new session's renewal
    expect(executor.registerRenewal).toHaveBeenCalledTimes(1)
  })

  it('does not let an old session settle a new one', async () => {
    withExecutor()
    const { executor } = mocks.current.service
    let first!: (r: unknown) => void
    executor.registerRenewal.mockReturnValueOnce(new Promise((r) => (first = r)))
    await startWallet()
    await vi.waitFor(() => expect(executor.registerRenewal).toHaveBeenCalledTimes(1))

    let second!: (r: unknown) => void
    executor.registerRenewal.mockReturnValueOnce(new Promise((r) => (second = r)))
    await act(() => wallet.initWallet({ privateKey: new Uint8Array(32).fill(1) }))
    await vi.waitFor(() => expect(executor.registerRenewal).toHaveBeenCalledTimes(2))
    const pending = wallet.executorSettled()

    await act(async () => first(registration('tark1old')))
    expect(await isPending(pending)).toBe(true)
    expect(wallet.executorSettledCount).toBe(0)

    await act(async () => second(registration(RENEWAL)))
    await expect(pending).resolves.toEqual({ status: 'success' })
  })
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
