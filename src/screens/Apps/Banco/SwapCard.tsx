import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  SwapCard                                                          */
/* ------------------------------------------------------------------ */

interface SwapCardProps {
  children: React.ReactNode
}

export function SwapCard({ children }: SwapCardProps) {
  return (
    <div
      style={{
        background: 'var(--dark05)',
        borderRadius: '1.25rem',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
      }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  TokenBlock                                                        */
/* ------------------------------------------------------------------ */

interface TokenBlockProps {
  label: string
  amount: string
  onAmountChange?: (v: string) => void
  tokenLabel: string
  tokenIcon?: string
  balance?: number
  balanceUnit?: string // e.g. "sats"
  readOnly?: boolean
  loading?: boolean
  testId?: string
}

export function TokenBlock({
  label,
  amount,
  onAmountChange,
  tokenLabel,
  tokenIcon,
  balance,
  balanceUnit,
  readOnly,
  loading,
  testId,
}: TokenBlockProps) {
  const [failedIcon, setFailedIcon] = useState<string>()
  const iconVisible = tokenIcon !== undefined && tokenIcon !== failedIcon

  return (
    <div
      data-testid={testId}
      style={{
        background: 'var(--dark10)',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
      }}
    >
      {/* top row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--dark50)' }}>{label}</span>
        {balance !== undefined && (
          <span style={{ fontSize: 13, color: 'var(--dark50)' }}>
            Balance: {balance.toLocaleString()}
            {balanceUnit ? ` ${balanceUnit}` : ''}
          </span>
        )}
      </div>

      {/* bottom row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* amount */}
        {loading ? (
          <motion.div
            style={{
              width: 80,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(90deg, var(--dark10) 25%, var(--dark20) 50%, var(--dark10) 75%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        ) : readOnly ? (
          <span
            data-testid={testId ? `${testId}-amount` : undefined}
            style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: 'inherit',
              color: amount && amount !== '0' ? 'var(--black)' : 'var(--dark30)',
            }}
          >
            {amount || '0'}
          </span>
        ) : (
          <input
            type='text'
            inputMode='decimal'
            placeholder='0'
            value={amount}
            onChange={(e) => onAmountChange?.(e.target.value)}
            style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: 'inherit',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--black)',
              width: '100%',
              padding: 0,
            }}
          />
        )}

        {/* token pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: 'var(--dark15)',
            borderRadius: '2rem',
            padding: '0.375rem 0.75rem',
            flexShrink: 0,
          }}
        >
          {iconVisible ? (
            <img
              src={tokenIcon}
              alt={tokenLabel}
              onError={() => setFailedIcon(tokenIcon)}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
              }}
            />
          ) : null}
          <span style={{ fontWeight: 700, color: 'var(--black)', whiteSpace: 'nowrap' }}>{tokenLabel}</span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FlipButton                                                        */
/* ------------------------------------------------------------------ */

interface FlipButtonProps {
  onClick: () => void
  testId?: string
}

export function FlipButton({ onClick, testId }: FlipButtonProps) {
  const [rotation, setRotation] = useState(0)

  const handleClick = () => {
    setRotation((r) => r + 180)
    onClick()
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: -14,
        marginBottom: -14,
        position: 'relative',
        zIndex: 2,
      }}
    >
      <motion.button
        data-testid={testId}
        onClick={handleClick}
        animate={{ rotate: rotation }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '4px solid var(--dark05)',
          background: 'var(--dark10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <ArrowDown size={18} strokeWidth={2.5} color='var(--dark50)' />
      </motion.button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  CurrencyTab                                                       */
/* ------------------------------------------------------------------ */

interface CurrencyTabProps {
  label: string
  icon?: string
  selected: boolean
  onClick: () => void
}

export function CurrencyTab({ label, icon, selected, onClick }: CurrencyTabProps) {
  const [failedIcon, setFailedIcon] = useState<string>()
  const iconVisible = icon !== undefined && icon !== failedIcon

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ background: 'var(--dark10)' }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '2rem',
        border: selected ? '1.5px solid var(--dark30)' : '1.5px solid transparent',
        background: selected ? 'var(--dark10)' : 'transparent',
        fontWeight: selected ? 600 : 400,
        fontSize: 14,
        color: 'var(--black)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {iconVisible ? (
        <img
          src={icon}
          alt={label}
          onError={() => setFailedIcon(icon)}
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
          }}
        />
      ) : null}
      {label}
    </motion.button>
  )
}
