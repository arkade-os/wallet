import { AnimatePresence, motion } from 'framer-motion'
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import AssetAvatar from '../../../components/AssetAvatar'
import Button from '../../../components/Button'
import TokenLogo, { tokenLogoTickerForTicker } from '../../../components/TokenLogo'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer'
import InfoIcon from '../../../icons/Info'
import SwapIcon from '../../../icons/Swap'
import { EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { prettyCurrencyAssetAmount } from '../../../lib/format'
import { BTC_ASSET_ID } from '../../../lib/swap/markets'
import { AssetOption } from '../../../lib/types'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import FlexRow from '../../../components/FlexRow'
import FlexCol from '../../../components/FlexCol'
import Text, { TextSecondary } from '../../../components/Text'

/** The wallet-wide asset row shape; the swap screens add nothing to it. */
export type SwapAsset = AssetOption

const rateNote = 'Rates are dynamic and may update before you confirm.'
const rateNoteAutoDismissMs = 2400

function formatAssetBalance(asset: SwapAsset): string {
  return `${prettyCurrencyAssetAmount(asset.balance, asset.decimals, asset.ticker)} ${asset.ticker}`
}

function filterAssets(assets: SwapAsset[], query: string): SwapAsset[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return assets
  return assets.filter((asset) => {
    return asset.name.toLowerCase().includes(normalized) || asset.ticker.toLowerCase().includes(normalized)
  })
}

export function SwapUnavailableState() {
  return (
    <div className='swap-unavailable-state'>
      <span className='swap-unavailable-state__icon'>
        <SwapIcon />
      </span>
      <div>
        <p>Swaps are unavailable</p>
        <span>No swap markets are available on this network yet.</span>
      </div>
    </div>
  )
}

export function SwapAssetList({
  title,
  subtitle,
  assets,
  onSelect,
}: {
  title: string
  subtitle: string
  assets: SwapAsset[]
  onSelect: (asset: SwapAsset) => void
}) {
  const prefersReduced = useReducedMotion()
  const [query, setQuery] = useState('')
  const filteredAssets = useMemo(() => filterAssets(assets, query), [assets, query])

  return (
    <div className='swap-asset-list-panel'>
      <div className='swap-step-heading'>
        <p>{title}</p>
        <span>{subtitle}</span>
      </div>
      <label className='swap-search-field'>
        <span>Search assets</span>
        <input
          type='search'
          value={query}
          placeholder='Search assets'
          autoComplete='off'
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className='swap-token-list swap-token-list--page'>
        {filteredAssets.length === 0 ? (
          <div className='swap-empty-state'>No assets match this search</div>
        ) : (
          filteredAssets.map((asset, index) => (
            <motion.div
              key={asset.assetId}
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                prefersReduced ? { duration: 0 } : { duration: 0.22, delay: index * 0.035, ease: EASE_OUT_QUINT_TUPLE }
              }
            >
              <SwapAssetRow asset={asset} onClick={() => onSelect(asset)} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

function SwapSkeletonText() {
  return <span className='swap-skeleton-text' style={{ width: '7rem' }} aria-hidden='true' />
}

function SwapAssetRow({ asset, active, onClick }: { asset: SwapAsset; active?: boolean; onClick: () => void }) {
  return (
    <button
      type='button'
      className={active ? 'swap-token-row swap-token-row--active' : 'swap-token-row'}
      onClick={onClick}
    >
      <TokenAvatar asset={asset} size={40} />
      <span className='swap-token-row__copy'>
        <span>{asset.name}</span>
        <small>{formatAssetBalance(asset)}</small>
      </span>
    </button>
  )
}

function TokenAvatar({ asset, size }: { asset: SwapAsset; size: number }) {
  // the btc row's ticker follows the display unit (sats/₿); the logo must not
  const tokenLogoTicker = tokenLogoTickerForTicker(asset.assetId === BTC_ASSET_ID ? 'BTC' : asset.ticker)
  // wrapped so the avatar keeps a fixed box regardless of the parent's flex rules
  return (
    <span className='swap-token-avatar' style={{ width: size, height: size }}>
      {tokenLogoTicker ? (
        <TokenLogo ticker={tokenLogoTicker} />
      ) : (
        <AssetAvatar icon={asset.icon} name={asset.name} ticker={asset.ticker} size={size} />
      )}
    </span>
  )
}

export function AssetPickerDrawer({
  open,
  assets,
  selectedId,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  assets: SwapAsset[]
  selectedId?: string
  onOpenChange: (open: boolean) => void
  onSelect: (asset: SwapAsset) => void
}) {
  const [query, setQuery] = useState('')
  const filteredAssets = useMemo(() => filterAssets(assets, query), [assets, query])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='swap-drawer-content swap-review-drawer-content'>
        <DrawerHeader className='swap-picker-header'>
          <DrawerTitle>Choose asset to receive</DrawerTitle>
          <DrawerDescription>Pick the asset for this side of the swap.</DrawerDescription>
        </DrawerHeader>
        <div className='swap-drawer-body'>
          <label className='swap-search-field'>
            <span>Search assets</span>
            <input
              type='search'
              value={query}
              placeholder='Search assets'
              autoComplete='off'
              spellCheck={false}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className='swap-token-list'>
            {filteredAssets.map((asset) => (
              <SwapAssetRow
                key={asset.assetId}
                asset={asset}
                active={selectedId === asset.assetId}
                onClick={() => onSelect(asset)}
              />
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export interface ReviewInfo {
  fromAsset: SwapAsset
  toAsset: SwapAsset
  swapAmount: string
  receiveAmount: string
  feeLabel: string
  rateLabel: string
}

export function ReviewDrawer({
  open,
  review,
  canConfirm,
  confirming,
  error,
  quoteLoading,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  review?: ReviewInfo
  canConfirm: boolean
  confirming: boolean
  error: string
  quoteLoading: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const prefersReduced = useReducedMotion()
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='swap-drawer-content'>
        <DrawerHeader className='swap-review-header'>
          <DrawerTitle>Review swap</DrawerTitle>
          <DrawerDescription>Check the route and estimated totals.</DrawerDescription>
        </DrawerHeader>
        {review ? (
          <div className='swap-review-drawer-body'>
            <div className='swap-review-card'>
              <div className='swap-review-hero'>
                <div className='swap-review-avatars'>
                  <TokenAvatar asset={review.fromAsset} size={48} />
                  <TokenAvatar asset={review.toAsset} size={48} />
                </div>
                <div>
                  <span>Swap route</span>
                  <h3 className='text-heading-sm'>
                    {review.fromAsset.ticker} to {review.toAsset.ticker}
                  </h3>
                </div>
              </div>
              <MetricRow label='Swap' value={review.swapAmount} loading={quoteLoading} />
              <MetricRow label='Receive' value={review.receiveAmount} loading={quoteLoading} />
              <MetricRow label='Solver fee' value={review.feeLabel} loading={quoteLoading} />
            </div>
            <div className='swap-detail-card'>
              <MetricRow label={<RateLabel />} value={review.rateLabel} loading={quoteLoading} />
            </div>
          </div>
        ) : null}
        <div className='swap-review-action'>
          <AnimatePresence initial={false}>
            {error ? (
              <motion.p
                className='swap-confirm-error'
                initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: 6 }}
                transition={{ duration: prefersReduced ? 0 : 0.2, ease: EASE_OUT_QUINT_TUPLE }}
              >
                {error}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <Button label='Confirm swap' disabled={!canConfirm || confirming} loading={confirming} onClick={onConfirm} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function RateLabel() {
  const tooltipId = useId()
  const prefersReduced = useReducedMotion()
  const dismissTimer = useRef<number>()
  const [tooltipOpen, setTooltipOpen] = useState(false)

  const clearDismissTimer = useCallback(() => {
    if (!dismissTimer.current) return
    window.clearTimeout(dismissTimer.current)
    dismissTimer.current = undefined
  }, [])

  const showTooltip = useCallback(
    (autoDismiss: boolean) => {
      clearDismissTimer()
      setTooltipOpen(true)
      if (!autoDismiss) return
      dismissTimer.current = window.setTimeout(() => {
        setTooltipOpen(false)
        dismissTimer.current = undefined
      }, rateNoteAutoDismissMs)
    },
    [clearDismissTimer],
  )

  const hideTooltip = useCallback(() => {
    clearDismissTimer()
    setTooltipOpen(false)
  }, [clearDismissTimer])

  useEffect(() => clearDismissTimer, [clearDismissTimer])

  return (
    <div className='swap-rate-label'>
      Rate
      <span className='swap-rate-disclosure'>
        <button
          type='button'
          aria-label={rateNote}
          aria-describedby={tooltipOpen ? tooltipId : undefined}
          title={rateNote}
          className='swap-rate-info'
          onClick={() => showTooltip(true)}
          onBlur={hideTooltip}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') showTooltip(false)
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') hideTooltip()
          }}
        >
          <InfoIcon />
        </button>
        <AnimatePresence>
          {tooltipOpen ? (
            <motion.div
              id={tooltipId}
              role='tooltip'
              className='swap-rate-tooltip'
              initial={prefersReduced ? false : { opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 2, scale: 0.98 }}
              transition={prefersReduced ? { duration: 0 } : { duration: 0.18, ease: EASE_OUT_QUINT_TUPLE }}
            >
              {rateNote}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </span>
    </div>
  )
}

function MetricRow({ label, value, loading }: { label: ReactNode; value: string; loading?: boolean }) {
  return (
    <div className='swap-metric-row'>
      <span>{label}</span>
      <span>{loading ? <SwapSkeletonText /> : value}</span>
    </div>
  )
}

export function AssetWithBalance({ asset }: { asset: SwapAsset }) {
  return (
    <FlexRow gap='0.5rem' centered>
      <TokenAvatar asset={asset} size={36} />
      <FlexCol gap='0'>
        <Text>{asset.name}</Text>
        <TextSecondary small>{formatAssetBalance(asset)}</TextSecondary>
      </FlexCol>
    </FlexRow>
  )
}
