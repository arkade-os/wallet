import { ReactNode, createContext, useEffect, useRef, useState } from 'react'
import { FiatPrices, getPriceFeed } from '../lib/fiat'
import { fromSatoshis, toSatoshis } from '../lib/format'
import Decimal from 'decimal.js'
import { Satoshis } from '../lib/types'

type FiatContextProps = {
  fromEuro: (fiat?: number) => Satoshis
  fromUSD: (fiat?: number) => Satoshis
  toEuro: (sats?: number) => number
  toUSD: (sats?: number) => number
  updateFiatPrices: () => void
}

const emptyFiatPrices: FiatPrices = { eur: 0, usd: 0 }

export const FiatContext = createContext<FiatContextProps>({
  fromEuro: () => 0,
  fromUSD: () => 0,
  toEuro: () => 0,
  toUSD: () => 0,
  updateFiatPrices: () => {},
})

export const FiatProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(false)

  const fiatPrices = useRef<FiatPrices>(emptyFiatPrices)

  const fromEuro = (euros = 0) => toSatoshis(Decimal.div(euros, fiatPrices.current.eur).toNumber())
  const fromUSD = (usds = 0) => toSatoshis(Decimal.div(usds, fiatPrices.current.usd).toNumber())
  const toEuro = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.eur).toNumber()
  const toUSD = (sats = 0) => Decimal.mul(fromSatoshis(sats), fiatPrices.current.usd).toDP(2).toNumber()

  const updateFiatPrices = async () => {
    if (loading) return
    setLoading(true)
    const pf = await getPriceFeed()
    if (pf) fiatPrices.current = pf
    setLoading(false)
  }

  useEffect(() => {
    updateFiatPrices()
  }, [])

  return (
    <FiatContext.Provider value={{ fromEuro, fromUSD, toEuro, toUSD, updateFiatPrices }}>
      {children}
    </FiatContext.Provider>
  )
}
