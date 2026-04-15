import { useContext } from 'react'
import Text from '../../components/Text'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { prettyNumber } from '../../lib/format'

/**
 * Fiat-primary total balance across BTC + all assets. Single line.
 * A small "Total" eyebrow label sits above the number. No SATS secondary,
 * no eye toggle — this is just the portfolio total.
 */
export default function PortfolioHero() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { totalFiat } = usePortfolioFiat()

  const fiatText = prettyNumber(totalFiat, fiatDecimals(), true, fiatDecimals())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: '0 0 1rem 0' }}>
      <Text color='dark50' small>
        Total
      </Text>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <Text bigger heading medium>
          {fiatText}
        </Text>
        <Text heading color='dark50'>
          {config.fiat}
        </Text>
      </div>
    </div>
  )
}
