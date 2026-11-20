import { act, render } from '@testing-library/react'
import { useContext } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FiatContext, FiatProvider } from '../../providers/fiat'
import { ConfigContext } from '../../providers/config'
import { getPriceFeed, type FiatPrices } from '../../lib/fiat'
import { readFiatPricesSnapshot, saveFiatPricesSnapshot } from '../../lib/bootCache'
import { Currencies } from '../../lib/types'
import { mockConfigContextValue } from '../screens/mocks'

vi.mock('../../lib/fiat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/fiat')>()),
  getPriceFeed: vi.fn(),
}))

const prices = (eur: number): FiatPrices => ({
  eur,
  usd: 65_000,
  chf: 58_000,
  jpy: 9e6,
  gbp: 51_000,
  cny: 470_000,
  brl: 350_000,
})

let fiat: React.ContextType<typeof FiatContext>
function Capture() {
  fiat = useContext(FiatContext)
  return null
}
const updateConfig = vi.fn()
const tree = (currency = Currencies.EUR) => (
  <ConfigContext.Provider
    value={{ ...mockConfigContextValue, updateConfig, config: { ...mockConfigContextValue.config, currency } }}
  >
    <FiatProvider>
      <Capture />
    </FiatProvider>
  </ConfigContext.Provider>
)
const mount = (currency = Currencies.EUR) => render(tree(currency))

const pendingFeed = () => {
  let resolve: (feed: FiatPrices | undefined) => void = () => {}
  vi.mocked(getPriceFeed).mockReturnValueOnce(new Promise((r) => (resolve = r)))
  return (feed: FiatPrices | undefined) => act(async () => resolve(feed))
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('fiat prices at boot', () => {
  it('cannot price anything until the feed answers on a first visit', async () => {
    const respond = pendingFeed()

    mount()
    expect(fiat.fiatReady).toBe(false)
    expect(fiat.toFiat(100_000_000)).toBe(0)

    await respond(prices(60_000))
    expect(fiat.fiatReady).toBe(true)
    expect(fiat.toFiat(100_000_000)).toBe(60_000)
  })

  it('prices a returning visit from the last feed, then from the live one', async () => {
    saveFiatPricesSnapshot(prices(60_000))
    const respond = pendingFeed()

    mount()
    expect(fiat.fiatReady).toBe(true)
    expect(fiat.toFiat(100_000_000)).toBe(60_000)

    await respond(prices(61_500))
    expect(fiat.toFiat(100_000_000)).toBe(61_500)
    expect(readFiatPricesSnapshot()?.eur).toBe(61_500)
  })

  it('needs no price to show a Bitcoin balance', () => {
    pendingFeed()

    mount(Currencies.BTC)

    expect(fiat.fiatReady).toBe(true)
  })

  it('reads the stored prices once, not on every render', async () => {
    saveFiatPricesSnapshot(prices(60_000))
    pendingFeed()
    const getItem = vi.spyOn(Storage.prototype, 'getItem')

    const { rerender } = mount()
    rerender(tree())
    rerender(tree())

    expect(getItem.mock.calls.filter(([key]) => key === 'fiatPricesSnapshot')).toHaveLength(1)
    getItem.mockRestore()
  })

  // Offline with prices from the last day, the wallet already shows them; switching the currency to
  // BTC only took them away.
  it('keeps the currency when the feed fails and recent prices are in hand', async () => {
    saveFiatPricesSnapshot(prices(60_000))
    const respond = pendingFeed()
    mount()

    await respond(undefined)

    expect(updateConfig).not.toHaveBeenCalled()
    expect(fiat.toFiat(100_000_000)).toBe(60_000)
  })

  it('falls back to BTC when the feed fails and there are no recent prices', async () => {
    const respond = pendingFeed()
    mount()

    await respond(undefined)

    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ currency: Currencies.BTC }), false)
  })
})
