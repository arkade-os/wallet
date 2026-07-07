import { useContext } from 'react'
import AssetCard from '../../components/AssetCard'
import { usePortfolioFiat, type PortfolioRow } from '../../hooks/usePortfolioFiat'
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
  const visibleRows = rows.filter((row) => isVisibleAssetRow(row, config.importedAssets, isRegistered))

  const fiatLabel = (amount: number) => {
    const decimals = fiatDecimals()
    return prettyFiatAmount(amount, config.currency, {
      bitcoinUnit: config.unit,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })
  }

  const handleAssetClick = (row: PortfolioRow) => {
    const assetId = detailAssetIdForRow(row, config.importedAssets, isRegistered)
    if (!assetId) return

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
            onClick={
              detailAssetIdForRow(row, config.importedAssets, isRegistered) ? () => handleAssetClick(row) : undefined
            }
          />
        ))}
      </div>
    </section>
  )
}

function isVisibleAssetRow(
  row: PortfolioRow,
  importedAssets: string[],
  isRegistered: (assetId: string) => boolean,
): boolean {
  if (row.assetId === 'btc') return true
  if (importedAssets.includes(row.assetId) || isRegistered(row.assetId)) return true
  return Boolean(row.sourceAssetIds?.some((assetId) => importedAssets.includes(assetId) || isRegistered(assetId)))
}

function detailAssetIdForRow(
  row: PortfolioRow,
  importedAssets: string[],
  isRegistered: (assetId: string) => boolean,
): string | undefined {
  if (row.assetId === 'btc') return 'btc'
  if (importedAssets.includes(row.assetId) || isRegistered(row.assetId)) return row.assetId
  return row.sourceAssetIds?.find((assetId) => importedAssets.includes(assetId) || isRegistered(assetId))
}
