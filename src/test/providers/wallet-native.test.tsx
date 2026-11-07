import { act, cleanup, render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SingleKey } from '@arkade-os/sdk'
import { WalletContext, WalletProvider } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { BackupContext } from '../../providers/backup'
import { ForegroundWallet } from '../../lib/walletRuntime'
import { mockAspContextValue, mockConfigContextValue } from '../screens/mocks'

const mocks = vi.hoisted(() => ({
  native: true,
  create: vi.fn(),
  connect: vi.fn(),
  loadIdentity: vi.fn(),
  disconnect: vi.fn(),
  softwareSetup: vi.fn(),
  backup: vi.fn(),
  syncLnurl: vi.fn(),
  resyncLnurl: vi.fn(),
  walletDatabases: [] as (string | undefined)[],
  contractDatabases: [] as (string | undefined)[],
}))

vi.mock('../../lib/nativeBridge', () => ({
  isNativeHost: () => mocks.native,
  connectNativeIdentity: mocks.connect,
  loadNativeIdentity: mocks.loadIdentity,
  disconnectNativeIdentity: mocks.disconnect,
}))
vi.mock('../../lib/nativeRepositories', () => ({
  createNativeRepositories: vi.fn(async ({ legacyDatabase }: { legacyDatabase: string }) => {
    mocks.walletDatabases.push(legacyDatabase)
    mocks.contractDatabases.push(legacyDatabase)
    return {
      walletRepository: { getWalletState: async () => null },
      contractRepository: {},
      intentRepository: {},
      virtualTxRepository: {},
      clear: vi.fn(),
    }
  }),
}))
vi.mock('../../lib/secretStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/secretStore')>()),
  hasSecret: (key: string) => Boolean(localStorage.getItem(key)),
}))
vi.mock('../../lib/walletRuntime', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../lib/walletRuntime')>()
  class ForegroundWallet extends original.ForegroundWallet {}
  Object.defineProperty(ForegroundWallet, 'create', { value: mocks.create })
  return { ...original, ForegroundWallet }
})
vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  ServiceWorkerWallet: { setup: mocks.softwareSetup },
  IndexedDBWalletRepository: class {
    constructor(name?: string) {
      mocks.walletDatabases.push(name)
    }
    async getWalletState() {
      return null
    }
  },
  IndexedDBContractRepository: class {
    constructor(name?: string) {
      mocks.contractDatabases.push(name)
    }
  },
}))
vi.mock('../../lib/lnurlActivitySync', () => ({
  syncLnurlActivity: mocks.syncLnurl,
  lnurlResyncOnPayment: mocks.resyncLnurl,
}))

const publicKey = '031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f'
const nativeWallet = {
  nextRollover: 0,
  network: 'regtest',
  pubkey: publicKey,
  signer: { type: 'native', publicKey, name: 'Satochip' },
}
let context: React.ContextType<typeof WalletContext>
function Capture() {
  context = useContext(WalletContext)
  return null
}

const makeRuntime = () => {
  const stopContracts = vi.fn()
  const stopFunds = vi.fn()
  const runtime = Object.assign(Object.create(ForegroundWallet.prototype), {
    clear: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({ walletInitialized: true }),
    activity: { use: vi.fn() },
    getVtxoManager: vi.fn().mockResolvedValue({ renewVtxos: vi.fn() }),
    getContractManager: vi.fn().mockResolvedValue({
      getSyncState: () => ({ lastSyncedAt: Date.now() }),
      onContractEvent: vi.fn(() => stopContracts),
    }),
    notifyIncomingFunds: vi.fn().mockResolvedValue(stopFunds),
    getVtxos: vi.fn().mockResolvedValue([]),
    getBoardingUtxos: vi.fn().mockResolvedValue([]),
    getAddress: vi.fn().mockResolvedValue('tark1fixture'),
    getBoardingAddress: vi.fn().mockResolvedValue('bcrt1fixture'),
    getActivityHistory: vi.fn().mockResolvedValue([
      {
        id: 'stored',
        amount: 1234,
        createdAt: 1_700_000_000_000,
        settled: true,
        txs: [
          {
            amount: 1234,
            createdAt: 1_700_000_000_000,
            settled: true,
            type: 'RECEIVED',
            key: { arkTxid: 'stored-payment', boardingTxid: '', commitmentTxid: '' },
          },
        ],
      },
    ]),
    getBalance: vi
      .fn()
      .mockResolvedValue({ total: 1234, available: 1234, assets: [], availableAssets: [], unrolled: 0 }),
    walletRepository: { clear: vi.fn() },
    contractRepository: { clear: vi.fn() },
  })
  return { runtime, stopContracts, stopFunds }
}

function mount(network: 'regtest' | 'bitcoin' = 'regtest') {
  return render(
    <AspContext.Provider value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network } }}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <BackupContext.Provider
          value={{
            backupAndUpdateConfig: vi.fn(),
            backupConfig: vi.fn().mockResolvedValue(undefined),
            backupSolverCards: vi.fn().mockResolvedValue(undefined),
            fullBackup: vi.fn().mockResolvedValue(undefined),
            restore: vi.fn().mockResolvedValue(undefined),
            initialiseNostrBackup: mocks.backup,
          }}
        >
          <WalletProvider>
            <Capture />
          </WalletProvider>
        </BackupContext.Provider>
      </ConfigContext.Provider>
    </AspContext.Provider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.native = true
  mocks.walletDatabases.length = 0
  mocks.contractDatabases.length = 0
  mocks.disconnect.mockResolvedValue(undefined)
  mocks.loadIdentity.mockResolvedValue(SingleKey.fromPrivateKey(new Uint8Array(32).fill(1)))
  mocks.create.mockResolvedValue(makeRuntime().runtime)
  mocks.syncLnurl.mockResolvedValue({ synced: 0, failures: [] })
  mocks.resyncLnurl.mockReturnValue({ cancel: vi.fn(), onPayment: vi.fn() })
  mocks.connect.mockResolvedValue({
    identity: SingleKey.fromPrivateKey(new Uint8Array(32).fill(1)),
    publicKey,
    name: 'Satochip',
  })
})
afterEach(() => cleanup())

describe('native wallet lifecycle', () => {
  it('opens a stored native wallet for reading without requesting the card or software credentials', async () => {
    localStorage.setItem('wallet', JSON.stringify(nativeWallet))
    mount()
    await waitFor(() => expect(context.authState).toBe('authenticated'))
    expect(context.svcWallet).toBeDefined()
    expect(mocks.loadIdentity).toHaveBeenCalledWith(publicKey)
    expect(await context.svcWallet!.getAddress()).toBe('tark1fixture')
    await act(() => context.reloadWallet())
    expect(context.balance).toBe(1234)
    expect(context.txs).toEqual([expect.objectContaining({ redeemTxid: 'stored-payment' })])
    expect(context.dataReady).toBe(true)
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(mocks.softwareSetup).not.toHaveBeenCalled()
  })

  it('uses the foreground wallet and separate card-bound repositories without serializing a secret', async () => {
    const { runtime, stopContracts, stopFunds } = makeRuntime()
    mocks.create.mockResolvedValue(runtime)
    mount()
    await act(() => context.connectHardwareWallet('123456', publicKey))
    expect(mocks.connect).toHaveBeenCalledWith(publicKey, '123456')
    expect(context.authState).toBe('authenticated')
    expect(context.svcWallet).toBe(runtime)
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ settlementConfig: false }))
    expect(mocks.softwareSetup).not.toHaveBeenCalled()
    expect(mocks.backup).not.toHaveBeenCalled()
    expect(mocks.syncLnurl).not.toHaveBeenCalled()
    expect(mocks.resyncLnurl).not.toHaveBeenCalled()
    expect(mocks.walletDatabases).toEqual([`arkade-native-regtest-${publicKey}`])
    expect(mocks.contractDatabases).toEqual(mocks.walletDatabases)
    expect(JSON.parse(localStorage.getItem('wallet')!)).toEqual(expect.objectContaining(nativeWallet))
    expect(localStorage.getItem('encrypted_private_key')).toBeNull()
    expect(localStorage.getItem('encrypted_mnemonic')).toBeNull()
    await act(() => context.lockWallet())
    expect(context.authState).toBe('locked')
    expect(context.svcWallet).toBeUndefined()
    expect(stopContracts).toHaveBeenCalledTimes(1)
    expect(stopFunds).toHaveBeenCalledTimes(1)
    expect(runtime.walletRepository.clear).not.toHaveBeenCalled()
    expect(runtime.contractRepository.clear).not.toHaveBeenCalled()
    expect(localStorage.getItem('wallet')).not.toBeNull()
    await act(() => context.unlockWallet(''))
    expect(context.authState).toBe('authenticated')
    expect(mocks.connect).toHaveBeenCalledTimes(1)
  })

  it('refuses mainnet or an existing software wallet before invoking the native PIN prompt', async () => {
    const view = mount('bitcoin')
    await expect(context.connectHardwareWallet()).rejects.toThrow('test networks only')
    view.unmount()
    localStorage.setItem('encrypted_mnemonic', 'existing encrypted phrase')
    mount()
    await expect(context.connectHardwareWallet()).rejects.toThrow('software wallet')
    expect(mocks.connect).not.toHaveBeenCalled()
  })

  it('refuses a different card without rebinding persisted wallet data', async () => {
    localStorage.setItem('wallet', JSON.stringify(nativeWallet))
    mocks.connect.mockResolvedValueOnce({
      identity: SingleKey.fromPrivateKey(new Uint8Array(32).fill(2)),
      publicKey: `02${'22'.repeat(32)}`,
      name: 'Satochip',
    })
    mount()
    await waitFor(() => expect(context.authState).toBe('authenticated'))
    const runtime = context.svcWallet
    await act(async () => {
      await expect(context.connectHardwareWallet()).rejects.toThrow('different card')
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem('wallet')!)).toEqual(expect.objectContaining(nativeWallet))
    expect(context.authState).toBe('authenticated')
    expect(context.svcWallet).toBe(runtime)
  })

  it('keeps reading and the same runtime after card loss and same-card reconnection', async () => {
    const { runtime, stopContracts, stopFunds } = makeRuntime()
    mocks.create.mockResolvedValue(runtime)
    localStorage.setItem('wallet', JSON.stringify(nativeWallet))
    mount()
    await waitFor(() => expect(context.authState).toBe('authenticated'))
    await act(() => context.reloadWallet())
    await act(() => context.connectHardwareWallet())
    await act(async () => window.dispatchEvent(new Event('arkade-native-disconnected')))
    expect(context.authState).toBe('authenticated')
    expect(context.svcWallet).toBe(runtime)
    expect(context.balance).toBe(1234)
    expect(context.txs).toEqual([expect.objectContaining({ redeemTxid: 'stored-payment' })])
    expect(context.dataReady).toBe(true)
    expect(await context.svcWallet!.getBoardingAddress()).toBe('bcrt1fixture')
    expect(runtime.clear).not.toHaveBeenCalled()
    expect(stopContracts).not.toHaveBeenCalled()
    expect(stopFunds).not.toHaveBeenCalled()
    expect(mocks.disconnect).not.toHaveBeenCalled()
    await act(() => context.connectHardwareWallet())
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(context.svcWallet).toBe(runtime)
  })

  it('does not open or persist a connection canceled before the card responds', async () => {
    let finish!: (value: Awaited<ReturnType<typeof mocks.connect>>) => void
    mocks.connect.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    const controller = new AbortController()
    mount()
    let pending!: Promise<void>
    await act(async () => {
      pending = context.connectHardwareWallet('123456', undefined, controller.signal)
    })
    await act(async () => controller.abort())
    await act(async () => {
      finish({ publicKey, name: 'Satochip' })
      await expect(pending).rejects.toThrow('cancelled')
    })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(localStorage.getItem('wallet')).toBeNull()
    expect(context.wallet.pubkey).toBeUndefined()
    expect(context.authState).toBe('locked')
  })

  it('clears only the transient runtime when onboarding is canceled during wallet creation', async () => {
    const { runtime } = makeRuntime()
    let finish!: (value: typeof runtime) => void
    mocks.create.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    const controller = new AbortController()
    mount()
    let pending!: Promise<void>
    await act(async () => {
      pending = context.connectHardwareWallet('123456', undefined, controller.signal)
    })
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
    await act(async () => controller.abort())
    await act(async () => {
      finish(runtime)
      await expect(pending).rejects.toThrow('cancelled')
    })
    expect(runtime.clear).toHaveBeenCalledOnce()
    expect(runtime.walletRepository.clear).not.toHaveBeenCalled()
    expect(runtime.contractRepository.clear).not.toHaveBeenCalled()
    expect(context.svcWallet).toBeUndefined()
    expect(context.authState).toBe('locked')
    expect(context.initialized).toBe(false)
    expect(localStorage.getItem('wallet')).toBeNull()
  })

  it('keeps the public wallet readable when reconnection is canceled', async () => {
    localStorage.setItem('wallet', JSON.stringify(nativeWallet))
    const { runtime, stopContracts, stopFunds } = makeRuntime()
    mocks.create.mockResolvedValue(runtime)
    mount()
    await waitFor(() => expect(context.authState).toBe('authenticated'))
    await act(() => context.reloadWallet())
    const controller = new AbortController()
    let finish!: (value: Awaited<ReturnType<typeof mocks.connect>>) => void
    mocks.connect.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    let pending!: Promise<void>
    await act(async () => {
      pending = context.connectHardwareWallet('123456', undefined, controller.signal)
    })
    await act(async () => controller.abort())
    await act(async () => {
      finish({ publicKey, name: 'Satochip' })
      await expect(pending).rejects.toThrow('cancelled')
    })
    expect(context.authState).toBe('authenticated')
    expect(context.svcWallet).toBe(runtime)
    expect(context.balance).toBe(1234)
    expect(context.dataReady).toBe(true)
    expect(context.txs).toEqual([expect.objectContaining({ redeemTxid: 'stored-payment' })])
    expect(runtime.clear).not.toHaveBeenCalled()
    expect(stopContracts).not.toHaveBeenCalled()
    expect(stopFunds).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('wallet')!)).toEqual(expect.objectContaining(nativeWallet))
  })

  it('does not disconnect a replacement connection when a canceled operation completes late', async () => {
    let finish!: (value: Awaited<ReturnType<typeof mocks.connect>>) => void
    mocks.connect.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    const controller = new AbortController()
    mount()
    let pending!: Promise<void>
    await act(async () => {
      pending = context.connectHardwareWallet('123456', undefined, controller.signal)
    })
    await act(async () => controller.abort())
    await act(() => context.connectHardwareWallet('654321'))
    const disconnects = mocks.disconnect.mock.calls.length
    await act(async () => {
      finish({ publicKey, name: 'Satochip' })
      await expect(pending).rejects.toThrow('cancelled')
    })
    expect(mocks.disconnect).toHaveBeenCalledTimes(disconnects)
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(context.authState).toBe('authenticated')
    expect(context.wallet.pubkey).toBe(publicKey)
  })

  it('does not clear a replacement runtime when canceled wallet creation finishes late', async () => {
    const first = makeRuntime().runtime
    const second = makeRuntime().runtime
    let finish!: (value: typeof first) => void
    mocks.create.mockReturnValueOnce(new Promise((resolve) => (finish = resolve))).mockResolvedValueOnce(second)
    const controller = new AbortController()
    mount()
    let pending!: Promise<void>
    await act(async () => {
      pending = context.connectHardwareWallet('123456', undefined, controller.signal)
    })
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
    await act(async () => controller.abort())
    await act(() => context.connectHardwareWallet('654321'))
    const disconnects = mocks.disconnect.mock.calls.length
    await act(async () => {
      finish(first)
      await expect(pending).rejects.toThrow('cancelled')
    })
    expect(first.clear).toHaveBeenCalledOnce()
    expect(second.clear).not.toHaveBeenCalled()
    expect(context.svcWallet).toBe(second)
    expect(context.authState).toBe('authenticated')
    expect(mocks.disconnect).toHaveBeenCalledTimes(disconnects)
  })

  it('does not restart native watchers when canceled onboarding finishes registering listeners', async () => {
    const { runtime, stopContracts, stopFunds } = makeRuntime()
    let finish!: (value: typeof stopFunds) => void
    runtime.notifyIncomingFunds.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    mocks.create.mockResolvedValue(runtime)
    const controller = new AbortController()
    const intervals = vi.spyOn(globalThis, 'setInterval')
    mount()
    let pending!: Promise<void>
    await act(async () => {
      pending = context.connectHardwareWallet('123456', undefined, controller.signal)
    })
    await waitFor(() => expect(runtime.notifyIncomingFunds).toHaveBeenCalledOnce())
    await act(async () => controller.abort())
    const installed = intervals.mock.calls.length
    await act(async () => {
      finish(stopFunds)
      await expect(pending).rejects.toThrow('cancelled')
    })
    expect(intervals).toHaveBeenCalledTimes(installed)
    intervals.mockRestore()
    expect(runtime.clear).toHaveBeenCalledOnce()
    expect(stopContracts).toHaveBeenCalledOnce()
    expect(stopFunds).toHaveBeenCalledOnce()
    expect(context.svcWallet).toBeUndefined()
    expect(context.initialized).toBe(false)
    expect(context.wallet.pubkey).toBeUndefined()
    expect(localStorage.getItem('wallet')).toBeNull()
  })

  it('cannot finish a pending connection after the user locks the wallet', async () => {
    let finish!: (value: Awaited<ReturnType<typeof mocks.connect>>) => void
    mocks.connect.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    mount()
    let pending!: Promise<void>
    await act(async () => {
      pending = context.connectHardwareWallet()
    })
    await act(() => context.lockWallet())
    await act(async () => {
      finish({
        identity: SingleKey.fromPrivateKey(new Uint8Array(32).fill(1)),
        publicKey,
        name: 'Satochip',
      })
      await expect(pending).rejects.toThrow('cancelled')
    })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(localStorage.getItem('wallet')).toBeNull()
    expect(context.authState).toBe('locked')
    await act(() => context.connectHardwareWallet())
    expect(context.authState).toBe('authenticated')
  })

  it('cannot reopen a public read runtime after an explicit privacy lock during cold boot', async () => {
    localStorage.setItem('wallet', JSON.stringify(nativeWallet))
    const { runtime } = makeRuntime()
    let finish!: (value: typeof runtime) => void
    mocks.create.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    mount()
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    await act(() => context.lockWallet())
    await act(async () => {
      finish(runtime)
      await Promise.resolve()
    })
    expect(runtime.clear).toHaveBeenCalledTimes(1)
    expect(context.authState).toBe('locked')
    expect(context.svcWallet).toBeUndefined()
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(runtime.walletRepository.clear).not.toHaveBeenCalled()
  })
})
