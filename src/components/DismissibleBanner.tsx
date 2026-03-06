import { ReactNode } from 'react'
import { AnimatePresence, motion, PanInfo } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import Text from './Text'
import XMarkIcon from '../icons/XMark'

export type BannerVariant = 'expanded' | 'cta' | 'card' | 'minimal'

interface DismissibleBannerProps {
  id: string
  icon: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  onDismiss: () => void
  visible: boolean
  variant?: BannerVariant
}

const EASE_OUT_QUINT = [0.23, 1, 0.32, 1] as const

const BANNER_SHADOW =
  '0px 0px 0px 1px rgba(0, 0, 0, 0.06), 0px 1px 2px -1px rgba(0, 0, 0, 0.06), 0px 2px 4px 0px rgba(0, 0, 0, 0.04)'

function TextButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--purple)',
        touchAction: 'manipulation',
        fontFamily: 'inherit',
        textAlign: 'left',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {label}
    </button>
  )
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label='Dismiss'
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        position: 'relative',
        width: '20px',
        height: '20px',
        flexShrink: 0,
        touchAction: 'manipulation',
        color: 'var(--dark50)',
      }}
    >
      <span style={{ position: 'absolute', inset: '-12px' }} />
      <XMarkIcon />
    </button>
  )
}

function DismissButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--dark05)',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        padding: '0.625rem 1rem',
        width: '100%',
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--black)',
        touchAction: 'manipulation',
        fontFamily: 'inherit',
        minHeight: '44px',
      }}
    >
      {label}
    </button>
  )
}

const baseStyle: React.CSSProperties = {
  width: '100%',
  touchAction: 'manipulation',
}

const containerStyle: React.CSSProperties = {
  backgroundColor: 'var(--purple10)',
  borderRadius: '0.75rem',
  boxShadow: BANNER_SHADOW,
  padding: '0.75rem',
  width: '100%',
}

const iconStyle: React.CSSProperties = {
  backgroundColor: 'var(--purple)',
  borderRadius: '6px',
  padding: '5px',
  flexShrink: 0,
  color: 'var(--white)',
}

// Variant 1: Expanded — icon + title + description + text action buttons
function ExpandedBanner({ icon, title, description, action, onDismiss }: DismissibleBannerProps) {
  return (
    <div style={containerStyle}>
      <FlexRow gap='0.75rem' alignItems='flex-start'>
        <div style={iconStyle}>{icon}</div>
        <FlexCol gap='0'>
          <Text color='black' medium heading>
            {title}
          </Text>
          {description ? (
            <div style={{ marginTop: '0.25rem' }}>
              <Text color='dark70' small wrap>
                {description}
              </Text>
            </div>
          ) : null}
          <div style={{ marginTop: description ? '0' : '0.25rem' }}>
            <FlexRow gap='1rem'>
              {action ? <TextButton onClick={action.onClick} label={action.label} /> : null}
              <TextButton onClick={onDismiss} label='Dismiss' />
            </FlexRow>
          </div>
        </FlexCol>
      </FlexRow>
    </div>
  )
}

// Variant 2: CTA button — icon + text + full-width dismiss button
function CtaBanner({ icon, title, description, onDismiss }: DismissibleBannerProps) {
  return (
    <div style={containerStyle}>
      <FlexCol gap='0.75rem'>
        <FlexRow gap='0.5rem' alignItems='flex-start'>
          <div style={iconStyle}>{icon}</div>
          <FlexCol gap='0.25rem'>
            <Text color='black' medium heading>
              {title}
            </Text>
            {description ? (
              <Text color='dark70' small wrap>
                {description}
              </Text>
            ) : null}
          </FlexCol>
        </FlexRow>
        <DismissButton onClick={onDismiss} label='Dismiss' />
      </FlexCol>
    </div>
  )
}

// Variant 3: Card — icon on top, text below, dismiss button at bottom
function CardBanner({ icon, title, description, onDismiss }: DismissibleBannerProps) {
  return (
    <div style={{ ...containerStyle, padding: '1rem' }}>
      <FlexCol gap='0.75rem' centered>
        <div style={{ ...iconStyle, padding: '8px', borderRadius: '10px' }}>{icon}</div>
        <FlexCol gap='0.25rem' centered>
          <Text color='black' medium heading>
            {title}
          </Text>
          {description ? (
            <Text color='dark70' small wrap>
              {description}
            </Text>
          ) : null}
        </FlexCol>
        <DismissButton onClick={onDismiss} label='Dismiss' />
      </FlexCol>
    </div>
  )
}

// Variant 4: Minimal — text-only with left border accent, inline dismiss
function MinimalBanner({ title, description, onDismiss }: DismissibleBannerProps) {
  return (
    <div
      style={{
        width: '100%',
        borderLeft: '3px solid var(--purple)',
        paddingLeft: '0.75rem',
        paddingTop: '0.25rem',
        paddingBottom: '0.25rem',
      }}
    >
      <FlexRow between gap='0.5rem' alignItems='flex-start'>
        <FlexCol gap='0.125rem'>
          <Text color='black' medium heading>
            {title}
          </Text>
          {description ? (
            <Text color='dark70' small wrap>
              {description}
            </Text>
          ) : null}
        </FlexCol>
        <CloseButton onClick={onDismiss} />
      </FlexRow>
    </div>
  )
}

const variantMap: Record<BannerVariant, (props: DismissibleBannerProps) => JSX.Element> = {
  expanded: ExpandedBanner,
  cta: CtaBanner,
  card: CardBanner,
  minimal: MinimalBanner,
}

export default function DismissibleBanner(props: DismissibleBannerProps) {
  const prefersReduced = useReducedMotion()
  const { visible, onDismiss, variant = 'expanded' } = props

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const swipeVelocity = Math.abs(info.velocity.x)
    if (Math.abs(info.offset.x) > 100 || swipeVelocity > 150) {
      onDismiss()
    }
  }

  const BannerContent = variantMap[variant]

  return (
    <AnimatePresence mode='popLayout'>
      {visible ? (
        <motion.div
          key={props.id}
          layout
          style={baseStyle}
          drag={prefersReduced ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={handleDragEnd}
          initial={prefersReduced ? false : { opacity: 0, y: -8 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.25,
              ease: EASE_OUT_QUINT as unknown as [number, number, number, number],
            },
          }}
          exit={
            prefersReduced
              ? undefined
              : {
                  opacity: 0,
                  y: -24,
                  scale: 0.97,
                  transition: {
                    duration: 0.25,
                    ease: EASE_OUT_QUINT as unknown as [number, number, number, number],
                  },
                }
          }
        >
          <BannerContent {...props} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
