import { useEffect, useRef, useState } from 'react'
import LoadingLogo from './LoadingLogo'
import { getInfoLogLineMsg, getInfoLogsLength } from '../lib/logs'
import { sleep } from '../lib/sleep'
import { useTranslation } from '../providers/language'

interface WaitingForRoundProps {
  rollover?: boolean
  settle?: boolean
  done?: boolean
  exitMode?: 'fly-to-target' | 'fly-up' | 'none'
  onExitComplete?: () => void
}

export default function WaitingForRound({ rollover, settle, done, exitMode, onExitComplete }: WaitingForRoundProps) {
  const { t } = useTranslation()
  const initial = settle
    ? t('loading.settlingTransactions')
    : rollover
      ? t('loading.renewing')
      : t('loading.payingToMainnet')
  const message = initial

  const [logLength, setLogLength] = useState(getInfoLogsLength())
  const [logMessage, setLogMessage] = useState(message)

  const firstRun = useRef(true)

  useEffect(() => {
    let interval: NodeJS.Timeout
    let cancelled = false

    sleep(2000).then(() => {
      if (cancelled) return
      interval = setInterval(() => {
        setLogLength(getInfoLogsLength())
      }, 500)
    })

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (logLength > 0) setLogMessage(getInfoLogLineMsg(logLength - 1))
  }, [logLength])

  return <LoadingLogo text={logMessage} done={done} exitMode={exitMode} onExitComplete={onExitComplete} />
}
