import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { fiatDecimalsFor, FiatPrices, getPriceFeed } from '../lib/fiat'
import { fromSatoshis, toSatoshis } from '../lib/format'
import Decimal from 'decimal.js'
import { CurrencyDisplay, Fiats } from '../lib/types'
import { ConfigContext } from './config'

type FiatContextProps = {
  toFiat: (satoshis?: number) => number
  fromFiat: (fiat?: number) => number
  fiatDecimals: () => number
  updateFiatPrices: () => void
}

const emptyFiatPrices: FiatPrices = { eur: 0, usd: 0, chf: 0, jpy: 0, gbp: 0, cny: 0 }

export const FiatContext = createContext<FiatContextProps>({
  toFiat: () => 0,
  fromFiat: () => 0,
  fiatDecimals: () => 2,
  updateFiatPrices: () => {},
})

export const FiatProvider = ({ children }: { children: ReactNode }) => {
  const { config, setConfig } = useContext(ConfigContext)

  const [loading, setLoading] = useState(false)

  const prices = useRef<FiatPrices>(emptyFiatPrices)

  const { eur, usd, chf, jpy, gbp, cny } = prices.current

  const fromEUR = (fiat = 0) => (eur ? toSatoshis(Decimal.div(fiat, eur).toNumber()) : 0)
  const fromUSD = (fiat = 0) => (usd ? toSatoshis(Decimal.div(fiat, usd).toNumber()) : 0)
  const fromCHF = (fiat = 0) => (chf ? toSatoshis(Decimal.div(fiat, chf).toNumber()) : 0)
  const fromJPY = (fiat = 0) => (jpy ? toSatoshis(Decimal.div(fiat, jpy).toNumber()) : 0)
  const fromGBP = (fiat = 0) => (gbp ? toSatoshis(Decimal.div(fiat, gbp).toNumber()) : 0)
  const fromCNY = (fiat = 0) => (cny ? toSatoshis(Decimal.div(fiat, cny).toNumber()) : 0)
  const toEUR = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.eur).toNumber()
  const toUSD = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.usd).toNumber()
  const toCHF = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.chf).toNumber()
  const toJPY = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.jpy).toNumber()
  const toGBP = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.gbp).toNumber()
  const toCNY = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.cny).toNumber()

  const fromFiat = (fiat = 0) => {
    if (config.fiat === Fiats.EUR) return fromEUR(fiat)
    if (config.fiat === Fiats.CHF) return fromCHF(fiat)
    if (config.fiat === Fiats.JPY) return fromJPY(fiat)
    if (config.fiat === Fiats.GBP) return fromGBP(fiat)
    if (config.fiat === Fiats.CNY) return fromCNY(fiat)
    return fromUSD(fiat)
  }
  const toFiat = (sats = 0) => {
    if (config.fiat === Fiats.EUR) return toEUR(sats)
    if (config.fiat === Fiats.CHF) return toCHF(sats)
    if (config.fiat === Fiats.JPY) return toJPY(sats)
    if (config.fiat === Fiats.GBP) return toGBP(sats)
    if (config.fiat === Fiats.CNY) return toCNY(sats)
    return toUSD(sats)
  }

  const fiatDecimals = () => fiatDecimalsFor(config.fiat)

  const updateFiatPrices = async () => {
    if (loading) return
    setLoading(true)
    const pf = await getPriceFeed()
    if (pf) prices.current = pf
    else setConfig({ ...config, currencyDisplay: CurrencyDisplay.Sats }) // hide fiat if fetch fails
    setLoading(false)
  }

  useEffect(() => {
    updateFiatPrices()
  }, [])

  return (
    <FiatContext.Provider value={{ fromFiat, toFiat, fiatDecimals, updateFiatPrices }}>{children}</FiatContext.Provider>
  )
}
