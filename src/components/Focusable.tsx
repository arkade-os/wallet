import { ReactNode } from 'react'

export default function Focusable({
  ariaLabel,
  children,
  inactive,
  onEscape,
  onEnter,
  round,
  role,
  fit,
  id,
}: {
  ariaLabel?: string
  children: ReactNode
  inactive?: boolean
  onEscape?: () => void
  onEnter?: () => void
  round?: boolean
  role?: string
  fit?: boolean
  id?: string
}) {
  const style: React.CSSProperties = {
    borderRadius: round ? '0.5rem' : undefined,
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
      id={id}
      style={style}
      className='focusable'
      role={role ?? 'button'}
      onKeyDown={handleKeyDown}
      tabIndex={inactive ? -1 : 0}
      aria-label={ariaLabel ?? 'Focusable element'}
    >
      {children}
    </div>
  )
}
