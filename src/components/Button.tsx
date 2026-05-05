import { ReactElement, ReactNode, useCallback, useState } from 'react'
import FlexRow from './FlexRow'
import ArrowIcon from '../icons/Arrow'
import { hapticLight, hapticTap } from '../lib/haptics'
import ScanIcon from '../icons/Scan'
import PasteIcon from '../icons/Paste'
import XIcon from '../icons/X'

interface ButtonProps {
  ariaLabel?: string
  children?: ReactNode
  clear?: boolean
  copy?: boolean
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
  testId?: string
}

export default function Button({
  ariaLabel,
  children,
  clear,
  copy,
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
  testId,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false)

  const variant = red ? 'red' : secondary ? 'secondary' : clear ? 'clear' : outline ? 'outline' : copy ? 'copy' : 'dark'
  const className = `button ${variant}${pressed ? ' pressed' : ''}`

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
    <button
      aria-label={ariaLabel || label}
      type='button'
      className={className}
      disabled={disabled}
      onClick={handleClick}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      data-testid={testId}
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
        <FlexRow between padding='0 0.5rem'>
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

const Label = ({ label }: { label: string }) => <p style={{ lineHeight: '20px' }}>{label}</p>

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
