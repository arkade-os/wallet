import { useContext } from 'react'
import AssetCard from '../../components/AssetCard'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { prettyFiatAmount } from '../../lib/format'

export default function AssetsSection() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { rows } = usePortfolioFiat()

  const fiatLabel = (amount: number) => {
    const decimals = fiatDecimals()
    return prettyFiatAmount(amount, config.fiat, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })
  }

  return (
    <section className='home-section'>
      <div className='flex w-full items-center justify-between px-1'>
        <span className='home-section-label'>Assets</span>
      </div>
      <div className='home-section__content'>
        {rows.map((row) => (
          <AssetCard
            key={row.assetId}
            assetId={row.assetId === 'btc' ? '' : row.assetId}
            name={row.name}
            ticker={row.ticker}
            icon={row.icon}
            decimals={row.decimals}
            balance={row.balance}
            fiatText={row.hasFiatPrice ? fiatLabel(row.fiatAmount) : undefined}
          />
        ))}
      </div>
    </section>
  )
}
