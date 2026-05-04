import { useContext } from 'react'
import { FiatContext } from '../../providers/fiat'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { prettyNumber } from '../../lib/format'
import { FIAT_SYMBOLS } from '../../lib/fiat'
import { ConfigContext } from '../../providers/config'

/**
 * Fiat-primary total balance across BTC + all assets.
 * Matches master Balance component styling.
 */
export default function PortfolioHero() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { totalFiat } = usePortfolioFiat()

  const fiatSymbol = FIAT_SYMBOLS[config.fiat] ?? ''
  const fiatBalanceRaw = prettyNumber(totalFiat, fiatDecimals(), true, fiatDecimals())
  // Skip symbol prefix for zero/hidden balance to avoid lone "$"
  const fiatBalance = fiatSymbol && fiatBalanceRaw ? `${fiatSymbol}${fiatBalanceRaw}` : fiatBalanceRaw
  const fiatUnit = fiatSymbol ? '' : config.fiat

  return (
    <div className='mb-6 mt-8 flex w-full flex-col items-center justify-center'>
      <div className='flex items-baseline gap-2'>
        <span className='text-heading-xl' data-testid='main-balance'>
          {fiatBalance}
        </span>
        {fiatUnit ? <span className='text-xl'>{fiatUnit}</span> : null}
      </div>
    </div>
  )
}
