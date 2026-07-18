import { useContext, useState } from 'react'
import AssetCard from '../../components/AssetCard'
import AssetAvatar from '../../components/AssetAvatar'
import ChevronDownIcon from '../../icons/ChevronDown'
import ChevronUpIcon from '../../icons/ChevronUp'
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
  const [otherAssetsOpen, setOtherAssetsOpen] = useState(false)

  const { rows } = usePortfolioFiat()
  const accountRows = rows.filter((row) => row.assetId === 'btc' || isVerifiedAsset(row.assetId))
  // unverified assets are spoofable, so they share one basket row instead of
  // presenting themselves as accounts
  const otherRows = rows.filter((row) => row.assetId !== 'btc' && !isVerifiedAsset(row.assetId))

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

  const assetCard = (row: PortfolioRow) => (
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
  )

  const toggleOtherAssets = () => setOtherAssetsOpen((open) => !open)

  return (
    <section className='home-section'>
      <div className='flex w-full items-center justify-between px-1'>
        <span className='home-section-label'>Accounts</span>
      </div>
      <div className='home-section__content'>
        {accountRows.map(assetCard)}
        {otherRows.length > 0 ? (
          <>
            <div
              role='button'
              tabIndex={0}
              aria-expanded={otherAssetsOpen}
              onClick={toggleOtherAssets}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                toggleOtherAssets()
              }}
              data-testid='asset-row-other-assets'
              className='asset-card asset-card--interactive'
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <div className='asset-card__identity'>
                <AssetAvatar ticker='?' name='Other assets' size={36} />
                <div className='asset-card__copy'>
                  <span className='asset-card__name'>Other assets</span>
                  <span className='asset-card__balance'>
                    {otherRows.length} unverified {otherRows.length === 1 ? 'asset' : 'assets'}
                  </span>
                </div>
              </div>
              <div className='asset-card__value' aria-hidden='true'>
                {otherAssetsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </div>
            </div>
            {otherAssetsOpen ? otherRows.map(assetCard) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
