import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import Decimal from 'decimal.js'
import { fiatDecimalsFor, FiatPrices, getPriceFeed } from '../lib/fiat'
import { fromSatoshis, toSatoshis } from '../lib/format'
import { Currencies, Unit } from '../lib/types'
import { ConfigContext } from './config'

type FiatContextProps = {
  toFiat: (satoshis?: number) => number
  toFiatAmount: (satoshis: number, currency: Currencies) => number
  fromFiat: (fiat?: number) => number
  fromFiatAmount: (amount: number, currency: Currencies) => number
  fiatDecimals: () => number
  updateFiatPrices: () => void
}

const emptyFiatPrices: FiatPrices = { eur: 0, usd: 0, chf: 0, jpy: 0, gbp: 0, cny: 0 }

export const FiatContext = createContext<FiatContextProps>({
  toFiat: () => 0,
  toFiatAmount: () => 0,
  fromFiat: () => 0,
  fromFiatAmount: () => 0,
  fiatDecimals: () => 2,
  updateFiatPrices: () => {},
})

export const FiatProvider = ({ children }: { children: ReactNode }) => {
  const { config, updateConfig } = useContext(ConfigContext)

  const [loading, setLoading] = useState(false)

  const prices = useRef<FiatPrices>(emptyFiatPrices)

  const fromEUR = (fiat = 0) => (prices.current.eur ? toSatoshis(Decimal.div(fiat, prices.current.eur).toNumber()) : 0)
  const fromUSD = (fiat = 0) => (prices.current.usd ? toSatoshis(Decimal.div(fiat, prices.current.usd).toNumber()) : 0)
  const fromCHF = (fiat = 0) => (prices.current.chf ? toSatoshis(Decimal.div(fiat, prices.current.chf).toNumber()) : 0)
  const fromJPY = (fiat = 0) => (prices.current.jpy ? toSatoshis(Decimal.div(fiat, prices.current.jpy).toNumber()) : 0)
  const fromGBP = (fiat = 0) => (prices.current.gbp ? toSatoshis(Decimal.div(fiat, prices.current.gbp).toNumber()) : 0)
  const fromCNY = (fiat = 0) => (prices.current.cny ? toSatoshis(Decimal.div(fiat, prices.current.cny).toNumber()) : 0)
  const selectedBitcoinUnit = config.currencyDisplay as unknown as Unit
  const fromBTC = (amount = 0) => (selectedBitcoinUnit === Unit.BTC ? toSatoshis(amount) : Math.floor(amount))
  const toEUR = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.eur).toNumber()
  const toUSD = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.usd).toNumber()
  const toCHF = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.chf).toNumber()
  const toJPY = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.jpy).toNumber()
  const toGBP = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.gbp).toNumber()
  const toCNY = (sats = 0) => Decimal.mul(fromSatoshis(sats), prices.current.cny).toNumber()
  const toBTC = (sats = 0) => (selectedBitcoinUnit === Unit.BTC ? fromSatoshis(sats) : sats)

  const fromFiatAmount = (amount = 0, currency: Currencies) => {
    if (currency === Currencies.BTC) return fromBTC(amount)
    if (currency === Currencies.EUR) return fromEUR(amount)
    if (currency === Currencies.CHF) return fromCHF(amount)
    if (currency === Currencies.JPY) return fromJPY(amount)
    if (currency === Currencies.GBP) return fromGBP(amount)
    if (currency === Currencies.CNY) return fromCNY(amount)
    return fromUSD(amount)
  }
  const fromFiat = (fiat = 0) => fromFiatAmount(fiat, config.fiat)
  const toFiatAmount = (sats = 0, currency: Currencies) => {
    if (currency === Currencies.BTC) return toBTC(sats)
    if (currency === Currencies.EUR) return toEUR(sats)
    if (currency === Currencies.CHF) return toCHF(sats)
    if (currency === Currencies.JPY) return toJPY(sats)
    if (currency === Currencies.GBP) return toGBP(sats)
    if (currency === Currencies.CNY) return toCNY(sats)
    return toUSD(sats)
  }
  const toFiat = (sats = 0) => toFiatAmount(sats, config.fiat)

  const fiatDecimals = () => fiatDecimalsFor(config.fiat, config.currencyDisplay as unknown as Unit)

  const updateFiatPrices = async () => {
    if (loading) return
    setLoading(true)
    const pf = await getPriceFeed()
    if (pf) prices.current = pf
    else updateConfig({ ...config, fiat: Currencies.BTC }, false) // fallback to BTC if price feed fails
    setLoading(false)
  }

  useEffect(() => {
    updateFiatPrices()
  }, [])

  return (
    <FiatContext.Provider value={{ fromFiat, fromFiatAmount, toFiat, toFiatAmount, fiatDecimals, updateFiatPrices }}>
      {children}
    </FiatContext.Provider>
  )
}
