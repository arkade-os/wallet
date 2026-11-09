import { act, cleanup, render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SwapsContext, SwapsProvider } from '../../providers/swaps'
import { WalletContext } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  start: vi.fn(),
  pending: true,
  dispose: vi.fn(),
  ready: vi.fn(),
  reload: vi.fn(),
  host: false,
  watchMarkets: vi.fn(),
  discoverMarkets: vi.fn(),
  stopMarkets: vi.fn(),
}))
vi.mock('../../lib/nativeBridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/nativeBridge')>()),
  isNativeHost: () => mocks.host,
}))
vi.mock('../../lib/swapClient', () => ({
  makeSwapClient: (...args: unknown[]) => {
    mocks.create(...args)
    return {
      ready: mocks.ready(),
      start: mocks.start,
      swaps: async () => (mocks.pending ? [{ outcome: 'funded' }] : []),
      onUpdate: () => () => {},
      [Symbol.asyncDispose]: mocks.dispose,
    }
  },
  SwapsHeldElsewhere: class extends Error {},
}))
vi.mock('../../lib/swapMarkets', () => ({
  discoverMarkets: mocks.discoverMarkets,
  watchSwapMarkets: mocks.watchMarkets,
}))
vi.mock('../../lib/swapRecords', () => ({ displayAssetOf: (id: string) => id, offerSwaps: async () => [] }))
vi.mock('../../lib/swapRepository', () => ({ saveQuoteSnapshot: vi.fn() }))

let context: React.ContextType<typeof SwapsContext>
function Capture() {
  context = useContext(SwapsContext)
  return null
}
function mount(hasWallet = true) {
  return render(
    <AspContext.Provider value={mockAspContextValue}>
      <WalletContext.Provider
        value={{
          ...mockWalletContextValue,
          dataReady: true,
          svcWallet: hasWallet ? ({ identity: {} } as never) : undefined,
          reloadWallet: mocks.reload,
          wallet: { nextRollover: 0, ...(hasWallet ? { pubkey: `02${'11'.repeat(32)}` } : {}) },
        }}
      >
        <SwapsProvider>
          <Capture />
        </SwapsProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
  mocks.pending = true
  mocks.host = false
  mocks.watchMarkets.mockReturnValue(mocks.stopMarkets)
  mocks.discoverMarkets.mockResolvedValue([])
  mocks.start.mockResolvedValue(undefined)
  mocks.dispose.mockResolvedValue(undefined)
  mocks.ready.mockResolvedValue(undefined)
  mocks.reload.mockResolvedValue(undefined)
})
afterEach(() => cleanup())

it('builds the shared swap client for a software wallet', async () => {
  mount()
  await waitFor(() => expect(mocks.create).toHaveBeenCalled())
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ identity: {} }), 'regtest')
})

it('blocks new payment actions synchronously and waits for disposal before backup can continue', async () => {
  const view = mount()
  await waitFor(() => expect(mocks.reload).toHaveBeenCalled())
  let release!: () => void
  mocks.dispose.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve
      }),
  )
  let drained = false
  let pause!: Promise<void>
  await act(async () => {
    pause = context.pauseForBackup().then(() => {
      drained = true
    })
  })
  await waitFor(() => expect(mocks.dispose).toHaveBeenCalledTimes(1))
  expect(drained).toBe(false)
  await expect(context.sendRouter({ swapsOptional: true })).rejects.toThrow('paused for backup')
  expect(mocks.stopMarkets).toHaveBeenCalledTimes(1)
  expect(mocks.start).not.toHaveBeenCalled()
  await act(async () => {
    release()
    await pause
  })
  expect(drained).toBe(true)
  await act(() => context.pauseForBackup())
  view.unmount()
  expect(mocks.dispose).toHaveBeenCalledTimes(1)
  expect(mocks.stopMarkets).toHaveBeenCalledTimes(1)
})

it('can pause for backup when no client was acquired', async () => {
  Object.defineProperty(navigator, 'locks', {
    value: { request: vi.fn(() => new Promise(() => {})) },
    configurable: true,
  })
  mount()
  await act(() => context.pauseForBackup())
  expect(mocks.create).not.toHaveBeenCalled()
  expect(mocks.dispose).not.toHaveBeenCalled()
})

it('starts disposal immediately but waits for pending restoration before backup completes', async () => {
  let finishRestore!: () => void
  mocks.ready.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finishRestore = resolve
    }),
  )
  mount()
  await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
  let pause!: Promise<void>
  let drained = false
  await act(async () => {
    pause = context.pauseForBackup().then(() => {
      drained = true
    })
  })
  await waitFor(() => expect(mocks.dispose).toHaveBeenCalledTimes(1))
  expect(drained).toBe(false)
  await act(async () => {
    finishRestore()
    await pause
  })
  expect(mocks.dispose).toHaveBeenCalledTimes(1)
  expect(mocks.start).not.toHaveBeenCalled()
})

it('keeps a fresh native app profile empty until a wallet is created or restored', () => {
  mocks.host = true
  mount(false)
  context.runDiscovery(false)
  expect(mocks.watchMarkets).not.toHaveBeenCalled()
  expect(mocks.discoverMarkets).not.toHaveBeenCalled()
  expect(mocks.create).not.toHaveBeenCalled()
})

it('preserves discovery on the browser welcome screen', () => {
  mount(false)
  expect(mocks.watchMarkets).toHaveBeenCalledTimes(1)
})
