import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { AspInfo, emptyAspInfo, getAspInfo, MarketHour } from '../lib/asp'
import { ConfigContext } from './config'

interface AspContextProps {
  aspInfo: AspInfo
  amountIsBelowMinLimit: (sats: number) => boolean
  amountIsAboveMaxLimit: (sats: number) => boolean
  calcBestMarketHour: (nextRollOver: number) => MarketHour | undefined
  calcNextMarketHour: (nextRollOver: number) => MarketHour | undefined
  setAspInfo: (info: AspInfo) => void
}

export const AspContext = createContext<AspContextProps>({
  aspInfo: emptyAspInfo,
  amountIsBelowMinLimit: () => false,
  amountIsAboveMaxLimit: () => false,
  calcBestMarketHour: () => undefined,
  calcNextMarketHour: () => undefined,
  setAspInfo: () => {},
})

export const AspProvider = ({ children }: { children: ReactNode }) => {
  const { config, configLoaded } = useContext(ConfigContext)

  const [aspInfo, setAspInfo] = useState(emptyAspInfo)

  useEffect(() => {
    if (!config.aspUrl || !configLoaded) return
    getAspInfo(config.aspUrl).then(setAspInfo)
  }, [config.aspUrl, configLoaded])

  const duration = aspInfo.marketHour.nextEndTime - aspInfo.marketHour.nextStartTime

  const amountIsAboveMaxLimit = (sats: number) => {
    return getMaxSatsAllowed() < 0 ? false : sats > getMaxSatsAllowed()
  }

  const amountIsBelowMinLimit = (sats: number) => {
    return getDustLimit() < 0 ? false : sats < getDustLimit()
  }

  const calcBestMarketHour = (expiration: number): MarketHour | undefined => {
    let startTime = aspInfo.marketHour.nextStartTime
    if (startTime > expiration) return undefined
    const period = aspInfo.marketHour.period
    while (startTime + period < expiration) {
      startTime += period
    }
    return {
      duration,
      period,
      startTime,
    }
  }

  const calcNextMarketHour = (expiration: number): MarketHour | undefined => {
    let startTime = aspInfo.marketHour.nextStartTime
    if (startTime > expiration) return undefined
    return {
      duration,
      period: aspInfo.marketHour.period,
      startTime: aspInfo.marketHour.nextStartTime,
    }
  }

  const getDustLimit = () => {
    const { utxoMinAmount, vtxoMinAmount } = aspInfo
    return Math.max(utxoMinAmount, vtxoMinAmount)
  }

  //              VTXO max amount
  //              |  -1 |   0 | 666 |
  //              +-----------------+
  // UTXO      -1 |  -1 |  -1 | 666 |
  // max        0 |  -1 |   0 | 666 |
  // amount   444 | 444 | 444 | 444 |
  //
  const getMaxSatsAllowed = (): number => {
    const { utxoMaxAmount, vtxoMaxAmount } = aspInfo
    if (vtxoMaxAmount === -1) return utxoMaxAmount > 0 ? utxoMaxAmount : -1
    if (vtxoMaxAmount === 0) return utxoMaxAmount
    if (utxoMaxAmount <= 0) return vtxoMaxAmount
    return Math.min(utxoMaxAmount, vtxoMaxAmount)
  }

  return (
    <AspContext.Provider
      value={{
        aspInfo,
        amountIsAboveMaxLimit,
        amountIsBelowMinLimit,
        calcBestMarketHour,
        calcNextMarketHour,
        setAspInfo,
      }}
    >
      {children}
    </AspContext.Provider>
  )
}
