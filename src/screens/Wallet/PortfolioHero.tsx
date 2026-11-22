import { PointerEvent, forwardRef, useContext, useEffect, useRef } from 'react'
import { PrivacyAmount } from '../../components/PrivacyAmount'
import { usePortfolioBalanceDisplay } from '../../hooks/usePortfolioBalanceDisplay'
import { toggleBalanceLead } from '../../lib/balanceLead'
import { hapticLight } from '../../lib/haptics'
import { BackupContext } from '../../providers/backup'
import { ConfigContext } from '../../providers/config'
import { WalletContext } from '../../providers/wallet'
import { useTranslation } from '../../providers/language'
import Figure from '../../components/Figure'

export const HOLD_TO_HIDE_MS = 500
const HOLD_SLOP_PX = 10

interface PortfolioHeroProps {
  collapseProgress?: number
}

const PortfolioHero = forwardRef<HTMLDivElement, PortfolioHeroProps>(function PortfolioHero({ collapseProgress }, ref) {
  const { balance, maskedBalance, unit, secondaryBalance, secondaryUnit, maskedSecondary, showSecondary, canSwitch } =
    usePortfolioBalanceDisplay()
  const { config } = useContext(ConfigContext)
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { syncing } = useContext(WalletContext)
  const { t } = useTranslation()
  const progress = collapseProgress === undefined ? undefined : Math.max(0, Math.min(1, collapseProgress))

  const press = useRef<{ timer?: ReturnType<typeof setTimeout>; x: number; y: number; held: boolean }>({
    x: 0,
    y: 0,
    held: false,
  })
  useEffect(() => () => clearTimeout(press.current.timer), [])

  const toggleHidden = () => {
    hapticLight()
    backupAndUpdateConfig({ ...config, showBalance: !config.showBalance })
  }

  const startPress = (event: PointerEvent<HTMLButtonElement>) => {
    clearTimeout(press.current.timer)
    press.current = {
      x: event.clientX,
      y: event.clientY,
      held: false,
      timer: setTimeout(() => {
        press.current.held = true
        toggleHidden()
      }, HOLD_TO_HIDE_MS),
    }
  }

  const movePress = (event: PointerEvent<HTMLButtonElement>) => {
    const { x, y } = press.current
    if (Math.hypot(event.clientX - x, event.clientY - y) > HOLD_SLOP_PX) clearTimeout(press.current.timer)
  }

  const endPress = () => clearTimeout(press.current.timer)

  const handleClick = () => {
    if (press.current.held) {
      press.current.held = false
      return
    }
    if (!canSwitch) return
    hapticLight()
    toggleBalanceLead()
  }

  return (
    <div className='home-hero'>
      <div
        ref={ref}
        className='home-hero__collapse flex flex-col items-start'
        style={
          progress === undefined
            ? undefined
            : {
                opacity: 1 - progress,
                transform: `translate3d(0, ${-14 * progress}px, 0) scale(${1 - 0.2 * progress})`,
                willChange: progress > 0 && progress < 1 ? 'transform, opacity' : 'auto',
              }
        }
      >
        <button
          type='button'
          className='home-hero__figure'
          aria-label={canSwitch ? t('components.toggleCurrency') : undefined}
          data-testid='main-balance-button'
          onClick={handleClick}
          onPointerDown={startPress}
          onPointerMove={movePress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onPointerCancel={endPress}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className='flex items-baseline gap-2'>
            <PrivacyAmount className='home-hero__balance' masked={maskedBalance} testId='main-balance'>
              <Figure value={balance} />
            </PrivacyAmount>
            {unit ? <span className='text-xl text-ink-3'>{unit}</span> : null}
          </span>
        </button>
        <button type='button' className='home-hero__hide sr-only focus-visible:not-sr-only' onClick={toggleHidden}>
          {config.showBalance ? t('components.hideBalances') : t('components.showBalances')}
        </button>
        <div className='home-hero__meta'>
          {showSecondary ? (
            <span className='flex items-baseline gap-1'>
              <PrivacyAmount masked={maskedSecondary} testId='secondary-balance'>
                {secondaryBalance}
              </PrivacyAmount>
              {secondaryUnit ? <span>{secondaryUnit}</span> : null}
            </span>
          ) : null}
          {syncing ? <p role='status'>{t('wallet.syncing')}</p> : null}
        </div>
      </div>
    </div>
  )
})

export default PortfolioHero
