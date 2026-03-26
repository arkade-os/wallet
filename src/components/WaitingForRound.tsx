import { useEffect, useRef, useState } from 'react'
import LoadingLogo from './LoadingLogo'
import { getInfoLogLineMsg, getInfoLogsLength } from '../lib/logs'
import { sleep } from '../lib/sleep'

interface WaitingForRoundProps {
  rollover?: boolean
  settle?: boolean
  done?: boolean
  exitMode?: 'fly-to-target' | 'fly-up' | 'none'
  onExitComplete?: () => void
}

export default function WaitingForRound({ rollover, settle, done, exitMode, onExitComplete }: WaitingForRoundProps) {
  const initial = settle ? 'Settling transactions' : rollover ? 'Renewing your virtual coins' : 'Paying to mainnet'
  const message = initial + '. This may take a few moments.'

  const [logLength, setLogLength] = useState(getInfoLogsLength())
  const [logMessage, setLogMessage] = useState(message)

  const firstRun = useRef(true)

  useEffect(() => {
    let interval: NodeJS.Timeout
    // give 2 seconds to read initial message
    sleep(2000).then(() => {
      interval = setInterval(() => {
        setLogLength(getInfoLogsLength())
      }, 500)
    })
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setLogMessage(getInfoLogLineMsg(logLength - 1))
  }, [logLength])

  return <LoadingLogo text={logMessage} done={done} exitMode={exitMode} onExitComplete={onExitComplete} />
}
