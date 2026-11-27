import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { OperatorInfo as SdkOperatorInfo, ScheduledSession } from '@arkade-os/sdk'
import { emptyOperatorInfo, getOperatorInfo } from '../lib/operator'
import { ConfigContext } from './config'

export type OperatorInfo = SdkOperatorInfo & {
  unreachable: boolean
  url: string
  // Set when the server rejected us with BUILD_VERSION_TOO_OLD: the client is
  // too old to talk to this server (it fails even getInfo, so it also reads as
  // `unreachable`). `minBuildVersion` is the server's advertised minimum, if any.
  outdated?: boolean
  minBuildVersion?: string
}

interface OperatorContextProps {
  operatorInfo: OperatorInfo
  calcBestMarketHour: (nextRollOver: number) => ScheduledSession | undefined
  calcNextMarketHour: (nextRollOver: number) => ScheduledSession | undefined
  setOperatorInfo: (info: OperatorInfo) => void
}

export const OperatorContext = createContext<OperatorContextProps>({
  operatorInfo: emptyOperatorInfo,
  calcBestMarketHour: () => undefined,
  calcNextMarketHour: () => undefined,
  setOperatorInfo: () => {},
})

export const OperatorProvider = ({ children }: { children: ReactNode }) => {
  const { config, configLoaded } = useContext(ConfigContext)

  const [operatorInfo, setOperatorInfo] = useState(emptyOperatorInfo)

  useEffect(() => {
    if (!config.operatorUrl || !configLoaded) return
    getOperatorInfo(config.operatorUrl)
      .then(setOperatorInfo)
      .catch(() => {
        setOperatorInfo({ ...emptyOperatorInfo, unreachable: true })
      })
  }, [config.operatorUrl, configLoaded])

  /**
   * Calculates the best market hour that fits within the given expiration time.
   * Finds the latest market hour period that can complete before expiration.
   * @param expiration - The expiration timestamp to check against
   * @returns The best market hour with duration, or undefined if none found
   */
  const calcBestMarketHour = (expiration: number): ScheduledSession | undefined => {
    if (!operatorInfo.scheduledSession) return undefined
    let startTime = operatorInfo.scheduledSession.nextStartTime
    if (startTime > expiration) return undefined
    const period = operatorInfo.scheduledSession.period
    if (period <= 0) return undefined
    // a period too small will result in too many iterations,
    // so we limit it to 3600 iterations to prevent performance issues
    const numberOfIterations = (BigInt(Math.trunc(expiration)) - startTime - 1n) / period
    if (numberOfIterations > 3600n) return undefined
    while (startTime + period < expiration) {
      startTime += period
    }
    return {
      ...operatorInfo.scheduledSession,
      nextStartTime: startTime,
      nextEndTime: startTime + operatorInfo.scheduledSession.duration,
    }
  }

  /**
   * Calculates the next market hour if it starts before the expiration time.
   * @param expiration - The expiration timestamp to check against
   * @returns The next market hour with duration, or undefined if it starts after expiration
   */
  const calcNextMarketHour = (expiration: number): ScheduledSession | undefined => {
    if (!operatorInfo.scheduledSession) return undefined
    let startTime = operatorInfo.scheduledSession.nextStartTime
    if (startTime > expiration) return undefined
    return {
      ...operatorInfo.scheduledSession,
      nextStartTime: startTime,
      nextEndTime: startTime + operatorInfo.scheduledSession.duration,
    }
  }

  return (
    <OperatorContext.Provider
      value={{
        operatorInfo,
        calcBestMarketHour,
        calcNextMarketHour,
        setOperatorInfo,
      }}
    >
      {children}
    </OperatorContext.Provider>
  )
}
