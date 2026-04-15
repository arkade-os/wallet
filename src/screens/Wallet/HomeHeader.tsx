import { forwardRef, useContext } from 'react'
import LogoIcon from '../../icons/Logo'
import SettingsIcon from '../../icons/Settings'
import HistoryIcon from '../../icons/History'
import { NavigationContext, Pages } from '../../providers/navigation'
import { OptionsContext } from '../../providers/options'
import { SettingsOptions } from '../../lib/types'
import { hapticLight } from '../../lib/haptics'

interface HomeHeaderProps {
  logoVisible?: boolean
}

/**
 * Home header: logo left, top-right icon cluster (Activity, Settings).
 * Uses a plain flex container so the icons are pinned to the right edge
 * (FlexRow `between` doesn't work here because the inner row would claim
 *  width:100% and push its children left).
 */
const HomeHeader = forwardRef<HTMLDivElement, HomeHeaderProps>(function HomeHeader({ logoVisible = true }, ref) {
  const { navigate } = useContext(NavigationContext)
  const { setOption } = useContext(OptionsContext)

  const handleActivity = () => {
    hapticLight()
    navigate(Pages.Activity)
  }

  const handleSettings = () => {
    hapticLight()
    setOption(SettingsOptions.Menu)
    navigate(Pages.Settings)
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '0.5rem 0 1.5rem 0',
      }}
    >
      <div ref={ref} style={{ display: 'inline-flex', visibility: logoVisible ? 'visible' : 'hidden' }}>
        <LogoIcon small />
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type='button'
          onClick={handleActivity}
          aria-label='View recent activity'
          data-testid='top-right-activity'
          style={iconButtonStyle}
        >
          <HistoryIcon />
        </button>
        <button
          type='button'
          onClick={handleSettings}
          aria-label='Open settings'
          data-testid='top-right-settings'
          style={iconButtonStyle}
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
  )
})

const iconButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.5rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'inherit',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  borderRadius: '999px',
}

export default HomeHeader
