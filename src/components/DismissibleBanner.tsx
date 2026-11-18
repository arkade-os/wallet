import { ReactNode } from 'react'
import { AnimatePresence, motion, PanInfo } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { hapticSubtle } from '../lib/haptics'
import { EASE_OUT_QUINT_TUPLE } from '../lib/animations'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import Text from './Text'
import { useTranslation } from '../providers/language'

interface DismissibleBannerProps {
  id: string
  icon: ReactNode
  title: string
  description?: string
  descriptionTestId?: string
  action?: { label: string; onClick: () => void; testId?: string }
  onDismiss: () => void
  visible: boolean
}

function TextButton({ onClick, label, testId }: { onClick: () => void; label: string; testId?: string }) {
  const handleClick = () => {
    hapticSubtle()
    onClick()
  }
  return (
    <button
      data-testid={testId}
      onClick={handleClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--purpletext)',
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
  backgroundColor: 'var(--surface)',
  borderRadius: '1.25rem',
  padding: '0.875rem 0.875rem 0.375rem 0.875rem',
  width: '100%',
}

// A round well, the same shape every other icon on Home sits in.
const iconStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2.25rem',
  height: '2.25rem',
  backgroundColor: 'var(--bg)',
  borderRadius: '999px',
  flexShrink: 0,
  color: 'var(--fg)',
  overflow: 'hidden',
}

function BannerContent({ icon, title, description, descriptionTestId, action, onDismiss }: DismissibleBannerProps) {
  const { t } = useTranslation()
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
              <Text color='neutral-700' small wrap testId={descriptionTestId}>
                {description}
              </Text>
            </div>
          ) : null}
          <div style={{ marginTop: description ? '0' : '0.25rem' }}>
            <FlexRow gap='1rem'>
              {action ? <TextButton onClick={action.onClick} label={action.label} testId={action.testId} /> : null}
              <TextButton onClick={onDismiss} label={t('common.dismiss')} />
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
      hapticSubtle()
      onDismiss()
    }
  }

  return (
    <AnimatePresence mode={prefersReduced ? undefined : 'popLayout'}>
      {visible ? (
        <motion.div
          key={props.id}
          layout={!prefersReduced}
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
              ease: EASE_OUT_QUINT_TUPLE,
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
                    ease: EASE_OUT_QUINT_TUPLE,
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
