import { ReactElement, ReactNode, useCallback } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import FlexRow from './FlexRow'
import ArrowIcon from '../icons/Arrow'
import { hapticLight, hapticTap } from '../lib/haptics'
import ScanIcon from '../icons/Scan'
import PasteIcon from '../icons/Paste'
import XIcon from '../icons/X'
import { cn } from '@/lib/utils'
import { useTranslation } from '../providers/language'

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
  // Support both old boolean props and new variant prop
  const resolvedVariant =
    variant ??
    (red ? 'destructive' : secondary ? 'secondary' : clear ? 'ghost' : outline ? 'outline' : copy ? 'copy' : 'default')

  const handleClick = useCallback(
    (event: any) => {
      if (disabled || loading) return
      hapticTap()
      onClick(event)
    },
    [disabled, loading, onClick],
  )

  return (
    <button
      aria-label={ariaLabel || label}
      type='button'
      className={cn(buttonVariants({ variant: resolvedVariant }), className)}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      data-testid={testId}
      style={{ margin: '4px 0' }}
    >
      {loading ? (
        <FlexRow centered gap='0.75rem'>
          <span className='pixel-loader' aria-hidden='true' />
          {children ?? (label ? <Label label={label} /> : null)}
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
  const { t } = useTranslation()
  return <ButtonOnInput label={t('common.paste')} icon={<PasteIcon />} onClick={onClick} />
}

export function ScanButtonOnInput({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return <ButtonOnInput label={t('components.scanQr')} icon={<ScanIcon />} onClick={onClick} />
}

export function ClearButtonOnInput({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return <ButtonOnInput ariaLabel={t('components.clear')} clear icon={<XIcon />} onClick={onClick} />
}
