import { ReactNode } from 'react'

export default function Focusable({
  ariaLabel,
  children,
  onEscape,
  onEnter,
  role,
  fit,
}: {
  ariaLabel?: string
  children: ReactNode
  onEscape?: () => void
  onEnter?: () => void
  role?: string
  fit?: boolean
}) {
  const style: React.CSSProperties = {
    borderRadius: fit ? '0.5rem' : undefined,
    width: fit ? 'fit-content' : '100%',
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onEnter && ['Enter', ' '].includes(e.key)) {
      e.stopPropagation()
      e.preventDefault()
      onEnter()
    }
    if (onEscape && e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      onEscape()
    }
  }

  return (
    <div
      tabIndex={0}
      style={style}
      className='focusable'
      role={role ?? 'button'}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel ?? 'Focusable element'}
    >
      {children}
    </div>
  )
}
