import { ReactElement, ReactNode, useCallback, useState } from 'react'
import FlexRow from './FlexRow'
import ArrowIcon from '../icons/Arrow'
import { hapticLight, triggerHaptic, HapticName } from '../lib/haptics'
import ScanIcon from '../icons/Scan'
import PasteIcon from '../icons/Paste'
import XIcon from '../icons/X'

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

type Variant = 'dark' | 'red' | 'secondary' | 'outline' | 'clear'

const variantStyles: Record<Variant, React.CSSProperties> = {
  dark: { background: 'var(--purple)', color: 'white' },
  red: { background: 'var(--red)', color: 'white' },
  secondary: { background: 'var(--neutral-100)', color: 'var(--fg)' },
  outline: { background: 'none', color: 'var(--neutral-700)' },
  clear: { background: 'none', color: 'var(--fg)' },
}

// 3D "base" color for the chunky drop on filled variants. Needs real contrast
// vs the surface or the depth disappears — secondary at --neutral-100 with an
// 0.1 alpha shadow was invisible; --neutral-300 reads.
const shadowColors: Record<Variant, string> = {
  dark: 'var(--purple-900)',
  red: 'var(--red-950)',
  secondary: 'var(--neutral-300)',
  outline: 'transparent',
  clear: 'transparent',
}

// Primary + destructive get the stronger 'medium'; secondary/outline/clear 'light'.
const variantHaptics: Record<Variant, HapticName> = {
  dark: 'medium',
  red: 'medium',
  secondary: 'light',
  outline: 'light',
  clear: 'light',
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

  const variant: Variant = red ? 'red' : secondary ? 'secondary' : clear ? 'clear' : outline ? 'outline' : 'dark'
  const isFlat = variant === 'clear' || variant === 'outline'
  const vStyle = variantStyles[variant]

  const handlePressStart = useCallback(() => {
    if (disabled || loading) return
    setPressed(true)
  }, [disabled, loading])

  const handlePressEnd = useCallback(() => {
    setPressed(false)
  }, [])

  const handleClick = useCallback(
    (event: any) => {
      triggerHaptic(variantHaptics[variant])
      onClick(event)
    },
    [onClick, variant],
  )

  // clear: no shadow. outline: three-layer elevation token (auto dark-mode rim).
  // Filled variants: chunky 4px drop that collapses to 0 on press for 3D feel.
  let boxShadow: string
  if (variant === 'clear') {
    boxShadow = 'none'
  } else if (variant === 'outline') {
    boxShadow = 'var(--elevation-sm)'
  } else {
    boxShadow = `0 ${pressed ? '0' : '4'}px 0 0 ${shadowColors[variant]}`
  }

  const style: React.CSSProperties = {
    ...vStyle,
    alignItems: 'center',
    borderRadius: '0.5rem',
    boxShadow,
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex',
    fontFamily: 'var(--font-heading)',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    letterSpacing: '-0.2px',
    margin: '4px 0',
    // 44px meets iOS 44pt HIG minimum.
    minHeight: '44px',
    opacity: disabled ? 0.4 : 1,
    padding: '0.75rem 1rem',
    transform: pressed ? (isFlat ? 'scale(0.97)' : 'translateY(4px)') : 'translateY(0)',
    // 200ms ease-out-quart per ui-polish skill.
    transition:
      'transform 200ms cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 200ms cubic-bezier(0.165, 0.84, 0.44, 1)',
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

interface ButtonOnInputProps {
  ariaLabel?: string
  clear?: boolean
  label?: string
  icon?: ReactElement
  onClick: () => void
}

export function ButtonOnInput({ label, clear, icon, onClick, ariaLabel }: ButtonOnInputProps) {
  const handleClick = () => {
    hapticLight()
    onClick()
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      aria-label={ariaLabel || label}
      className='pill-base'
      style={clear ? { border: 'none', background: 'none' } : {}}
    >
      {icon}
      {label}
    </button>
  )
}

export function PasteButtonOnInput({ onClick }: { onClick: () => void }) {
  return <ButtonOnInput label='Paste' icon={<PasteIcon />} onClick={onClick} />
}

export function ScanButtonOnInput({ onClick }: { onClick: () => void }) {
  return <ButtonOnInput label='Scan QR' icon={<ScanIcon />} onClick={onClick} />
}

export function ClearButtonOnInput({ onClick }: { onClick: () => void }) {
  return <ButtonOnInput ariaLabel='Clear' clear icon={<XIcon />} onClick={onClick} />
}
