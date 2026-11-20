import { act, render } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { WalletContext, WalletProvider } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { setPrivateKey } from '../../lib/privateKey'
import { mockAspContextValue, mockConfigContextValue } from '../screens/mocks'

const KEY = new Uint8Array(32).fill(1)
const PUBKEY = hex.encode(secp256k1.getPublicKey(KEY))

const mocks = vi.hoisted(() => ({
  setup: vi.fn(),
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
  ServiceWorkerWallet: { setup: async () => mocks.setup() },
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

let wallet: React.ContextType<typeof WalletContext>
function Capture() {
  wallet = useContext(WalletContext)
  return null
}

beforeEach(async () => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.setup.mockRejectedValue(new Error('server unreachable'))
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistration: async () => undefined, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  })
  localStorage.setItem('wallet', JSON.stringify({ nextRollover: 0, pubkey: PUBKEY }))
  await setPrivateKey(KEY, 'right')
  render(
    <AspContext.Provider value={mockAspContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <WalletProvider>
          <Capture />
        </WalletProvider>
      </ConfigContext.Provider>
    </AspContext.Provider>,
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('unlocking', () => {
  // App leaves Unlock for Home as soon as the password is accepted, so the screen that submitted it is
  // gone when the wallet fails to start. The one that comes back reads this to say why.
  it('remembers a wallet that failed to start after the password was accepted', async () => {
    await act(async () => {
      await expect(wallet.unlockWallet('right')).rejects.toThrow()
    })

    expect(wallet.authState).toBe('locked')
    expect(wallet.unlockFailure).toBe('connection')
  })

  it('remembers nothing for a wrong password, which Unlock reports itself', async () => {
    await act(async () => {
      await expect(wallet.unlockWallet('wrong')).rejects.toThrow()
    })

    expect(wallet.unlockFailure).toBeNull()
  })
})
