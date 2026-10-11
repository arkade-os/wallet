import { useContext, useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InsufficientFunds, type Quote, type Swap } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { SwapsContext, SwapsProvider } from '../../providers/swaps'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

const mocks = vi.hoisted(() => ({
  created: vi.fn(),
  discoverMarkets: vi.fn(),
  offerSwaps: vi.fn(),
  quote: vi.fn(),
  saveSnapshot: vi.fn(),
  receive: vi.fn(),
  accept: vi.fn(),
  cancel: vi.fn(),
  dispose: vi.fn(),
  swaps: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('../../lib/directTaxiSend', () => ({
  getPendingDirectTaxi: async () => undefined,
  withTaxiPaymentLock: async (_wallet: unknown, network: string, run: (sender: string) => Promise<unknown>) =>
    run(`test-sender-${network}`),
}))

vi.mock('../../lib/swapMarkets', () => ({ discoverMarkets: mocks.discoverMarkets }))
vi.mock('../../lib/swapRepository', () => ({
  saveQuoteSnapshot: mocks.saveSnapshot,
  quoteSnapshotOf: () => undefined,
}))
vi.mock('../../lib/swapRecords', () => ({
  displayAssetOf: (assetId: string) => assetId,
  offerSwaps: mocks.offerSwaps,
}))
vi.mock('../../lib/swapClient', () => ({
  makeSwapClient: () => {
    mocks.created()
    return {
      ready: Promise.resolve(),
      onUpdate: () => () => {},
      quote: mocks.quote,
      receive: mocks.receive,
      accept: mocks.accept,
      cancel: mocks.cancel,
      swaps: mocks.swaps,
      [Symbol.asyncDispose]: mocks.dispose,
    }
  },
  SwapsHeldElsewhere: class SwapsHeldElsewhere extends Error {},
}))
vi.mock('../../components/Toast', () => ({
  toast: { success: mocks.toastSuccess, error: vi.fn(), info: vi.fn() },
}))

const market = (over: Record<string, unknown> = {}) => ({
  quote_corridor: undefined,
  quote_asset: { id: 'quote-asset', ticker: 'Q', decimals: 0 },
  base_asset: { id: 'base-asset', ticker: 'B', decimals: 0 },
  ...over,
})

const swap = {
  id: 'swap-1',
  outcome: 'funded',
  fundingTxid: 'funding-txid',
  artifact: { kind: 'invoice', bolt11: 'lnbc1invoice' },
  expiresAt: 123,
  give: { amount: BigInt(1010) },
} as unknown as Swap

const ASSET_ID = 'a'.repeat(68)

function Harness() {
  const { markets, swapAvailable, swaps, quotePay, receiveLightning, exchange, cancelSwap } = useContext(SwapsContext)
  return (
    <>
      <output data-testid='market-count'>{markets.length}</output>
      <output data-testid='available'>{String(swapAvailable)}</output>
      <output data-testid='swap-count'>{swaps.length}</output>
      <button onClick={() => void quotePay('bitcoin:address')}>quote</button>
      <button onClick={() => void receiveLightning(1000)}>receive</button>
      <button onClick={() => void cancelSwap('swap-1')}>cancel</button>
      <button
        onClick={() =>
          void exchange(
            market() as never,
            {
              deposit: { asset: { id: 'btc', decimals: 0 }, atomic: BigInt(1000) },
              receive: { asset: { id: ASSET_ID, decimals: 0 }, atomic: BigInt(1000) },
            } as never,
          ).catch((error: Error) => {
            const node = document.querySelector('[data-testid="exchange-error"]')
            if (node) node.textContent = error.message
          })
        }
      >
        exchange
      </button>
      <output data-testid='exchange-error' />
    </>
  )
}

const renderProvider = (wallet = {}, children = <Harness />) =>
  render(
    <AspContext.Provider value={mockAspContextValue}>
      <WalletContext.Provider
        value={
          {
            ...mockWalletContextValue,
            dataReady: true,
            svcWallet: { identity: {} },
            isVerifiedAsset: () => true,
            ...wallet,
          } as never
        }
      >
        <SwapsProvider>{children}</SwapsProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )

beforeEach(() => {
  localStorage.clear()
  mocks.swaps.mockResolvedValue([])
  Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
  mocks.discoverMarkets.mockResolvedValue([])
  mocks.offerSwaps.mockResolvedValue([])
  mocks.quote.mockResolvedValue({ id: 'quote-1' } as Quote)
  mocks.receive.mockResolvedValue(swap)
  mocks.accept.mockResolvedValue(swap)
  mocks.cancel.mockResolvedValue({ outcome: 'cancelled' })
  mocks.dispose.mockResolvedValue(undefined)
  mocks.toastSuccess.mockReset()
})

afterEach(() => vi.clearAllMocks())

function Payer() {
  const { quoteAssetPayment, acceptAssetPayment } = useContext(SwapsContext)
  const [state, setState] = useState('pay asset')
  return (
    <button
      onClick={async () => {
        try {
          const quote = await quoteAssetPayment(
            { arkAddress: 'recipient', assetId: ASSET_ID, amount: 500n },
            { receiveAddress: 'recipient', carrier: { mode: 'purchase' } },
          )
          await acceptAssetPayment(quote)
        } catch (error) {
          setState((error as Error).message)
        }
      }}
    >
      {state}
    </button>
  )
}

describe('SwapsProvider', () => {
  it('keeps the client live while its mounted wallet content navigates', async () => {
    function NavigatingScreens() {
      const [page, setPage] = useState('send success')
      return <button onClick={() => setPage('wallet')}>{page}</button>
    }
    const view = renderProvider({}, <NavigatingScreens />)
    await waitFor(() => expect(mocks.created).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByText('send success'))
    expect(screen.getByText('wallet')).toBeInTheDocument()
    expect(mocks.created).toHaveBeenCalledOnce()
    expect(mocks.dispose).not.toHaveBeenCalled()
    view.unmount()
    await waitFor(() => expect(mocks.dispose).toHaveBeenCalledOnce())
  })

  it('quotes an exact asset payment and accepts the original prepared quote', async () => {
    const quoted = {
      id: 'asset-payment-quote',
      give: { amount: 1000n },
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    } as Quote
    mocks.quote.mockResolvedValue(quoted)
    mocks.accept.mockResolvedValue({ ...swap, id: quoted.id })
    function AssetPaymentScreen() {
      const { quoteAssetPayment, acceptAssetPayment } = useContext(SwapsContext)
      const [state, setState] = useState('ready')
      return (
        <button
          onClick={async () => {
            try {
              const quote = await quoteAssetPayment(
                { arkAddress: 'recipient', assetId: ASSET_ID, amount: 500n },
                { receiveAddress: 'recipient', carrier: { mode: 'purchase' } },
              )
              const accepted = await acceptAssetPayment(quote)
              setState(accepted.fundingTxid!)
            } catch (error) {
              setState((error as Error).message)
            }
          }}
        >
          {state}
        </button>
      )
    }
    renderProvider({}, <AssetPaymentScreen />)
    fireEvent.click(screen.getByText('ready'))
    await screen.findByText('funding-txid')
    expect(mocks.quote).toHaveBeenCalledWith({
      give: 'arkade:regtest/slip44:1',
      take: `arkade:regtest/asset:${ASSET_ID}`,
      amount: 500n,
      amountOn: 'take',
      assetPayment: { receiveAddress: 'recipient', carrier: { mode: 'purchase' } },
    })
    expect(mocks.accept).toHaveBeenCalledOnce()
    expect(mocks.accept.mock.calls[0][0]).toBe(quoted)
    expect(mocks.saveSnapshot).toHaveBeenCalledWith(quoted.id, { payee: 'recipient' })
  })

  it('blocks a new quote after ambiguous acceptance, including a remounted payer with spare funds', async () => {
    mocks.quote.mockResolvedValue({ id: 'ambiguous-asset-quote', give: { amount: 1000n } })
    mocks.accept.mockRejectedValue(new Error('reply lost after submission'))
    const view = renderProvider({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('reply lost after submission')
    await act(async () => {
      fireEvent.click(screen.getByText('reply lost after submission'))
    })
    expect([mocks.quote.mock.calls.length, mocks.accept.mock.calls.length]).toEqual([1, 1])
    view.unmount()
    renderProvider({}, <Payer />)
    await act(async () => {
      fireEvent.click(screen.getByText('pay asset'))
    })
    expect(mocks.quote).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Check asset payment'))
    expect(mocks.accept).toHaveBeenCalledOnce()
  })

  it('aborts before acceptance when its critical journal cannot be written', async () => {
    mocks.quote.mockResolvedValue({ id: 'storage-quote', give: { amount: 1000n } })
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    renderProvider({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('storage unavailable')
    expect(mocks.accept).not.toHaveBeenCalled()
    write.mockRestore()
  })

  it('checks only the original stored swap after ambiguity, without accepting or quoting again', async () => {
    mocks.quote.mockResolvedValue({ id: 'original', give: { amount: 1000n } })
    mocks.accept.mockRejectedValue(new Error('reply lost'))
    function Check() {
      const { checkAssetPayment } = useContext(SwapsContext)
      const [state, setState] = useState('check')
      return (
        <button
          onClick={async () => {
            try {
              setState((await checkAssetPayment()).fundingTxid!)
            } catch (error) {
              setState((error as Error).message)
            }
          }}
        >
          {state}
        </button>
      )
    }
    const view = renderProvider({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('reply lost')
    view.unmount()
    mocks.swaps.mockResolvedValue([{ ...swap, id: 'another', fundingTxid: 'wrong' }])
    const check = renderProvider({}, <Check />)
    fireEvent.click(screen.getByText('check'))
    await screen.findByText('Check asset payment: its funding is still unresolved')
    expect(localStorage.length).toBe(1)
    mocks.swaps.mockResolvedValue([{ ...swap, id: 'original', fundingTxid: 'original-txid' }])
    fireEvent.click(screen.getByText('Check asset payment: its funding is still unresolved'))
    await screen.findByText('original-txid')
    expect(mocks.quote).toHaveBeenCalledOnce()
    expect(mocks.accept).toHaveBeenCalledOnce()
    expect(localStorage.length).toBe(0)
    check.unmount()
  })

  it('clears only a real SDK insufficient-funds refusal before persistence', async () => {
    mocks.quote.mockResolvedValue({ id: 'unfundable', give: { asset: 'btc', amount: 1000n } })
    mocks.accept.mockRejectedValue(new InsufficientFunds('btc' as never, 1000n, 0n))
    renderProvider({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText(/funding needs/)
    expect(localStorage.length).toBe(0)
    expect(mocks.accept).toHaveBeenCalledOnce()
  })

  it('retains a named impostor refusal and blocks corruption before a new quote', async () => {
    mocks.quote.mockResolvedValue({ id: 'impostor', give: { amount: 1000n } })
    mocks.accept.mockRejectedValue(Object.assign(new Error('unknown acceptance'), { name: 'InsufficientFunds' }))
    const view = renderProvider({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('unknown acceptance')
    expect(localStorage.length).toBe(1)
    const storageKey = localStorage.key(0)!
    localStorage.setItem(storageKey, '{}')
    view.unmount()
    renderProvider({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('Stored asset payment is unreadable; refusing a new payment')
    expect(mocks.quote).toHaveBeenCalledOnce()
    expect(mocks.accept).toHaveBeenCalledOnce()
  })

  it('loads swaps and filters corridor markets from the offer list', async () => {
    mocks.offerSwaps.mockResolvedValue([swap])
    mocks.discoverMarkets.mockResolvedValue([market(), market({ quote_corridor: 'lightning' })])
    const setAssetSwaps = vi.fn()

    renderProvider({ setAssetSwaps })

    await waitFor(() => expect(screen.getByTestId('swap-count')).toHaveTextContent('1'))
    await waitFor(() => expect(screen.getByTestId('market-count')).toHaveTextContent('1'))
    expect(screen.getByTestId('available')).toHaveTextContent('true')
    expect(setAssetSwaps).toHaveBeenCalledWith([swap])
  })

  it('quotes destinations through the swap client', async () => {
    renderProvider()

    await waitFor(() => expect(mocks.quote).not.toHaveBeenCalled())
    screen.getByText('quote').click()

    await waitFor(() => expect(mocks.quote).toHaveBeenCalledWith({ to: 'bitcoin:address' }))
  })

  it('maps a Lightning receive into the UI-facing result', async () => {
    renderProvider()
    screen.getByText('receive').click()

    await waitFor(() => expect(mocks.receive).toHaveBeenCalledWith({ amount: BigInt(1000), via: 'lightning' }))
  })

  it('refuses to fund a re-quote worse than the price on screen', async () => {
    mocks.discoverMarkets.mockResolvedValue([market()])
    mocks.quote.mockResolvedValue({ take: { amount: BigInt(999) } })
    renderProvider()

    screen.getByText('exchange').click()

    await waitFor(() =>
      expect(screen.getByTestId('exchange-error')).toHaveTextContent(
        'The rate moved while you were confirming — go back and try again',
      ),
    )
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('quotes the pair as CAIP-19 ids', async () => {
    mocks.quote.mockResolvedValue({ take: { amount: BigInt(1000) } })
    renderProvider()

    screen.getByText('exchange').click()

    await waitFor(() =>
      expect(mocks.quote).toHaveBeenCalledWith({
        give: 'arkade:regtest/slip44:1',
        take: `arkade:regtest/asset:${ASSET_ID}`,
        amount: BigInt(1000),
        amountOn: 'give',
      }),
    )
  })

  it('reports the fill that beat the cancel as a completion', async () => {
    mocks.cancel.mockResolvedValue({ outcome: 'filled' })
    renderProvider()

    screen.getByText('cancel').click()

    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith('swap-1'))
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Swap completed before it could be cancelled')
    expect(mocks.toastSuccess).not.toHaveBeenCalledWith('Swap cancelled, funds returned')
  })
})
