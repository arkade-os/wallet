import { ReactNode } from 'react'
import { AnimatePresence, motion, PanInfo } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import Text from './Text'

interface DismissibleBannerProps {
  id: string
  icon: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  onDismiss: () => void
  visible: boolean
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

const baseStyle: React.CSSProperties = {
  width: '100%',
  touchAction: 'manipulation',
}

const containerStyle: React.CSSProperties = {
  backgroundColor: 'var(--purple10)',
  borderRadius: '0.75rem',
  boxShadow: BANNER_SHADOW,
  padding: '0.75rem 0.75rem 0.25rem 0.75rem',
  width: '100%',
}

const iconStyle: React.CSSProperties = {
  backgroundColor: 'var(--purple)',
  borderRadius: '6px',
  padding: '5px',
  flexShrink: 0,
  color: 'var(--white)',
}

function BannerContent({ icon, title, description, action, onDismiss }: DismissibleBannerProps) {
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

export default function DismissibleBanner(props: DismissibleBannerProps) {
  const prefersReduced = useReducedMotion()
  const { visible, onDismiss } = props

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const swipeVelocity = Math.abs(info.velocity.x)
    if (Math.abs(info.offset.x) > 100 || swipeVelocity > 150) {
      onDismiss()
    }
  }

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
