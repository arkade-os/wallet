import { useContext, useEffect, useState } from 'react'
import { BTC_ASSET_ID } from '@arkade-os/swap'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import Button from '../../../components/Button'
import LoadingLogo from '../../../components/LoadingLogo'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { OrderBookContext } from '../../../providers/orderBook'
import { baseOf, displayPrice, pairKeyOf, quoteOf, ratioToNumber } from '../../../lib/book/types'
import { consoleError } from '../../../lib/logs'
import { truncatedAssetId } from '../../../lib/assets'
import { hapticLight } from '../../../lib/haptics'
import { SettingsIconLight } from '../../../icons/Settings'
import { EmptyAssetsList } from '../../../components/Empty'
import { AspContext } from '../../../providers/asp'
import AssetAvatar from '../../../components/AssetAvatar'
import AssetCard from '../../../components/AssetCard'

interface AssetListItem {
  assetId: string
  balance: bigint
  name?: string
  ticker?: string
  icon?: string
  decimals?: number
}

// prices are read at a glance, so they get significant digits rather than fixed
// ones: a 4-sat market and a 4M-sat market both stay one short number.
const priceFmt = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 })
const pctFmt = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 2 })

export default function AppAssets() {
  const { goBack, navigate } = useContext(NavigationContext)
  const { assetBalances, balance, svcWallet, assetMetadataCache, setCacheEntry } = useContext(WalletContext)
  const { config } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { aspInfo } = useContext(AspContext)
  const { pairs, bookFor, ready } = useContext(OrderBookContext)

  const [assets, setAssets] = useState<AssetListItem[]>([])
  const [loading, setLoading] = useState(true)

  // depend on the pair identities, not the array: the provider rebuilds `pairs`
  // as the tx stream moves, and an identity dep would re-run this on every tick.
  const pairsKey = pairs.map((p) => p.pairKey).join(',')

  useEffect(() => {
    const loadAssets = async () => {
      if (!svcWallet) {
        setLoading(false)
        return
      }

      const allIds = new Set<string>()
      for (const ab of assetBalances) allIds.add(ab.assetId)
      for (const id of config.importedAssets) allIds.add(id)
      // a market list that only shows your own bags is not a market list. `pairs`
      // is busiest-first and a Set keeps insertion order, so appending here is the
      // whole sort: what you hold, then everything else by activity.
      // ponytail: BTC-quoted pairs only — the rows price in sats. Asset/asset
      // books get a row when there is a second quote unit to render.
      for (const { pairKey } of pairs) {
        if (quoteOf(pairKey) === BTC_ASSET_ID) allIds.add(baseOf(pairKey))
      }

      const missingIds = [...allIds].filter((id) => !assetMetadataCache.get(id))
      const results = await Promise.allSettled(missingIds.map((id) => svcWallet.assetManager.getAssetDetails(id)))
      for (let i = 0; i < missingIds.length; i++) {
        const r = results[i]
        if (r.status === 'fulfilled' && r.value) {
          setCacheEntry(missingIds[i], r.value)
        } else if (r.status === 'rejected') {
          consoleError(r.reason, `error fetching metadata for ${missingIds[i]}`)
        }
      }

      const items: AssetListItem[] = [...allIds].map((assetId) => {
        const bal = assetBalances.find((a) => a.assetId === assetId)
        const meta = assetMetadataCache.get(assetId)
        return {
          assetId,
          balance: bal?.amount ?? BigInt(0),
          name: meta?.metadata?.name,
          ticker: meta?.metadata?.ticker,
          icon: meta?.metadata?.icon,
          decimals: meta?.metadata?.decimals ?? 8,
        }
      })

      setAssets(items)
      setLoading(false)
    }

    loadAssets()
  }, [svcWallet, assetBalances, config.importedAssets, pairsKey])

  const handleAssetClick = (assetId: string) => {
    setAssetInfo({ assetId, supply: BigInt(0) })
    navigate(Pages.AppAssetDetail)
  }

  // Only a BTC-quoted pair prices in sats; anything else is skipped rather than
  // mispriced. Before `ready` there is no book to speak for, so the grid is
  // empty instead of asserting a market has none.
  // ponytail: metadata comes from `assets`, which the effect above fills for
  // every market id. A pair that lands a tick before its metadata renders with
  // an id for a ticker rather than waiting for a second pass.
  const byId = new Map(assets.map((a) => [a.assetId, a]))
  const marketIds = ready ? pairs.filter((p) => quoteOf(p.pairKey) === BTC_ASSET_ID).map((p) => baseOf(p.pairKey)) : []
  const inMarket = new Set(marketIds)
  const held = assets.filter((a) => !inMarket.has(a.assetId))

  /**
   * One market tile: who, at what price, and how wide the book is around it.
   * Priced in sats per whole unit — the book's own unit, and the only one that
   * keeps a token price a readable number. Nothing else is shown because
   * nothing else (FDV, volume, age) is derivable from resting covenants.
   */
  const marketCard = (assetId: string) => {
    const meta = byId.get(assetId)
    const book = bookFor(pairKeyOf(assetId, BTC_ASSET_ID))
    const ask = book.asks[0]
    const bid = book.bids[0]
    const top = ask ?? bid
    const spreadPct = ask && book.spread ? (ratioToNumber(book.spread) / ratioToNumber(ask.price)) * 100 : undefined
    const note = !top
      ? 'no orders'
      : !ask
        ? 'bid only'
        : spreadPct !== undefined
          ? `${pctFmt.format(spreadPct)}% spread`
          : bid
            ? 'crossed'
            : 'no bids'

    const open = () => {
      hapticLight()
      handleAssetClick(assetId)
    }

    return (
      <div
        key={assetId}
        role='button'
        tabIndex={0}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          open()
        }}
        data-testid={`market-card-${assetId}`}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className='flex cursor-pointer flex-col gap-2 rounded-lg bg-bg p-3 shadow-sm transition-transform duration-150 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700'
      >
        <AssetAvatar icon={meta?.icon} name={meta?.name} ticker={meta?.ticker} size={40} />
        <span className='truncate text-sm font-medium'>
          {meta?.ticker || meta?.name || truncatedAssetId(assetId) || 'asset'}
        </span>
        <span className='truncate text-lg font-semibold'>
          {top ? priceFmt.format(displayPrice(top.price, meta?.decimals ?? 8, 0)) : '—'}
          <span className='ml-1 text-xs font-normal text-neutral-500'>sats</span>
        </span>
        <span className='truncate text-xs text-neutral-500'>{note}</span>
      </div>
    )
  }

  if (loading) return <LoadingLogo text='Loading markets...' />

  const goToSettings = () => navigate(Pages.AppAssetsSettings)

  return (
    <>
      <Header text='Arkade Mint' back={goBack} auxFunc={goToSettings} auxIcon={<SettingsIconLight />} />
      <Content>
        <Padded>
          {config.apps.assets.enabled ? (
            <FlexCol gap='1.25rem' className='scroll-fade'>
              {marketIds.length === 0 && held.length === 0 ? <EmptyAssetsList /> : null}

              {marketIds.length > 0 ? (
                <FlexCol gap='0.5rem'>
                  <Text color='neutral-500' smaller>
                    markets
                  </Text>
                  <div className='grid w-full grid-cols-2 gap-3'>{marketIds.map(marketCard)}</div>
                </FlexCol>
              ) : null}

              {/* What you hold that nobody has quoted. Without this an asset with
                  no resting order would be unreachable from its own app. */}
              {held.length > 0 ? (
                <FlexCol gap='0.5rem'>
                  {marketIds.length > 0 ? (
                    <Text color='neutral-500' smaller>
                      your assets
                    </Text>
                  ) : null}
                  {held.map((asset) => (
                    <AssetCard
                      key={asset.assetId}
                      assetId={asset.assetId}
                      balance={asset.balance}
                      name={asset.name}
                      ticker={asset.ticker}
                      icon={asset.icon}
                      decimals={asset.decimals}
                      onClick={() => handleAssetClick(asset.assetId)}
                    />
                  ))}
                </FlexCol>
              ) : null}
            </FlexCol>
          ) : (
            <FlexCol gap='0.5rem'>
              <Text color='neutral-500'>Arkade Mint is disabled.</Text>
              <Text color='neutral-500'>
                <a onClick={goToSettings}>Enable it</a> to view your assets.
              </Text>
            </FlexCol>
          )}
        </Padded>
      </Content>
      {config.apps.assets.enabled ? (
        <ButtonsOnBottom>
          <Button label='Import' onClick={() => navigate(Pages.AppAssetImport)} />
          <Button
            label='Mint'
            onClick={() => navigate(Pages.AppAssetMint)}
            disabled={balance < aspInfo.dust}
            secondary
          />
        </ButtonsOnBottom>
      ) : null}
    </>
  )
}
