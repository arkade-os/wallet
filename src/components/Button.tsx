import { IonButton } from '@ionic/react'
import { ReactElement, ReactNode, useCallback, useState } from 'react'
import FlexRow from './FlexRow'
import ArrowIcon from '../icons/Arrow'
import { hapticLight, hapticTap } from '../lib/haptics'
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
  const className = `${variant}${pressed ? ' pressed' : ''}`

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

  return (
    <IonButton
      className={className}
      disabled={disabled}
      fill={clear ? 'clear' : outline ? 'outline' : 'solid'}
      onClick={handleClick}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      style={{ margin: '4px 0' }}
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
    </IonButton>
  )
}

const Label = ({ label }: { label: string }) => <p style={{ lineHeight: '20px' }}>{label}</p>

interface ButtonOnInputProps {
  label?: string
  border?: boolean
  icon?: ReactElement
  onClick: () => void
}

export function ButtonOnInput({ label, border, icon, onClick }: ButtonOnInputProps) {
  const pillBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.4rem 0.65rem',
    borderRadius: '999px',
    border: border ? '1px solid var(--dark20)' : 'none',
    background: border ? 'var(--dark05)' : 'none',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--dark80)',
    whiteSpace: 'nowrap',
    minHeight: '36px',
    position: 'relative',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }

  // Expands tap target to 44px without increasing visual size
  const hitAreaStyle: React.CSSProperties = {
    content: '""',
    position: 'absolute',
    inset: '-4px',
  }

  const handleClick = () => {
    hapticLight()
    onClick()
  }

  return (
    <button type='button' onClick={handleClick} aria-label={label} style={pillBase}>
      <span style={hitAreaStyle} />
      {icon}
      {label}
    </button>
  )
}

export function PasteButtonOnInput({ onClick }: { onClick: () => void }) {
  return <ButtonOnInput border label='Paste' icon={<PasteIcon />} onClick={onClick} />
}

export function ScanButtonOnInput({ onClick }: { onClick: () => void }) {
  return <ButtonOnInput border label='Scan QR' icon={<ScanIcon />} onClick={onClick} />
}

export function ClearButtonOnInput({ onClick }: { onClick: () => void }) {
  return <ButtonOnInput icon={<XIcon />} onClick={onClick} />
}
