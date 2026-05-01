import { ReactElement, ReactNode, useCallback, useState } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import FlexRow from './FlexRow'
import ArrowIcon from '../icons/Arrow'
import { hapticLight, hapticTap } from '../lib/haptics'
import ScanIcon from '../icons/Scan'
import PasteIcon from '../icons/Paste'
import XIcon from '../icons/X'
import { cn } from '@/lib/utils'

const buttonVariants = cva('button', {
  variants: {
    variant: {
      default: 'dark',
      secondary: 'secondary',
      destructive: 'red',
      ghost: 'clear',
      outline: 'outline',
      copy: 'copy',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  ariaLabel?: string
  children?: ReactNode
  className?: string
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
  className,
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
  variant,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false)

  // Support both old boolean props and new variant prop
  const resolvedVariant = variant ?? (red ? 'destructive' : secondary ? 'secondary' : clear ? 'ghost' : outline ? 'outline' : copy ? 'copy' : 'default')

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
      className={cn(buttonVariants({ variant: resolvedVariant }), pressed && 'pressed', className)}
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

export { buttonVariants }

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
