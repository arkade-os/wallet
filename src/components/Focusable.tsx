interface FocusableProps {
  children: React.ReactNode
  onEscape?: () => void
  onEnter?: () => void
  ariaLabel?: string
  fit?: boolean
  role?: string
}

export default function Focusable({ ariaLabel, role, children, fit, onEnter, onEscape }: FocusableProps) {
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
