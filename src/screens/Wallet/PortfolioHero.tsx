import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { prettyNumber } from '../../lib/format'

/**
 * Fiat-primary total balance across BTC + all assets. Single line.
 * A small "Total" eyebrow label sits above the number.
 */
export default function PortfolioHero() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { totalFiat } = usePortfolioFiat()

  const fiatText = prettyNumber(totalFiat, fiatDecimals(), true, fiatDecimals())

  return (
    <div className='mb-4 flex flex-col gap-1'>
      <span className='text-sm text-neutral-500'>Total</span>
      <div className='flex items-baseline gap-2'>
        <span className='font-heading text-3xl font-medium tracking-tight'>{fiatText}</span>
        <span className='font-heading text-lg text-neutral-500'>{config.fiat}</span>
      </div>
    </div>
  )
}
