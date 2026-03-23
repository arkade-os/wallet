import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { FiatPrices, getPriceFeed } from '../lib/fiat'
import { fromSatoshis, toSatoshis } from '../lib/format'
import Decimal from 'decimal.js'
import { CurrencyDisplay, Fiats, Satoshis } from '../lib/types'
import { ConfigContext } from './config'

type FiatContextProps = {
  toFiat: (satoshis?: Satoshis) => number
  fromFiat: (fiat?: number) => Satoshis
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

  const fiatPrices = useRef<FiatPrices>(emptyFiatPrices)

  const fromEUR = (fiat = 0) => toSatoshis(Decimal.div(fiat, fiatPrices.current.eur).toNumber())
  const fromUSD = (fiat = 0) => toSatoshis(Decimal.div(fiat, fiatPrices.current.usd).toNumber())
  const fromCHF = (fiat = 0) => toSatoshis(Decimal.div(fiat, fiatPrices.current.chf).toNumber())
  const fromJPY = (fiat = 0) => toSatoshis(Decimal.div(fiat, fiatPrices.current.jpy).toNumber())
  const fromGBP = (fiat = 0) => toSatoshis(Decimal.div(fiat, fiatPrices.current.gbp).toNumber())
  const fromCNY = (fiat = 0) => toSatoshis(Decimal.div(fiat, fiatPrices.current.cny).toNumber())
  const toEUR = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.eur).toNumber()
  const toUSD = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.usd).toNumber()
  const toCHF = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.chf).toNumber()
  const toJPY = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.jpy).toNumber()
  const toGBP = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.gbp).toNumber()
  const toCNY = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.cny).toNumber()

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

  const fiatDecimals = () => {
    return config.fiat === Fiats.JPY ? 0 : 2
  }

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

  return (
    <FiatContext.Provider value={{ fromFiat, toFiat, fiatDecimals, updateFiatPrices }}>{children}</FiatContext.Provider>
  )
}
