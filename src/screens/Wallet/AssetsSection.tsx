import { useContext } from 'react'
import AssetCard from '../../components/AssetCard'
import { usePortfolioFiat, type PortfolioRow } from '../../hooks/usePortfolioFiat'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { NavigationContext, Pages } from '../../providers/navigation'
import { prettyFiatAmount } from '../../lib/format'
import { FlowContext } from '../../providers/flow'
import { WalletContext } from '../../providers/wallet'
import { useTranslation } from '../../providers/language'
import { AspContext } from '../../providers/asp'
import { rawAssetPresentation, verifiedDesignatedCurrency } from '../../lib/accountAssets'
import { assetVisibleOnHome, normalizeAssetId, trackedAssetIds } from '../../lib/assetLibrary'
import { truncatedAssetId } from '../../lib/assets'

export default function AssetsSection() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { aspInfo } = useContext(AspContext)
  const { assetMetadataCache, booting, dataReady, isVerifiedAsset } = useContext(WalletContext)
  const { t } = useTranslation()

  const { rows } = usePortfolioFiat()
  const accountRows = rows.filter(
    (row) =>
      row.assetId === 'btc' ||
      assetVisibleOnHome(row.assetId, row.balance > 0, isVerifiedAsset(row.assetId), config.homeAssetVisibility),
  )
  const ownedIds = new Set(rows.map((row) => normalizeAssetId(row.assetId)))
  for (const assetId of trackedAssetIds(config.importedAssets)) {
    if (
      ownedIds.has(assetId) ||
      !assetVisibleOnHome(assetId, false, isVerifiedAsset(assetId), config.homeAssetVisibility)
    ) {
      continue
    }
    const meta = assetMetadataCache.get(assetId)?.metadata
    const fiatCurrency = verifiedDesignatedCurrency(aspInfo.network, assetId, isVerifiedAsset)
    const presentation = rawAssetPresentation(meta, truncatedAssetId(assetId) || t('mint.unknownAsset'))
    accountRows.push({
      assetId,
      ...presentation,
      name: fiatCurrency ?? presentation.name,
      ticker: fiatCurrency ?? presentation.ticker,
      fiatCurrency,
      decimals: meta?.decimals ?? 0,
      balance: 0n,
      spendableBalance: 0n,
      fiatAmount: 0,
      satsEquivalent: 0,
      hasFiatPrice: false,
    })
  }

  const fiatLabel = (amount: number) => {
    const decimals = fiatDecimals()
    return prettyFiatAmount(amount, config.currency, {
      bitcoinUnit: config.unit,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })
  }

  const handleAssetClick = (row: PortfolioRow) => {
    if (Boolean(booting) && !dataReady) return
    if (row.assetId === 'btc') {
      navigate(Pages.BitcoinDetail)
    } else if (row.fiatCurrency && row.balance > 0) {
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
        <span className='home-section-label'>{t('wallet.accounts')}</span>
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
