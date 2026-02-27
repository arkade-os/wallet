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

const emptyFiatPrices: FiatPrices = { eur: 0, usd: 0, chf: 0 }

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
  const fromCHF = (fiat = 0) => toSatoshis(Decimal.div(fiat, fiatPrices.current.chf).toNumber())
  const toEUR = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.eur).toNumber()
  const toUSD = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.usd).toNumber()
  const toCHF = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.chf).toNumber()

  const fromFiat = (fiat = 0) => {
    if (config.fiat === Fiats.EUR) return fromEUR(fiat)
    if (config.fiat === Fiats.CHF) return fromCHF(fiat)
    return fromUSD(fiat)
  }
  const toFiat = (sats = 0) => {
    if (config.fiat === Fiats.EUR) return toEUR(sats)
    if (config.fiat === Fiats.CHF) return toCHF(sats)
    return toUSD(sats)
  }

  const updateFiatPrices = async () => {
    if (loading) return
    setLoading(true)
    const pf = await getPriceFeed()
    if (pf) fiatPrices.current = pf
    else setConfig({ ...config, currencyDisplay: CurrencyDisplay.Bitcoin }) // hide fiat if fetch fails
    setLoading(false)
  }

  useEffect(() => {
    updateFiatPrices()
  }, [])

  return <FiatContext.Provider value={{ fromFiat, toFiat, updateFiatPrices }}>{children}</FiatContext.Provider>
}
