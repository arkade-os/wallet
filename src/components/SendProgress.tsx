import { useEffect, useRef } from 'react'

interface SendProgressProps {
  text: string
  /** A second line under the progress row, such as "you can leave this screen". */
  note?: string
  done?: boolean
  onExitComplete?: () => void
}

/**
 * Progress shown where the button was. The sheet stays, the amount stays,
 * and the loader says the payment is on its way. Keeps the `loading-logo`
 * test id of the full-screen loader it replaces.
 */
export default function SendProgress({ text, note, done, onExitComplete }: SendProgressProps) {
  const onExit = useRef(onExitComplete)
  onExit.current = onExitComplete

  useEffect(() => {
    if (!done) return
    // one beat so the last state is seen before the sheet changes
    const timer = setTimeout(() => onExit.current?.(), 240)
    return () => clearTimeout(timer)
  }, [done])

  return (
    <div className='send-progress' data-testid='loading-logo'>
      <div className='send-progress__row' role='status'>
        <span className='pixel-loader' aria-hidden='true' />
        <span>{text}</span>
      </div>
      {note ? <p className='send-progress__note'>{note}</p> : null}
    </div>
  )
}
