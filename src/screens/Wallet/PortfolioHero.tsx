import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { prettyNumber, prettyHide } from '../../lib/format'
import { FIAT_SYMBOLS } from '../../lib/fiat'
import EyeIcon from '../../icons/Eye'

/**
 * Fiat-primary total balance across BTC + all assets.
 * Matches master Balance component styling.
 */
export default function PortfolioHero() {
  const { config, updateConfig } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { totalFiat } = usePortfolioFiat()

  const fiatSymbol = FIAT_SYMBOLS[config.fiat] ?? ''
  const fiatBalanceRaw = config.showBalance
    ? prettyNumber(totalFiat, fiatDecimals(), true, fiatDecimals())
    : prettyHide(totalFiat, '')
  // Skip symbol prefix for zero/hidden balance to avoid lone "$"
  const fiatBalance = fiatSymbol && fiatBalanceRaw ? `${fiatSymbol}${fiatBalanceRaw}` : fiatBalanceRaw
  const fiatUnit = fiatSymbol ? '' : config.fiat

  const toggleShow = () => updateConfig({ ...config, showBalance: !config.showBalance })

  return (
    <div className='mb-6 mt-8 flex w-full flex-col items-center justify-center'>
      <div className='flex items-baseline gap-2'>
        <span className='text-heading-xl' data-testid='main-balance'>
          {fiatBalance}
        </span>
        {fiatUnit ? <span className='text-xl'>{fiatUnit}</span> : null}
        <button
          type='button'
          onClick={toggleShow}
          aria-label={config.showBalance ? 'Hide balance' : 'Show balance'}
          className='ml-1 flex cursor-pointer items-center justify-center border-none bg-transparent p-1 text-inherit'
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          <EyeIcon size={18} />
        </button>
      </div>
    </div>
  )
}
