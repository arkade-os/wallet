import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from '../hooks/useReducedMotion'
import Text from './Text'
import { gitCommit } from '../_gitCommit'
import { DevModeContext } from '../providers/devMode'
import { useTranslation } from '../providers/language'

const EXIT_MS = 200

interface LoadingLogoProps {
  text?: string
  done?: boolean
  exitMode?: 'fly-to-target' | 'fly-up' | 'none'
  onExitComplete?: () => void
}

export default function LoadingLogo({ text, done, exitMode = 'none', onExitComplete }: LoadingLogoProps) {
  const { devMode, handleTap } = useContext(DevModeContext)
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(true)
  const cover = exitMode !== 'none'
  const onExit = useRef(onExitComplete)
  onExit.current = onExitComplete

  useEffect(() => {
    if (!done) return
    if (!cover) {
      onExit.current?.()
      return
    }
    if (reducedMotion) {
      setVisible(false)
      onExit.current?.()
      return
    }
    const timer = setTimeout(() => {
      setVisible(false)
      onExit.current?.()
    }, EXIT_MS)
    return () => clearTimeout(timer)
  }, [done, cover, reducedMotion])

  if (!visible) return null

  return createPortal(
    <div
      className={`boot${cover ? ' boot--cover' : ''}${done && cover ? ' boot--leaving' : ''}`}
      data-testid='loading-logo'
      role='status'
      aria-label={text || t('common.loading')}
    >
      <span className='boot__loader' onClick={handleTap}>
        <span className='pixel-loader' aria-hidden='true' />
      </span>
      {text && devMode ? (
        <Text centered small wrap>
          {text}
        </Text>
      ) : null}
      {cover && devMode ? <span className='boot__commit'>{gitCommit}</span> : null}
    </div>,
    document.body,
  )
}
