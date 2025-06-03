import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { AspInfo, emptyAspInfo, getAspInfo, MarketHour } from '../lib/asp'
import { ConfigContext } from './config'

interface AspContextProps {
  aspInfo: AspInfo
  calcBestMarketHour: (nextRollOver: number) => MarketHour | undefined
  calcNextMarketHour: (nextRollOver: number) => MarketHour | undefined
  setAspInfo: (info: AspInfo) => void
}

export const AspContext = createContext<AspContextProps>({
  aspInfo: emptyAspInfo,
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

  return (
    <AspContext.Provider
      value={{
        aspInfo,
        calcBestMarketHour,
        calcNextMarketHour,
        setAspInfo,
      }}
    >
      {children}
    </AspContext.Provider>
  )
}
