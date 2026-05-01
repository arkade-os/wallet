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
    <div className='home-header sticky top-0 z-50 -mx-4 px-4 pb-3'>
      <div className='flex w-full items-center justify-between'>
        {/* Logo wrapper - account for LogoIcon's internal 18px padding/margin */}
        <div
          ref={ref}
          className='-ml-[18px] flex h-9 items-center'
          style={{ visibility: logoVisible ? 'visible' : 'hidden' }}
        >
          <LogoIcon small />
        </div>
        {/* Icon cluster - right-aligned, same height as logo */}
        <div className='-mr-2 flex h-9 items-center'>
          <button
            type='button'
            onClick={handleActivity}
            aria-label='View recent activity'
            data-testid='top-right-activity'
            className='inline-flex size-9 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-inherit active:scale-95'
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <HistoryIcon size={20} />
          </button>
          <button
            type='button'
            onClick={handleSettings}
            aria-label='Open settings'
            data-testid='top-right-settings'
            className='inline-flex size-9 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-inherit active:scale-95'
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  )
})

export default HomeHeader
