import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { ArkadeInfo, ScheduledSession } from '@arkade-os/sdk'
import { emptyAspInfo, getAspInfo } from '../lib/asp'
import { readAspInfoSnapshot, sameAspInfo, saveAspInfoSnapshot } from '../lib/bootCache'
import { gitCommit } from '../_gitCommit'
import { ConfigContext } from './config'

export type AspInfo = ArkadeInfo & {
  unreachable: boolean
  url: string
  // Set when the server rejected us with BUILD_VERSION_TOO_OLD: the client is
  // too old to talk to this server (it fails even getInfo, so it also reads as
  // `unreachable`). `minBuildVersion` is the server's advertised minimum, if any.
  outdated?: boolean
  minBuildVersion?: string
}

interface AspContextProps {
  aspInfo: AspInfo
  calcBestMarketHour: (nextRollOver: number) => ScheduledSession | undefined
  calcNextMarketHour: (nextRollOver: number) => ScheduledSession | undefined
  setAspInfo: (info: AspInfo) => void
  liveAspInfo?: () => Promise<AspInfo>
}

export const AspContext = createContext<AspContextProps>({
  aspInfo: emptyAspInfo,
  calcBestMarketHour: () => undefined,
  calcNextMarketHour: () => undefined,
  setAspInfo: () => {},
  liveAspInfo: () => Promise.resolve(emptyAspInfo),
})

export const AspProvider = ({ children }: { children: ReactNode }) => {
  const { config, configLoaded } = useContext(ConfigContext)

  const [aspInfo, setAspInfo] = useState(emptyAspInfo)
  const liveAsp = useRef<Promise<AspInfo>>(Promise.resolve(emptyAspInfo))

  useEffect(() => {
    if (!config.aspUrl || !configLoaded) return
    let cancelled = false
    const last = readAspInfoSnapshot(config.aspUrl, gitCommit)
    if (last) setAspInfo(last)
    const failed = { ...emptyAspInfo, unreachable: true, url: config.aspUrl }
    liveAsp.current = getAspInfo(config.aspUrl)
      .then((info) => {
        if (!cancelled) {
          setAspInfo((current) => (sameAspInfo(current, info) ? current : info))
          saveAspInfoSnapshot(info, gitCommit)
        }
        return info
      })
      .catch(() => {
        if (!cancelled) setAspInfo(failed)
        return failed
      })
    return () => {
      cancelled = true
    }
  }, [config.aspUrl, configLoaded])

  /**
   * Calculates the best market hour that fits within the given expiration time.
   * Finds the latest market hour period that can complete before expiration.
   * @param expiration - The expiration timestamp to check against
   * @returns The best market hour with duration, or undefined if none found
   */
  const calcBestMarketHour = (expiration: number): ScheduledSession | undefined => {
    if (!aspInfo.scheduledSession) return undefined
    let startTime = aspInfo.scheduledSession.nextStartTime
    if (startTime > expiration) return undefined
    const period = aspInfo.scheduledSession.period
    if (period <= 0) return undefined
    // a period too small will result in too many iterations,
    // so we limit it to 3600 iterations to prevent performance issues
    const numberOfIterations = (BigInt(Math.trunc(expiration)) - startTime - 1n) / period
    if (numberOfIterations > 3600n) return undefined
    while (startTime + period < expiration) {
      startTime += period
    }
    return {
      ...aspInfo.scheduledSession,
      nextStartTime: startTime,
      nextEndTime: startTime + aspInfo.scheduledSession.duration,
    }
  }

  /**
   * Calculates the next market hour if it starts before the expiration time.
   * @param expiration - The expiration timestamp to check against
   * @returns The next market hour with duration, or undefined if it starts after expiration
   */
  const calcNextMarketHour = (expiration: number): ScheduledSession | undefined => {
    if (!aspInfo.scheduledSession) return undefined
    let startTime = aspInfo.scheduledSession.nextStartTime
    if (startTime > expiration) return undefined
    return {
      ...aspInfo.scheduledSession,
      nextStartTime: startTime,
      nextEndTime: startTime + aspInfo.scheduledSession.duration,
    }
  }

  return (
    <AspContext.Provider
      value={{
        aspInfo,
        calcBestMarketHour,
        calcNextMarketHour,
        setAspInfo,
        liveAspInfo: () => liveAsp.current,
      }}
    >
      {children}
    </AspContext.Provider>
  )
}
