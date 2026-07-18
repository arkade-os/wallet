import { useContext, useState } from 'react'
import AssetCard from '../../components/AssetCard'
import AssetAvatar from '../../components/AssetAvatar'
import ChevronDownIcon from '../../icons/ChevronDown'
import ChevronUpIcon from '../../icons/ChevronUp'
import { usePortfolioFiat, type PortfolioRow } from '../../hooks/usePortfolioFiat'
import { NavigationContext, Pages } from '../../providers/navigation'
import { FlowContext } from '../../providers/flow'
import { WalletContext } from '../../providers/wallet'

/** Basket for unverified assets: they are spoofable, so they share one
 * expandable row below the activity feed instead of posing as accounts. */
export default function OtherAssetsSection() {
  const { setAssetInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { isVerifiedAsset } = useContext(WalletContext)
  const [open, setOpen] = useState(false)

  const { rows } = usePortfolioFiat()
  const otherRows = rows.filter((row) => row.assetId !== 'btc' && !isVerifiedAsset(row.assetId))
  if (otherRows.length === 0) return null

  const handleAssetClick = (row: PortfolioRow) => {
    setAssetInfo({ assetId: row.assetId, supply: BigInt(0) })
    navigate(Pages.AppAssetDetail)
  }

  const toggle = () => setOpen((wasOpen) => !wasOpen)

  return (
    <section className='home-section'>
      <div className='home-section__content'>
        <div
          role='button'
          tabIndex={0}
          aria-expanded={open}
          onClick={toggle}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            toggle()
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
            {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </div>
        </div>
        {open
          ? otherRows.map((row) => (
              <AssetCard
                key={row.assetId}
                assetId={row.assetId}
                name={row.name}
                ticker={row.ticker}
                icon={row.icon}
                decimals={row.decimals}
                balance={row.balance}
                onClick={() => handleAssetClick(row)}
              />
            ))
          : null}
      </div>
    </section>
  )
}
