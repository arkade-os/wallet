import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { FiatPrices, getPriceFeed } from '../lib/fiat'
import { fromSatoshis, toSatoshis } from '../lib/format'
import Decimal from 'decimal.js'
import { CurrencyDisplay, Fiats, Satoshis } from '../lib/types'
import { ConfigContext } from './config'

type FiatContextProps = {
  fromFiat: (fiat?: number) => Satoshis
  toFiat: (sats?: Satoshis) => number
  updateFiatPrices: () => void
}

const emptyFiatPrices: FiatPrices = { eur: 0, usd: 0 }

export const FiatContext = createContext<FiatContextProps>({
  fromFiat: () => 0,
  toFiat: () => 0,
  updateFiatPrices: () => {},
})

export const FiatProvider = ({ children }: { children: ReactNode }) => {
  const { config, setConfig } = useContext(ConfigContext)

  const [loading, setLoading] = useState(false)

  const fiatPrices = useRef<FiatPrices>(emptyFiatPrices)

  const fromEUR = (fiat = 0) => toSatoshis(Decimal.div(fiat, fiatPrices.current.eur).toNumber())
  const fromUSD = (fiat = 0) => toSatoshis(Decimal.div(fiat, fiatPrices.current.usd).toNumber())
  const toEUR = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.eur).toNumber()
  const toUSD = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.usd).toNumber()

  const fromFiat = (fiat = 0) => (config.fiat === Fiats.EUR ? fromEUR(fiat) : fromUSD(fiat))
  const toFiat = (sats = 0) => (config.fiat === Fiats.EUR ? toEUR(sats) : toUSD(sats))

  const updateFiatPrices = async () => {
    if (loading) return
    setLoading(true)
    const pf = await getPriceFeed()
    if (pf) fiatPrices.current = pf
    else setConfig({ ...config, currencyDisplay: CurrencyDisplay.Sats }) // hide fiat if fetch fails
    setLoading(false)
  }

  useEffect(() => {
    updateFiatPrices()
  }, [])

  return <FiatContext.Provider value={{ fromFiat, toFiat, updateFiatPrices }}>{children}</FiatContext.Provider>
}
