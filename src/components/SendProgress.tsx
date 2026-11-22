import { useEffect, useRef } from 'react'

interface SendProgressProps {
  text: string
  done?: boolean
  onExitComplete?: () => void
}

export default function SendProgress({ text, done, onExitComplete }: SendProgressProps) {
  const onExit = useRef(onExitComplete)
  onExit.current = onExitComplete

  useEffect(() => {
    if (!done) return
    const timer = setTimeout(() => onExit.current?.(), 240)
    return () => clearTimeout(timer)
  }, [done])

  return (
    <div className='send-progress' data-testid='loading-logo'>
      <div className='send-progress__row' role='status'>
        <span className='pixel-loader' aria-hidden='true' />
        <span>{text}</span>
      </div>
    </div>
  )
}
