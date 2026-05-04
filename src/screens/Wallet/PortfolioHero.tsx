import { forwardRef } from 'react'
import { usePortfolioBalanceDisplay } from '../../hooks/usePortfolioBalanceDisplay'

interface PortfolioHeroProps {
  collapseProgress?: number
}

/**
 * Fiat-primary total balance across BTC + all assets.
 * Matches master Balance component styling.
 */
const PortfolioHero = forwardRef<HTMLDivElement, PortfolioHeroProps>(function PortfolioHero(
  { collapseProgress = 0 },
  ref,
) {
  const { balance, unit } = usePortfolioBalanceDisplay()
  const clampedProgress = Math.max(0, Math.min(1, collapseProgress))

  return (
    <div className='mb-6 mt-8 flex w-full flex-col items-center justify-center'>
      <div
        ref={ref}
        className='flex items-baseline gap-2'
        style={{
          opacity: 1 - clampedProgress,
          transform: `translate3d(0, ${-18 * clampedProgress}px, 0) scale(${1 - 0.28 * clampedProgress})`,
          transformOrigin: 'center top',
          willChange: clampedProgress > 0 && clampedProgress < 1 ? 'transform, opacity' : 'auto',
        }}
      >
        <span className='text-heading-xl' data-testid='main-balance'>
          {balance}
        </span>
        {unit ? <span className='text-xl'>{unit}</span> : null}
      </div>
    </div>
  )
})

export default PortfolioHero
