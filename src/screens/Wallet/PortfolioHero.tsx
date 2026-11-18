import { forwardRef, useContext } from 'react'
import { PrivacyAmount } from '../../components/PrivacyAmount'
import { usePortfolioBalanceDisplay } from '../../hooks/usePortfolioBalanceDisplay'
import { usePortfolioHistory } from '../../hooks/usePortfolioHistory'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { WalletContext } from '../../providers/wallet'
import { useTranslation } from '../../providers/language'
import { prettyFiatAmount } from '../../lib/format'
import ValueChart from '../../components/ValueChart'
import Figure from '../../components/Figure'
import Glyph from '../../icons/Glyph'

interface PortfolioHeroProps {
  collapseProgress?: number
}

/**
 * Fiat-primary total balance across BTC and every account, left aligned,
 * with the month's change and a chart of what today's holdings were worth.
 */
const PortfolioHero = forwardRef<HTMLDivElement, PortfolioHeroProps>(function PortfolioHero({ collapseProgress }, ref) {
  const { balance, maskedBalance, unit, secondaryBalance, secondaryUnit, maskedSecondary, showSecondary } =
    usePortfolioBalanceDisplay()
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { syncing } = useContext(WalletContext)
  const { t } = useTranslation()
  const history = usePortfolioHistory()
  const progress = collapseProgress === undefined ? undefined : Math.max(0, Math.min(1, collapseProgress))
  const hasTrend = history.status === 'ready' && config.showBalance
  const up = history.delta >= 0
  const decimals = fiatDecimals()
  const deltaText = prettyFiatAmount(Math.abs(history.delta), config.currency, {
    bitcoinUnit: config.unit,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
  const percentText = `${(Math.abs(history.ratio) * 100).toFixed(1)}%`

  return (
    <div className='home-hero'>
      <div
        ref={ref}
        className='home-hero__collapse flex flex-col items-start'
        style={
          progress === undefined
            ? undefined
            : {
                animation: 'none',
                opacity: 1 - progress,
                transform: `translate3d(0, ${-14 * progress}px, 0) scale(${1 - 0.2 * progress})`,
                willChange: progress > 0 && progress < 1 ? 'transform, opacity' : 'auto',
              }
        }
      >
        <div className='flex items-baseline gap-2'>
          <PrivacyAmount className='home-hero__balance' masked={maskedBalance} testId='main-balance' interactive>
            <Figure value={balance} />
          </PrivacyAmount>
          {unit ? <span className='text-xl text-ink-3'>{unit}</span> : null}
        </div>
        <div className='home-hero__meta'>
          {hasTrend ? (
            <span className={up ? 'home-hero__change home-hero__change--up' : 'home-hero__change'}>
              <Glyph name={up ? 'arrowUp' : 'arrowDown'} size={14} strokeWidth={2.5} />
              <span className='sr-only'>{up ? '+' : '-'}</span>
              {deltaText} · {percentText}
              <span className='home-hero__period'>{t('wallet.thisMonth')}</span>
            </span>
          ) : showSecondary ? (
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
      {hasTrend ? (
        <div className='home-hero__chart'>
          <ValueChart points={history.points} label={t('wallet.valueChart')} />
        </div>
      ) : null}
    </div>
  )
})

export default PortfolioHero
