interface FocusableProps {
  children: React.ReactNode
  onKeyDown?: () => void
  ariaLabel?: string
  fit?: boolean
  role?: string
}

export default function Focusable({ ariaLabel, role, children, fit, onKeyDown }: FocusableProps) {
  const style: React.CSSProperties = {
    borderRadius: fit ? '0.5rem' : undefined,
    width: fit ? 'fit-content' : '100%',
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!onKeyDown) return
    if (['Enter', ' '].includes(e.key)) {
      e.stopPropagation()
      e.preventDefault()
      onKeyDown()
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
