import { useContext } from 'react'
import AssetCard from '../../components/AssetCard'
import { usePortfolioFiat, type PortfolioRow } from '../../hooks/usePortfolioFiat'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { NavigationContext, Pages } from '../../providers/navigation'
import { prettyFiatAmount } from '../../lib/format'
import { FlowContext } from '../../providers/flow'
import { WalletContext } from '../../providers/wallet'

export default function AssetsSection() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { isVerifiedAsset } = useContext(WalletContext)

  const { rows } = usePortfolioFiat()
  // unverified assets are spoofable, so they live in the Digital Assets basket
  // section instead of posing as accounts
  const accountRows = rows.filter((row) => row.assetId === 'btc' || isVerifiedAsset(row.assetId))

  const fiatLabel = (amount: number) => {
    const decimals = fiatDecimals()
    return prettyFiatAmount(amount, config.currency, {
      bitcoinUnit: config.unit,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })
  }

  const handleAssetClick = (row: PortfolioRow) => {
    if (row.assetId === 'btc') {
      navigate(Pages.BitcoinDetail)
    } else if (row.fiatCurrency) {
      setAssetInfo({ assetId: row.assetId, supply: BigInt(0) })
      navigate(Pages.AccountDetail)
    } else {
      setAssetInfo({ assetId: row.assetId, supply: BigInt(0) })
      navigate(Pages.AppAssetDetail)
    }
  }

  return (
    <section className='home-section'>
      <div className='flex w-full items-center justify-between px-1'>
        <span className='home-section-label'>Accounts</span>
      </div>
      <div className='home-section__content'>
        {accountRows.map((row) => (
          <AssetCard
            key={row.assetId}
            assetId={row.assetId === 'btc' ? '' : row.assetId}
            name={row.name}
            ticker={row.ticker}
            icon={row.icon}
            decimals={row.decimals}
            balance={row.balance}
            fiatText={row.hasFiatPrice ? fiatLabel(row.fiatAmount) : undefined}
            onClick={() => handleAssetClick(row)}
          />
        ))}
      </div>
    </section>
  )
}
