import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { ArkInfo, MarketHour } from '@arkade-os/sdk'
import { emptyAspInfo, getAspInfo } from '../lib/asp'
import { ConfigContext } from './config'

export type AspInfo = ArkInfo & { unreachable: boolean; url: string }

interface AspContextProps {
  aspInfo: AspInfo
  amountIsBelowMinLimit: (sats: number) => boolean
  amountIsAboveMaxLimit: (sats: number) => boolean
  calcBestMarketHour: (nextRollOver: number) => (MarketHour & { duration: number }) | undefined
  calcNextMarketHour: (nextRollOver: number) => (MarketHour & { duration: number }) | undefined
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
    getAspInfo(config.aspUrl).then((info) => {
      setAspInfo(info)
    })
  }, [config.aspUrl, configLoaded])

  const amountIsAboveMaxLimit = (sats: number) => {
    return getMaxSatsAllowed() < 0 ? false : sats > getMaxSatsAllowed()
  }

  const amountIsBelowMinLimit = (sats: number) => {
    return getDustLimit() < 0 ? false : sats < getDustLimit()
  }

  const calcBestMarketHour = (expiration: number): (MarketHour & { duration: number }) | undefined => {
    if (!aspInfo.marketHour) return undefined
    let startTime = aspInfo.marketHour.nextStartTime
    if (startTime > expiration) return undefined
    const period = aspInfo.marketHour.period
    while (startTime + period < expiration) {
      startTime += period
    }
    return {
      ...aspInfo.marketHour,
      duration: Number(aspInfo.marketHour.nextEndTime - aspInfo.marketHour.nextStartTime),
    }
  }

  const calcNextMarketHour = (expiration: number): (MarketHour & { duration: number }) | undefined => {
    if (!aspInfo.marketHour) return undefined
    let startTime = aspInfo.marketHour.nextStartTime
    if (startTime > expiration) return undefined
    return {
      ...aspInfo.marketHour,
      duration: Number(aspInfo.marketHour.nextEndTime - aspInfo.marketHour.nextStartTime),
    }
  }

  const getDustLimit = () => {
    const { utxoMinAmount, vtxoMinAmount } = aspInfo
    return Math.max(Number(utxoMinAmount), Number(vtxoMinAmount))
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
    if (vtxoMaxAmount === BigInt(-1)) return utxoMaxAmount > BigInt(0) ? Number(utxoMaxAmount) : -1
    if (vtxoMaxAmount === BigInt(0)) return Number(utxoMaxAmount)
    if (utxoMaxAmount <= BigInt(0)) return Number(vtxoMaxAmount)
    return Math.min(Number(utxoMaxAmount), Number(vtxoMaxAmount))
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
