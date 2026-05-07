import { useContext } from 'react'
import AssetCard from '../../components/AssetCard'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { prettyFiatAmount } from '../../lib/format'

export default function AssetsSection() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { rows } = usePortfolioFiat()

  const handleRowClick = (assetId: string) => () => {
    // BTC row is non-interactive (no detail screen)
    if (assetId === 'btc') return
    // Haptic is fired by AssetCard, no need to duplicate here
    setAssetInfo({ assetId, supply: 0 })
    navigate(Pages.AppAssetDetail)
  }

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
        {rows.map((row) => {
          const isBtc = row.assetId === 'btc'
          return (
            <AssetCard
              key={row.assetId}
              assetId={isBtc ? '' : row.assetId}
              name={row.name}
              ticker={row.ticker}
              icon={row.icon}
              decimals={row.decimals}
              balance={row.balance}
              fiatText={row.hasFiatPrice ? fiatLabel(row.fiatAmount) : undefined}
              onClick={isBtc ? undefined : handleRowClick(row.assetId)}
            />
          )
        })}
      </div>
    </section>
  )
}
