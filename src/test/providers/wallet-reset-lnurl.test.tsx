import { act, render } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeHandle } from '@arkade-os/sdk'
import { LNURL_LIGHTNING_RAIL } from '@arkade-os/lnurl-client/arkade'
import { WalletContext, WalletProvider } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { forgetLnurlSends, lnurlSends, recordLnurlSend } from '../../lib/lnurlSends'
import { mockAspContextValue, mockConfigContextValue } from '../screens/mocks'

const mocks = vi.hoisted(() => ({
  purge: vi.fn(),
  service: {
    activity: { use: vi.fn() },
    getVtxoManager: vi.fn().mockResolvedValue({ renewVtxos: async () => {} }),
    getStatus: vi.fn().mockResolvedValue({ walletInitialized: true }),
    getVtxos: vi.fn().mockResolvedValue([]),
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
  clearLnurlPaymentsForReset: (...args: unknown[]) => mocks.purge(...args),
}))
vi.mock('../../lib/swapRepository', () => ({ assetSwapRepository: { clear: async () => {} } }))

let wallet: React.ContextType<typeof WalletContext>
function Capture() {
  wallet = useContext(WalletContext)
  return null
}

const renderWallet = async () => {
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
  expect(wallet.svcWallet).toBe(mocks.service)
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.service.getStatus.mockResolvedValue({ walletInitialized: true })
  mocks.service.getVtxoManager.mockResolvedValue({ renewVtxos: async () => {} })
  mocks.service.getVtxos.mockResolvedValue([])
  forgetLnurlSends()
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistration: async () => undefined, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('wallet reset LNURL boundary', () => {
  it('leaves persisted wallet and service repositories intact when the preimage purge fails', async () => {
    await renderWallet()
    localStorage.setItem('reset-marker', 'wallet intact')
    mocks.purge.mockRejectedValueOnce(new Error('preimage purge failed'))

    await expect(wallet.resetWallet()).rejects.toThrow('preimage purge failed')

    expect(localStorage.getItem('reset-marker')).toBe('wallet intact')
    expect(mocks.service.clear).not.toHaveBeenCalled()
    expect(mocks.service.walletRepository.clear).not.toHaveBeenCalled()
    expect(mocks.service.contractRepository.clear).not.toHaveBeenCalled()
  })

  it('keeps the wallet listening for balance updates when the preimage purge fails', async () => {
    await renderWallet()
    mocks.purge.mockRejectedValueOnce(new Error('preimage purge failed'))

    await expect(wallet.resetWallet()).rejects.toThrow('preimage purge failed')

    expect(navigator.serviceWorker.removeEventListener).not.toHaveBeenCalled()
  })

  it('invalidates old send subscriptions after purge and before localStorage is cleared', async () => {
    await renderWallet()
    const order: string[] = []
    mocks.purge.mockImplementationOnce(async () => {
      order.push('purge')
    })
    let emit!: Parameters<Parameters<typeof makeHandle>[1]>[0]
    const handle = makeHandle(LNURL_LIGHTNING_RAIL, (sendUpdate) => {
      emit = sendUpdate
      return new Promise(() => {})
    })
    recordLnurlSend(
      handle,
      {
        railId: LNURL_LIGHTNING_RAIL,
        amount: 1,
        fee: 0,
        total: 1,
        send: async () => handle,
      },
      'alice@example.com',
    )
    emit({ status: 'sent', result: { railId: LNURL_LIGHTNING_RAIL, txid: 'old-send' } })
    const clear = localStorage.clear.bind(localStorage)
    vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
      order.push('storage clear')
      clear()
      emit({ status: 'settled', result: { railId: LNURL_LIGHTNING_RAIL, txid: 'old-send', preimage: 'ab'.repeat(32) } })
    })

    await act(() => wallet.resetWallet())

    expect(order).toEqual(['purge', 'storage clear'])
    expect(navigator.serviceWorker.removeEventListener).toHaveBeenCalled()
    expect(lnurlSends()).toEqual([])
    expect(mocks.service.clear).toHaveBeenCalledOnce()
    expect(mocks.service.walletRepository.clear).toHaveBeenCalledOnce()
    expect(mocks.service.contractRepository.clear).toHaveBeenCalledOnce()
  })
})
