import { useContext } from 'react'
import { NavigationContext, Pages } from '../../providers/navigation'
import { OptionsContext } from '../../providers/options'
import { SettingsOptions } from '../../lib/types'
import { useTranslation } from '../../providers/language'
import { hapticLight } from '../../lib/haptics'
import { PrivacyAmount, maskedFiat } from '../../components/PrivacyAmount'
import Glyph from '../../icons/Glyph'

interface HomeHeaderProps {
  balance?: string
  balanceProgress?: number
  balanceUnit?: string
  maskedBalance?: string
}

export default function HomeHeader({
  balance,
  balanceProgress,
  balanceUnit,
  maskedBalance = maskedFiat(),
}: HomeHeaderProps) {
  const { navigate } = useContext(NavigationContext)
  const { setOption } = useContext(OptionsContext)
  const { t } = useTranslation()
  const progress = balanceProgress === undefined ? undefined : Math.max(0, Math.min(1, balanceProgress))

  const handleScan = () => {
    hapticLight()
    navigate(Pages.WalletScan)
  }

  const handleSettings = () => {
    hapticLight()
    setOption(SettingsOptions.Menu)
    navigate(Pages.Settings)
  }

  return (
    <header className='home-header sticky top-0 z-50 -mx-4'>
      <div className='relative flex h-14 w-full items-center justify-end px-2'>
        {balance ? (
          <div
            className='absolute inset-y-0 left-5 flex items-center'
            aria-hidden={progress === undefined ? true : progress < 0.5}
            data-testid='sticky-balance'
          >
            <div
              className='home-header__balance flex max-w-[12rem] items-baseline gap-1'
              style={
                progress === undefined
                  ? undefined
                  : {
                      opacity: progress,
                      transform: `translate3d(0, ${10 * (1 - progress)}px, 0)`,
                      willChange: progress > 0 && progress < 1 ? 'transform, opacity' : 'auto',
                    }
              }
            >
              <PrivacyAmount className='truncate text-heading-sm' masked={maskedBalance}>
                {balance}
              </PrivacyAmount>
              {balanceUnit ? <span className='text-sm text-ink-3'>{balanceUnit}</span> : null}
            </div>
          </div>
        ) : null}
        <div className='home-header__actions flex items-center'>
          <button
            type='button'
            onClick={handleScan}
            aria-label={t('wallet.scan')}
            data-testid='home-action-scan'
            className='icon-button'
          >
            <Glyph name='scan' size={22} />
          </button>
          <button
            type='button'
            onClick={handleSettings}
            aria-label={t('wallet.openSettings')}
            data-testid='top-right-settings'
            className='icon-button home-header__settings'
          >
            <Glyph name='settings' size={22} />
          </button>
        </div>
      </div>
    </header>
  )
}
