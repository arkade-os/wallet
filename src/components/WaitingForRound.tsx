import { useEffect, useRef, useState } from 'react'
import Loading from './Loading'
import { getInfoLogLineMsg, getInfoLogsLength } from '../lib/logs'
import { sleep } from '../lib/sleep'

export default function WaitingForRound({ rollover, settle }: { rollover?: boolean; settle?: boolean }) {
  const initial = settle ? 'Settling transactions' : rollover ? 'Renewing your virtual coins' : 'Payments to mainnet'
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

  return <Loading text={logMessage} />
}
