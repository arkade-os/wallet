import { ReactElement, ReactNode, useCallback, useState } from 'react'
import FlexRow from './FlexRow'
import ArrowIcon from '../icons/Arrow'
import { hapticTap } from '../lib/haptics'

interface ButtonProps {
  children?: ReactNode
  clear?: boolean
  disabled?: boolean
  fancy?: boolean
  icon?: ReactElement
  label?: string
  loading?: boolean
  main?: boolean
  onClick: (event: any) => void
  outline?: boolean
  red?: boolean
  secondary?: boolean
}

const variantStyles: Record<string, React.CSSProperties> = {
  dark: {
    background: 'var(--purple)',
    border: '1px solid var(--purple)',
    color: 'white',
  },
  red: {
    background: 'var(--red)',
    border: '1px solid var(--red)',
    color: 'white',
  },
  secondary: {
    background: 'var(--dark20)',
    border: '1px solid var(--dark20)',
    color: 'var(--black)',
  },
  outline: {
    background: 'none',
    border: '1px solid var(--dark50)',
    color: 'var(--dark50)',
  },
  clear: {
    background: 'none',
    border: '1px solid transparent',
    color: 'var(--black)',
  },
}

const shadowColors: Record<string, string> = {
  dark: '#1a0b4a',
  red: '#6b0e0e',
  secondary: 'rgba(0, 0, 0, 0.1)',
  outline: 'rgba(0, 0, 0, 0.1)',
  clear: 'transparent',
}

export default function Button({
  children,
  clear,
  disabled,
  fancy,
  icon,
  label,
  loading,
  main,
  onClick,
  outline,
  red,
  secondary,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false)

  const variant = red ? 'red' : secondary ? 'secondary' : clear ? 'clear' : outline ? 'outline' : 'dark'
  const isClear = variant === 'clear'
  const vStyle = variantStyles[variant]
  const shadowColor = shadowColors[variant]

  const handlePressStart = useCallback(() => {
    if (disabled || loading) return
    setPressed(true)
  }, [disabled, loading])

  const handlePressEnd = useCallback(() => {
    setPressed(false)
  }, [])

  const handleClick = useCallback(
    (event: any) => {
      hapticTap()
      onClick(event)
    },
    [onClick],
  )

  const style: React.CSSProperties = {
    ...vStyle,
    alignItems: 'center',
    borderRadius: '0.5rem',
    boxShadow: isClear ? 'none' : `0 ${pressed ? '0' : '4'}px 0 0 ${shadowColor}`,
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex',
    fontFamily: 'var(--font-heading)',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    letterSpacing: '-0.2px',
    margin: '4px 0',
    minHeight: '40px',
    opacity: disabled ? 0.4 : 1,
    padding: '0.5rem 1rem',
    transform: pressed ? (isClear ? 'scale(0.97)' : 'translateY(4px)') : 'translateY(0)',
    transition:
      'transform 100ms cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 100ms cubic-bezier(0.165, 0.84, 0.44, 1)',
    width: '100%',
  }

  return (
    <button
      disabled={disabled}
      onClick={handleClick}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      style={style}
    >
      {loading ? (
        <FlexRow centered>
          <div className='spinner' />
        </FlexRow>
      ) : fancy ? (
        <FlexRow between>
          <FlexRow>
            {icon}
            {children ?? (label ? <Label label={label} /> : null)}
          </FlexRow>
          <ArrowIcon />
        </FlexRow>
      ) : (
        <FlexRow main={main} centered>
          {icon}
          {children ?? (label ? <Label label={label} /> : null)}
        </FlexRow>
      )}
    </button>
  )
}

const Label = ({ label }: { label: string }) => <span style={{ lineHeight: '20px' }}>{label}</span>
