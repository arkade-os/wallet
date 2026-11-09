import { act, cleanup, render, waitFor } from '@testing-library/react'
import { useContext, useState } from 'react'
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MnemonicIdentity, SingleKey, type WalletConfig } from '@arkade-os/sdk'
import { WalletContext, WalletProvider } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { ForegroundWallet } from '../../lib/walletRuntime'
import { setMnemonic } from '../../lib/mnemonic'
import { setPrivateKey } from '../../lib/privateKey'
import { mockAspContextValue, mockConfigContextValue } from '../screens/mocks'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  softwareSetup: vi.fn(),
  secrets: new Map<string, string>(),
  repositories: vi.fn(),
  updateConfig: vi.fn(),
}))
vi.mock('../../lib/nativeBridge', () => ({
  isNativeHost: () => true,
}))
vi.mock('../../lib/secretStore', () => ({
  hasSecret: (key: string) => mocks.secrets.has(key),
  getSecretStore: () => ({
    getItem: async (key: string) => mocks.secrets.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mocks.secrets.set(key, value)
    },
    removeItem: async (key: string) => {
      mocks.secrets.delete(key)
    },
  }),
}))
vi.mock('../../lib/nativeRepositories', () => ({ createNativeRepositories: mocks.repositories }))
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
    async getWalletState() {
      return null
    }
  },
  IndexedDBContractRepository: class {},
}))
vi.mock('../../lib/lnurlActivitySync', () => ({
  syncLnurlActivity: vi.fn(async () => ({ synced: 0, failures: [] })),
  lnurlResyncOnPayment: () => ({ cancel: vi.fn(), onPayment: vi.fn() }),
}))

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
let context: React.ContextType<typeof WalletContext>
let runtime: ForegroundWallet & { restore: ReturnType<typeof vi.fn> }
function Capture() {
  context = useContext(WalletContext)
  return null
}
function mount() {
  function Harness() {
    const [config, setConfig] = useState<React.ContextType<typeof ConfigContext>['config']>(
      mockConfigContextValue.config,
    )
    return (
      <AspContext.Provider value={mockAspContextValue}>
        <ConfigContext.Provider
          value={{
            ...mockConfigContextValue,
            config,
            updateConfig: (value) => {
              mocks.updateConfig(value)
              setConfig(value)
            },
          }}
        >
          <WalletProvider>
            <Capture />
          </WalletProvider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    )
  }
  return render(<Harness />)
}

beforeEach(() => {
  localStorage.clear()
  mocks.secrets.clear()
  vi.clearAllMocks()
  vi.stubGlobal('crypto', webcrypto)
  const walletRepository = { getWalletState: async () => null, clear: vi.fn() }
  const contractRepository = { clear: vi.fn() }
  mocks.repositories.mockResolvedValue({
    walletRepository,
    contractRepository,
    intentRepository: {},
    virtualTxRepository: {},
    clear: vi.fn(),
  })
  runtime = Object.assign(Object.create(ForegroundWallet.prototype), {
    clear: vi.fn().mockResolvedValue(undefined),
    restore: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn(async () => ({ walletInitialized: true })),
    activity: { use: vi.fn() },
    getVtxoManager: vi.fn(async () => ({ renewVtxos: vi.fn() })),
    getContractManager: vi.fn(async () => ({
      getSyncState: () => ({ lastSyncedAt: Date.now() }),
      onContractEvent: () => vi.fn(),
    })),
    notifyIncomingFunds: vi.fn(async () => vi.fn()),
    getVtxos: vi.fn(async () => []),
    getBoardingUtxos: vi.fn(async () => []),
    getAddress: vi.fn(async () => 'tark1software'),
    getBoardingAddress: vi.fn(async () => 'bcrt1software'),
    walletRepository,
    contractRepository,
  })
  mocks.create.mockImplementation(async (config: WalletConfig) => {
    Object.assign(runtime, { identity: config.identity })
    return runtime
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('software credentials in the native wallet host', () => {
  it('refuses replacing an unsupported stored wallet before creating a signer or changing configuration', async () => {
    const wallet = JSON.stringify({
      nextRollover: 0,
      pubkey: `02${'11'.repeat(32)}`,
      signer: { type: 'external', publicKey: `02${'11'.repeat(32)}` },
    })
    localStorage.setItem('wallet', wallet)
    mocks.secrets.set('encrypted_private_key', 'existing encrypted credential')
    mount()

    await act(async () => {
      await expect(context.initWallet({ privateKey: new Uint8Array(32).fill(7) })).rejects.toThrow(
        'This build does not support the stored wallet',
      )
    })

    expect(mocks.updateConfig).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.repositories).not.toHaveBeenCalled()
    expect(localStorage.getItem('wallet')).toBe(wallet)
    expect(mocks.secrets.get('encrypted_private_key')).toBe('existing encrypted credential')
  })

  it('creates an HD mnemonic wallet in the foreground and reopens it with the same encrypted credentials', async () => {
    await setMnemonic(mnemonic, 'fixture password')
    mount()
    await act(() => context.initWallet({ mnemonic, walletMode: 'hd' }))
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ walletMode: 'hd', identity: expect.any(MnemonicIdentity) }),
    )
    expect(context.svcWallet).toBe(runtime)
    const publicKey = context.wallet.pubkey
    await act(() => context.lockWallet())
    await act(() => context.unlockWallet('fixture password'))
    expect(context.wallet.pubkey).toBe(publicKey)
    expect(context.authState).toBe('authenticated')
    expect(mocks.create.mock.calls.every(([config]) => config.walletMode === 'hd')).toBe(true)
    expect(mocks.secrets.get('encrypted_mnemonic')).toBeTruthy()
    expect(localStorage.getItem('encrypted_mnemonic')).toBeNull()
    expect(mocks.softwareSetup).not.toHaveBeenCalled()
  })

  it('restores mnemonic HD addresses through the same foreground runtime', async () => {
    await setMnemonic(mnemonic, 'restore password')
    mount()
    await act(() => context.initWallet({ mnemonic, walletMode: 'hd', restoring: true }))
    expect(runtime.restore).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ walletMode: 'hd' }))
  })

  it('keeps raw-key software wallets static and requires their password after a manual lock', async () => {
    const privateKey = new Uint8Array(32).fill(7)
    await setPrivateKey(privateKey, 'key password')
    mount()
    await act(() => context.initWallet({ privateKey, walletMode: 'hd' }))
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ walletMode: 'static', identity: expect.any(SingleKey) }),
    )
    await act(() => context.lockWallet())
    await act(async () => {
      await expect(context.unlockWallet('wrong password')).rejects.toThrow()
    })
    expect(context.authState).toBe('locked')
    await act(() => context.unlockWallet('key password'))
    await waitFor(() => expect(context.authState).toBe('authenticated'))
    expect(mocks.secrets.get('encrypted_private_key')).toBeTruthy()
    expect(localStorage.getItem('encrypted_private_key')).toBeNull()
    expect(mocks.softwareSetup).not.toHaveBeenCalled()
  })
})
