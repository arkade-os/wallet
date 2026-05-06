import { forwardRef, useContext } from 'react'
import LogoIcon from '../../icons/Logo'
import SettingsIcon from '../../icons/Settings'
import HistoryIcon from '../../icons/History'
import { NavigationContext, Pages } from '../../providers/navigation'
import { OptionsContext } from '../../providers/options'
import { SettingsOptions } from '../../lib/types'
import { hapticLight } from '../../lib/haptics'

interface HomeHeaderProps {
  balance?: string
  balanceProgress?: number
  balanceUnit?: string
  logoVisible?: boolean
}

/**
 * Home header: logo left, top-right icon cluster (Activity, Settings).
 */
const HomeHeader = forwardRef<HTMLDivElement, HomeHeaderProps>(function HomeHeader(
  { balance, balanceProgress = 0, balanceUnit, logoVisible = true },
  ref,
) {
  const { navigate } = useContext(NavigationContext)
  const { setOption } = useContext(OptionsContext)
  const clampedBalanceProgress = Math.max(0, Math.min(1, balanceProgress))

  const handleActivity = () => {
    hapticLight()
    navigate(Pages.Activity)
  }

  const handleSettings = () => {
    hapticLight()
    setOption(SettingsOptions.Menu)
    navigate(Pages.WalletSettings)
  }

  const actionClassName =
    'inline-flex size-11 cursor-pointer touch-manipulation items-center justify-center rounded-lg border-none bg-transparent text-neutral-700 transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500'

  return (
    <div className='home-header sticky top-0 z-50 -mx-4'>
      <div className='relative flex h-18 w-full items-center justify-between px-5'>
        <div
          ref={ref}
          className='flex size-11 items-center justify-center'
          style={{ visibility: logoVisible ? 'visible' : 'hidden' }}
        >
          <LogoIcon small />
        </div>
        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={handleActivity}
            aria-label='View recent activity'
            data-testid='top-right-activity'
            className={actionClassName}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <HistoryIcon size={20} />
          </button>
          <button
            type='button'
            onClick={handleSettings}
            aria-label='Open settings'
            data-testid='top-right-settings'
            className={actionClassName}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
        {balance ? (
          <div
            className='pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center text-center'
            aria-hidden={clampedBalanceProgress < 0.5}
            data-testid='sticky-balance'
          >
            <div
              className='flex max-w-[12rem] items-baseline gap-1'
              style={{
                opacity: clampedBalanceProgress,
                transform: `translate3d(0, ${10 * (1 - clampedBalanceProgress)}px, 0) scale(${0.94 + 0.06 * clampedBalanceProgress})`,
                transformOrigin: 'center center',
                willChange: clampedBalanceProgress > 0 && clampedBalanceProgress < 1 ? 'transform, opacity' : 'auto',
              }}
            >
              <span className='truncate text-heading-sm'>{balance}</span>
              {balanceUnit ? <span className='text-sm text-neutral-500'>{balanceUnit}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
})

export default HomeHeader
