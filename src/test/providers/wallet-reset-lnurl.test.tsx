import { act, render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeHandle } from '@arkade-os/sdk'
import { LNURL_LIGHTNING_RAIL } from '@arkade-os/lnurl-client/arkade'
import { WalletContext, WalletProvider } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { forgetLnurlSends, lnurlSends, recordLnurlSend } from '../../lib/lnurlSends'
import { mockAspContextValue, mockConfigContextValue } from '../screens/mocks'
import { assetSwapRepository } from '../../lib/swapRepository'

const unsubscribeWalletUpdates = vi.hoisted(() => vi.fn())
const mocks = vi.hoisted(() => ({
  purge: vi.fn(),
  setup: vi.fn(),
  service: {
    onWalletUpdate: vi.fn(() => unsubscribeWalletUpdates),
    activity: { use: vi.fn() },
    getVtxoManager: vi.fn().mockResolvedValue({ renewVtxos: async () => {} }),
    getStatus: vi.fn().mockResolvedValue({ walletInitialized: true }),
    getVtxos: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    walletRepository: { clear: vi.fn().mockResolvedValue(undefined) },
    contractRepository: { clear: vi.fn().mockResolvedValue(undefined) },
  },
}))

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  ServiceWorkerWallet: { setup: (...args: unknown[]) => mocks.setup(...args) },
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
vi.mock('../../lib/swapRepository', async () => {
  const { InMemoryAssetSwapRepository } = await import('@arkade-os/swap')
  return { assetSwapRepository: new InMemoryAssetSwapRepository() }
})

const heldInput = { txid: '11'.repeat(32), vout: 0 }
const journalKey = `taxi-input-reservations:regtest:http://arkd.test:${'22'.repeat(32)}`
const journal = JSON.stringify([{ id: 'taxi-send:pending', outpoints: [heldInput], phase: 'submitting' }])
const pendingSwap = {
  id: '33'.repeat(32),
  fromAsset: 'btc',
  toAsset: '44'.repeat(34),
  fromAmount: '1000',
  toAmount: '500',
  swapAddress: 'tark1pending',
  swapPkScript: `5120${'55'.repeat(32)}`,
  offerHex: '0100',
  fundingTxid: '33'.repeat(32),
  status: 'pending' as const,
  createdAt: 1,
}

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

beforeEach(async () => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.setup.mockReset().mockResolvedValue(mocks.service)
  mocks.service.dispose.mockReset().mockResolvedValue(undefined)
  await assetSwapRepository.clear()
  mocks.service.getStatus.mockResolvedValue({ walletInitialized: true })
  mocks.service.getVtxoManager.mockResolvedValue({ renewVtxos: async () => {} })
  mocks.service.getVtxos.mockResolvedValue([])
  forgetLnurlSends()
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistration: async () => undefined, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('wallet lock lifecycle', () => {
  it('awaits non-destructive disposal while preserving pending swap and Taxi input recovery records', async () => {
    await renderWallet()
    await assetSwapRepository.saveSwap(pendingSwap)
    localStorage.setItem(journalKey, journal)
    let finish!: () => void
    mocks.service.dispose.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
    let locking!: Promise<void>
    await act(async () => {
      locking = wallet.lockWallet()
    })
    expect(mocks.service.dispose).toHaveBeenCalledOnce()
    expect(wallet.initialized).toBe(true)
    await act(async () => {
      finish()
      await locking
    })
    expect(wallet.authState).toBe('locked')
    expect(wallet.initialized).toBe(false)
    expect(localStorage.getItem(journalKey)).toBe(journal)
    expect((await assetSwapRepository.getAssetSwapsPage({ limit: 10 })).items).toEqual([pendingSwap])
    expect(mocks.purge).not.toHaveBeenCalled()
    expect(mocks.service.clear).not.toHaveBeenCalled()
    expect(mocks.service.walletRepository.clear).not.toHaveBeenCalled()
    expect(mocks.service.contractRepository.clear).not.toHaveBeenCalled()
  })

  it('preserves recovery records and propagates a failed disposal', async () => {
    await renderWallet()
    await assetSwapRepository.saveSwap(pendingSwap)
    localStorage.setItem(journalKey, journal)
    mocks.service.dispose.mockRejectedValueOnce(new Error('worker disposal failed'))
    await expect(wallet.lockWallet()).rejects.toThrow('worker disposal failed')
    expect(wallet.initialized).toBe(true)
    expect(localStorage.getItem(journalKey)).toBe(journal)
    expect((await assetSwapRepository.getAssetSwapsPage({ limit: 10 })).items).toEqual([pendingSwap])
    expect(mocks.service.clear).not.toHaveBeenCalled()
  })

  it('disposes a worker initialized after a concurrent lock without clearing its stores', async () => {
    await renderWallet()
    const lateService = { ...mocks.service, dispose: vi.fn().mockResolvedValue(undefined) }
    let finishSetup!: () => void
    mocks.setup.mockImplementationOnce(() => new Promise((resolve) => (finishSetup = () => resolve(lateService))))
    let initializing!: Promise<void>
    await act(async () => {
      initializing = wallet.initWallet({ privateKey: new Uint8Array(32).fill(1) })
    })
    await waitFor(() => expect(mocks.setup).toHaveBeenCalledTimes(2))
    await act(() => wallet.lockWallet())
    await act(async () => {
      finishSetup()
      await initializing
    })
    expect(mocks.service.dispose).toHaveBeenCalledOnce()
    expect(lateService.dispose).toHaveBeenCalledOnce()
    expect(mocks.service.clear).not.toHaveBeenCalled()
    expect(wallet.initialized).toBe(false)
  })
})

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

    expect(unsubscribeWalletUpdates).not.toHaveBeenCalled()
  })

  it('invalidates old send subscriptions after purge and before localStorage is cleared', async () => {
    await renderWallet()
    await assetSwapRepository.saveSwap(pendingSwap)
    localStorage.setItem(journalKey, journal)
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
    expect(unsubscribeWalletUpdates).toHaveBeenCalledOnce()
    expect(lnurlSends()).toEqual([])
    expect(mocks.service.clear).toHaveBeenCalledOnce()
    expect(mocks.service.walletRepository.clear).toHaveBeenCalledOnce()
    expect(mocks.service.contractRepository.clear).toHaveBeenCalledOnce()
    expect(mocks.service.dispose).not.toHaveBeenCalled()
    expect(localStorage.getItem(journalKey)).toBeNull()
    expect((await assetSwapRepository.getAssetSwapsPage({ limit: 10 })).items).toEqual([])
  })
})
