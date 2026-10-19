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
  syncLnurl: vi.fn(),
  resync: undefined as (() => Promise<number>) | undefined,
  service: {
    activity: { use: vi.fn() },
    getVtxoManager: vi.fn().mockResolvedValue({ renewVtxos: async () => {} }),
    getStatus: vi.fn().mockResolvedValue({ walletInitialized: true }),
    getVtxos: vi.fn().mockResolvedValue([]),
    getAddress: vi.fn().mockResolvedValue('ark1current'),
    getBoardingAddress: vi.fn().mockResolvedValue('bc1current'),
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
vi.mock('../../lib/lnurlActivitySync', () => ({
  syncLnurlActivity: (...args: unknown[]) => mocks.syncLnurl(...args),
  lnurlResyncOnPayment: (sync: () => Promise<number>) => {
    mocks.resync = sync
    return { onPayment: vi.fn(), cancel: vi.fn() }
  },
}))

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
  mocks.service.getAddress.mockReset().mockResolvedValue('ark1current')
  mocks.service.getBoardingAddress.mockReset().mockResolvedValue('bc1current')
  mocks.syncLnurl.mockResolvedValue({ synced: 0, failures: [] })
  forgetLnurlSends()
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistration: async () => undefined, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('wallet LNURL destination refresh', () => {
  it('reads current destinations in order when another sync starts during a held address read', async () => {
    let release!: (address: string) => void
    mocks.service.getAddress.mockImplementationOnce(() => new Promise<string>((resolve) => (release = resolve)))
    await renderWallet()
    expect(mocks.service.getAddress).toHaveBeenCalledTimes(1)

    let next!: Promise<number>
    await act(async () => {
      next = mocks.resync!()
    })
    expect(mocks.service.getAddress).toHaveBeenCalledTimes(1)
    expect(mocks.syncLnurl).not.toHaveBeenCalled()
    await act(async () => {
      release('ark1previous')
      await next
    })

    expect(mocks.syncLnurl.mock.calls.map(([, address]) => address)).toEqual(['ark1previous', 'ark1current'])
    expect(mocks.syncLnurl.mock.calls.map(([, , options]) => options.boardingAddress)).toEqual([
      'bc1current',
      'bc1current',
    ])
  })

  it('does not refresh destinations or start a queued read after the wallet locks', async () => {
    let release!: (address: string) => void
    mocks.service.getAddress.mockImplementationOnce(() => new Promise<string>((resolve) => (release = resolve)))
    await renderWallet()
    let next!: Promise<number>
    await act(async () => {
      next = mocks.resync!()
      await wallet.lockWallet()
    })
    await act(async () => {
      release('ark1previous')
      await next
    })

    expect(mocks.service.getAddress).toHaveBeenCalledTimes(1)
    expect(mocks.service.getBoardingAddress).not.toHaveBeenCalled()
    expect(mocks.syncLnurl).not.toHaveBeenCalled()
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
    expect(lnurlSends()).toEqual([])
    expect(mocks.service.clear).toHaveBeenCalledOnce()
    expect(mocks.service.walletRepository.clear).toHaveBeenCalledOnce()
    expect(mocks.service.contractRepository.clear).toHaveBeenCalledOnce()
  })
})
