import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { ArkInfo, MarketHour } from '@arkade-os/sdk'
import { emptyAspInfo, getAspInfo } from '../lib/asp'
import { ArkInfo, MarketHour } from '@arkade-os/sdk'
import { emptyAspInfo, getAspInfo } from '../lib/asp'
import { ConfigContext } from './config'

export type AspInfo = ArkInfo & { unreachable: boolean; url: string }

interface AspContextProps {
  aspInfo: AspInfo
  calcBestMarketHour: (nextRollOver: number) => (MarketHour & { duration: number }) | undefined
  calcNextMarketHour: (nextRollOver: number) => (MarketHour & { duration: number }) | undefined
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
    getAspInfo(config.aspUrl)
      .then(setAspInfo)
      .catch(() => {
        setAspInfo({ ...emptyAspInfo, unreachable: true })
      })
  }, [config.aspUrl, configLoaded])

  /**
   * Calculates the best market hour that fits within the given expiration time.
   * Finds the latest market hour period that can complete before expiration.
   * @param expiration - The expiration timestamp to check against
   * @returns The best market hour with duration, or undefined if none found
   */
  const calcBestMarketHour = (expiration: number): (MarketHour & { duration: number }) | undefined => {
    if (!aspInfo.marketHour) return undefined
    let startTime = aspInfo.marketHour.nextStartTime
    if (startTime > expiration) return undefined
    const period = aspInfo.marketHour.period
    if (period <= 0) return undefined
    while (startTime + period < expiration) {
      startTime += period
    }
    return {
      ...aspInfo.marketHour,
      duration: Number(aspInfo.marketHour.nextEndTime - aspInfo.marketHour.nextStartTime),
    }
  }

  /**
   * Calculates the next market hour if it starts before the expiration time.
   * @param expiration - The expiration timestamp to check against
   * @returns The next market hour with duration, or undefined if it starts after expiration
   */
  const calcNextMarketHour = (expiration: number): (MarketHour & { duration: number }) | undefined => {
    if (!aspInfo.marketHour) return undefined
    let startTime = aspInfo.marketHour.nextStartTime
    if (startTime > expiration) return undefined
    return {
      ...aspInfo.marketHour,
      duration: Number(aspInfo.marketHour.nextEndTime - aspInfo.marketHour.nextStartTime),
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
