import { useContext, useEffect, useState } from 'react'
import { BTC_ASSET_ID } from '@arkade-os/swap'
import BookDepth from '../../../components/BookDepth'
import BookLadder from '../../../components/BookLadder'
import TradeSheet from '../../../components/TradeSheet'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import LoadingLogo from '../../../components/LoadingLogo'
import Padded from '../../../components/Padded'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible'
import Text, { TextSecondary } from '../../../components/Text'
import AssetAvatar from '../../../components/AssetAvatar'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import type { AssetDetails } from '@arkade-os/sdk'
import { prettyAssetAmount } from '../../../lib/assets'
import { prettyNumber } from '../../../lib/format'
import { BackupContext } from '@/providers/backup'
import { AspContext } from '../../../providers/asp'
import { OrderBookContext } from '../../../providers/orderBook'
import { displayPrice, pairKeyOf, type BookRow } from '../../../lib/book'
import { extractError } from '../../../lib/error'
import { toast } from '../../../components/Toast'

export default function AppAssetDetail() {
  const { config } = useContext(ConfigContext)
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { navigate, replace } = useContext(NavigationContext)
  const { assetInfo, setAssetInfo, setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { assetBalances, availableBalance, svcWallet, assetMetadataCache, setCacheEntry, iconApprovalManager } =
    useContext(WalletContext)
  const { aspInfo } = useContext(AspContext)
  const { bookFor, ready: bookReady, takeable, place, take, pull } = useContext(OrderBookContext)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>()

  const cachedEntry = assetMetadataCache.get(assetInfo.assetId)
  const hasIcon = cachedEntry?.hasIcon ?? false

  const balance = assetBalances.find((a) => a.assetId === assetInfo.assetId)?.amount ?? BigInt(0)

  const fetchDetails = async (forceRefresh = false) => {
    if (!svcWallet || !assetInfo.assetId) return

    let cached: AssetDetails | undefined = forceRefresh ? undefined : assetMetadataCache.get(assetInfo.assetId)
    if (!cached) {
      try {
        const fetched = await svcWallet.assetManager.getAssetDetails(assetInfo.assetId)
        if (fetched) {
          cached = setCacheEntry(assetInfo.assetId, fetched)
        }
      } catch (err) {
        consoleError(err, 'error loading asset details')
      }
    }

    if (!cached) return
    setAssetInfo(cached)
  }

  useEffect(() => {
    fetchDetails().then(() => setLoading(false))
  }, [svcWallet, assetInfo.assetId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDetails(true)
    setRefreshing(false)
  }

  if (loading) return <LoadingLogo text='Loading asset...' />

  const meta = assetInfo.metadata
  const name = meta?.name ?? 'Unknown Asset'
  const ticker = meta?.ticker ?? ''
  const title = ticker || name
  const decimals = meta?.decimals ?? 8
  const supply = assetInfo.supply
  const controlAssetId = assetInfo.controlAssetId
  const truncateId = (id: string) => `${id.slice(0, 12)}...${id.slice(-12)}`

  // Check if user holds control asset
  const holdsControlAsset = controlAssetId
    ? assetBalances.some((a) => a.assetId === controlAssetId && a.amount > 0)
    : false

  const isImported = config.importedAssets.includes(assetInfo.assetId)
  const canRemove = isImported && balance === BigInt(0)

  // This asset priced in sats. Both directions of the market group under one
  // key, so a bid and an ask on the same asset land in the same book.
  const pairKey = pairKeyOf(assetInfo.assetId, BTC_ASSET_ID)
  const book = bookFor(pairKey)
  // what a taker would pay right now — the prefill a composer opens on
  const bestAsk = book.asks[0] ? displayPrice(book.asks[0].price, decimals, 0) : undefined
  const bestBid = book.bids[0] ? displayPrice(book.bids[0].price, decimals, 0) : undefined

  const handleTake = async (row: BookRow) => {
    try {
      await take(row.id)
    } catch (err) {
      // a fill racing a pull is normal: the row is gone, nothing broke
      toast.error(extractError(err))
    }
  }

  const handlePull = async (row: BookRow) => {
    try {
      await pull(row.id)
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  const openTrade = (side: 'buy' | 'sell') => setTradeSide(side)

  const handleTrade = async (params: Parameters<typeof place>[0]) => {
    await place(params)
    setTradeSide(undefined)
  }

  const handleSend = () => {
    setSendInfo({ ...emptySendInfo, assets: [{ assetId: assetInfo.assetId, amount: BigInt(0) }] })
    navigate(Pages.SendForm)
  }

  const handleReceive = () => {
    setRecvInfo({ ...emptyRecvInfo, assetId: assetInfo.assetId })
    navigate(Pages.ReceiveQRCode)
  }

  const handleReissue = () => {
    navigate(Pages.AppAssetReissue)
  }

  const handleBurn = () => {
    navigate(Pages.AppAssetBurn)
  }

  const handleRemove = () => {
    const updated = config.importedAssets.filter((id) => id !== assetInfo.assetId)
    backupAndUpdateConfig({ ...config, importedAssets: updated })
    replace(Pages.AppAssets, [Pages.Settings, Pages.Settings])
  }

  return (
    <>
      <Header text={title} back />
      <Content>
        <Padded>
          <FlexCol gap='1rem' centered>
            <AssetAvatar icon={meta?.icon} ticker={ticker} name={name} size={64} />

            <FlexCol gap='0.25rem' centered>
              <Text bigger bold centered>
                {prettyAssetAmount(balance, decimals)} {ticker}
              </Text>
              <TextSecondary centered>{name}</TextSecondary>
            </FlexCol>

            {/* The market at a glance, two across — only figures the chain
                actually reports. No FDV, volume or holder count: none of the
                three is derivable here, and a plausible-looking wrong number
                is worse than an absent one. */}
            <div className='grid w-full grid-cols-2 gap-x-4 gap-y-3'>
              <Stat label='Price' value={bestAsk ? `${prettyNumber(bestAsk)} sats` : '—'} />
              <Stat
                label='Spread'
                value={
                  bestAsk && bestBid ? `${prettyNumber(bestAsk - bestBid)} sats` : book.asks.length ? '—' : 'no book'
                }
              />
              <Stat label='Best bid' value={bestBid ? `${prettyNumber(bestBid)} sats` : '—'} />
              <Stat label='Supply' value={prettyAssetAmount(supply, decimals) ?? 'Unknown'} />
            </div>

            <BookDepth book={book} baseTicker={ticker || 'units'} baseDecimals={decimals} />

            <BookLadder
              book={book}
              baseTicker={ticker || 'units'}
              baseDecimals={decimals}
              takeable={takeable}
              takeDisabledReason='buying needs an emulator endpoint — selling and cancelling still work'
              onTake={handleTake}
              onPull={handlePull}
              loading={!bookReady}
            />

            {/* Everything that is not the market, folded away. Name, ticker and
                supply are deliberately absent: the header, the subtitle and the
                stat grid already carry them, and printing a figure twice on one
                screen is what made this page feel crowded. */}
            <Collapsible className='w-full'>
              <CollapsibleTrigger className='flex w-full items-center justify-between py-3'>
                <TextSecondary>Details</TextSecondary>
                <TextSecondary>{'\u2304'}</TextSecondary>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <FlexCol gap='0.5rem'>
                  <FlexRow between>
                    <TextSecondary>Asset ID</TextSecondary>
                    <FlexRow gap='0.25rem' end>
                      <Text copy={assetInfo.assetId} bold>
                        {truncateId(assetInfo.assetId)}
                      </Text>
                      <span
                        onClick={handleRefresh}
                        style={{
                          cursor: 'pointer',
                          fontSize: 13,
                          color: 'var(--neutral-500)',
                          opacity: refreshing ? 0.5 : 1,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        {refreshing ? '...' : '\u21BB'}
                      </span>
                    </FlexRow>
                  </FlexRow>
                  <FlexRow between>
                    <TextSecondary>Decimals</TextSecondary>
                    <Text bold>{decimals}</Text>
                  </FlexRow>
                  {controlAssetId ? (
                    <FlexRow between>
                      <TextSecondary>Control Asset</TextSecondary>
                      <FlexRow gap='0.25rem' end>
                        {(() => {
                          const ctrl = assetMetadataCache.get(controlAssetId)?.metadata
                          const ctrlName = ctrl?.name ?? `${controlAssetId.slice(0, 8)}...${controlAssetId.slice(-8)}`
                          const label = ctrl?.ticker ? `${ctrlName} (${ctrl.ticker})` : ctrlName
                          return (
                            <>
                              <AssetAvatar
                                icon={ctrl?.icon}
                                ticker={ctrl?.ticker}
                                size={20}
                                assetId={controlAssetId}
                                clickable
                              />
                              <Text bold copy={controlAssetId}>
                                {label}
                              </Text>
                            </>
                          )
                        })()}
                      </FlexRow>
                    </FlexRow>
                  ) : null}
                  {hasIcon && !iconApprovalManager.isVerified(assetInfo.assetId) ? (
                    <Button
                      label={iconApprovalManager.isApproved(assetInfo.assetId) ? 'Hide icon' : 'Show icon'}
                      onClick={async () => {
                        if (iconApprovalManager.isApproved(assetInfo.assetId)) {
                          iconApprovalManager.revoke(assetInfo.assetId)
                        } else {
                          iconApprovalManager.approve(assetInfo.assetId)
                        }
                        await fetchDetails(true)
                      }}
                      secondary
                    />
                  ) : null}
                </FlexCol>
              </CollapsibleContent>
            </Collapsible>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {/* Buy and Sell lead: this is a market screen first and a holding
            screen second. Send/Receive keep their place below rather than
            competing for the primary slot. */}
        <FlexRow gap='0.75rem'>
          <Button label='Buy' onClick={() => openTrade('buy')} />
          <Button label='Sell' onClick={() => openTrade('sell')} disabled={balance === BigInt(0)} secondary />
        </FlexRow>
        <FlexRow gap='0.75rem'>
          <Button label='Send' onClick={handleSend} disabled={balance === BigInt(0)} secondary />
          <Button label='Receive' onClick={handleReceive} secondary />
        </FlexRow>
        {holdsControlAsset || balance > 0 ? (
          <FlexRow gap='0.75rem'>
            {holdsControlAsset ? <Button label='Reissue' onClick={handleReissue} secondary /> : null}
            {balance > 0 ? <Button label='Burn' onClick={handleBurn} secondary /> : null}
          </FlexRow>
        ) : null}
        {canRemove ? <Button label='Remove' onClick={handleRemove} secondary /> : null}
      </ButtonsOnBottom>
      <TradeSheet
        isOpen={tradeSide !== undefined}
        onClose={() => setTradeSide(undefined)}
        initialSide={tradeSide ?? 'buy'}
        baseTicker={ticker || 'units'}
        baseAssetId={assetInfo.assetId}
        baseDecimals={decimals}
        satsBalance={BigInt(availableBalance)}
        assetBalance={balance}
        bestAskPrice={bestAsk}
        bestBidPrice={bestBid}
        dust={BigInt(aspInfo.dust)}
        onSubmit={handleTrade}
      />
    </>
  )
}

/** One figure in the market grid. Label above, value below — the shape every
 * exchange uses, and the reason two of them read as a comparison. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <FlexCol gap='0.125rem'>
      <TextSecondary smaller>{label}</TextSecondary>
      <Text bold>{value}</Text>
    </FlexCol>
  )
}
