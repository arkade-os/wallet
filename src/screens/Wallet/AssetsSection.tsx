import { useContext } from 'react'
import AssetCard from '../../components/AssetCard'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { NavigationContext, Pages } from '../../providers/navigation'
import { prettyFiatAmount } from '../../lib/format'
import { FlowContext } from '../../providers/flow'
import { AssetsContext } from '../../providers/assets'

export default function AssetsSection() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { isRegistered } = useContext(AssetsContext)

  const { rows } = usePortfolioFiat()
  const visibleRows = rows.filter((row) => isRegistered(row.assetId) || row.assetId === 'btc')

  const fiatLabel = (amount: number) => {
    const decimals = fiatDecimals()
    return prettyFiatAmount(amount, config.currency, {
      bitcoinUnit: config.unit,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })
  }

  const handleAssetClick = (assetId: string) => {
    if (assetId === 'btc') {
      navigate(Pages.BitcoinDetail)
    } else {
      setAssetInfo({ assetId, supply: BigInt(0) })
      navigate(Pages.AppAssetDetail)
    }
  }

  return (
    <section className='home-section'>
      <div className='flex w-full items-center justify-between px-1'>
        <span className='home-section-label'>Assets</span>
      </div>
      <div className='home-section__content'>
        {visibleRows.map((row) => (
          <AssetCard
            key={row.assetId}
            assetId={row.assetId === 'btc' ? '' : row.assetId}
            name={row.name}
            ticker={row.ticker}
            icon={row.icon}
            decimals={row.decimals}
            balance={row.balance}
            fiatText={row.hasFiatPrice ? fiatLabel(row.fiatAmount) : undefined}
            onClick={() => handleAssetClick(row.assetId)}
          />
        ))}
      </div>
    </section>
  )
}
