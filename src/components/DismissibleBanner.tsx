import { useContext, useState } from 'react'
import { ConfigContext } from '../providers/config'
import { hapticLight } from '../lib/haptics'
import AlertBox from './AlertBox'

interface DismissibleBannerProps {
  id: string
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
}

const easeOutQuint = 'cubic-bezier(0.23, 1, 0.32, 1)'
const duration = '300ms'

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function DismissibleBanner({ id, icon, children, onClick }: DismissibleBannerProps) {
  const { config, updateConfig } = useContext(ConfigContext)
  const [dismissed, setDismissed] = useState(false)

  if (config.bannersDismissed.includes(id)) return null

  const persist = () => {
    const bannersDismissed = [...config.bannersDismissed, id]
    updateConfig({ ...config, bannersDismissed })
  }

  const handleDismiss = () => {
    hapticLight()
    if (prefersReducedMotion) {
      persist()
      return
    }
    setDismissed(true)
  }

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName === 'opacity' && dismissed) {
      persist()
    }
  }

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      style={{
        width: '100%',
        overflow: 'hidden',
        opacity: dismissed ? 0 : 1,
        transform: dismissed ? 'translateY(8px)' : 'translateY(0)',
        maxHeight: dismissed ? '0px' : '200px',
        transition: `opacity ${duration} ${easeOutQuint}, transform ${duration} ${easeOutQuint}, max-height ${duration} ${easeOutQuint}`,
      }}
    >
      <AlertBox icon={icon} onClick={onClick} onDismiss={handleDismiss}>
        {children}
      </AlertBox>
    </div>
  )
}
