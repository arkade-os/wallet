import { AnimatePresence, motion } from 'framer-motion'
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import AssetAvatar from '../../../components/AssetAvatar'
import Button from '../../../components/Button'
import TokenLogo, { tokenLogoTickerForTicker } from '../../../components/TokenLogo'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer'
import ChevronDownIcon from '../../../icons/ChevronDown'
import InfoIcon from '../../../icons/Info'
import SwapIcon from '../../../icons/Swap'
import { EASE_IN_OUT_QUINT_TUPLE, EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { prettyCurrencyAssetAmount } from '../../../lib/format'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

export interface SwapAsset {
  assetId: string
  name: string
  ticker: string
  precision: number
  balance: bigint
  icon?: string
}

const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back']
const rateNote = 'Rates are dynamic and may update before you confirm.'
const rateNoteAutoDismissMs = 2400

function formatAssetBalance(asset: SwapAsset): string {
  return `${prettyCurrencyAssetAmount(asset.balance, asset.precision, asset.ticker)} ${asset.ticker}`
}

export function filterAssets(assets: SwapAsset[], query: string): SwapAsset[] {
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
  search,
  assets,
  onSearch,
  onSelect,
}: {
  title: string
  subtitle: string
  search: string
  assets: SwapAsset[]
  onSearch: (value: string) => void
  onSelect: (asset: SwapAsset) => void
}) {
  const prefersReduced = useReducedMotion()

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
          value={search}
          placeholder='Search assets'
          autoComplete='off'
          spellCheck={false}
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      <div className='swap-token-list swap-token-list--page'>
        {assets.length === 0 ? (
          <div className='swap-empty-state'>No assets match this search</div>
        ) : (
          assets.map((asset, index) => (
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

export function SwapComposer({
  amount,
  fromAsset,
  toAsset,
  receiveAmount,
  onOpenReceiveDrawer,
  onSwapSides,
  validationMessage,
  invalidPulse,
  quoteLoading,
  swapTurn,
}: {
  amount: string
  fromAsset: SwapAsset
  toAsset?: SwapAsset
  receiveAmount: string
  onOpenReceiveDrawer: () => void
  onSwapSides: () => void
  validationMessage: string
  invalidPulse: number
  quoteLoading: boolean
  swapTurn: number
}) {
  const prefersReduced = useReducedMotion()
  const amountLabel = `${amount} ${fromAsset.ticker}`

  return (
    <div className='swap-composer'>
      <div className='swap-input-card'>
        <div className='swap-input-card__asset'>
          <TokenAvatar asset={fromAsset} size={36} />
          <div className='swap-input-card__asset-copy'>
            <span>{fromAsset.name}</span>
            <small>{formatAssetBalance(fromAsset)}</small>
          </div>
        </div>
        <div className='swap-amount-stack'>
          <motion.div
            key={invalidPulse}
            className={validationMessage ? 'swap-amount-display swap-amount-display--invalid' : 'swap-amount-display'}
            aria-label='Swap amount'
            animate={prefersReduced || !validationMessage ? undefined : { x: [0, -7, 6, -4, 2, 0] }}
            transition={
              prefersReduced || !validationMessage ? undefined : { duration: 0.32, ease: EASE_OUT_QUINT_TUPLE }
            }
          >
            <AnimatedAmountValue value={amountLabel} reducedMotion={prefersReduced} />
          </motion.div>
          <AnimatePresence initial={false}>
            {validationMessage ? (
              <motion.p
                key={validationMessage}
                className='swap-input-error'
                initial={prefersReduced ? false : { opacity: 0, y: 4, scale: 0.96 }}
                animate={prefersReduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: prefersReduced ? 0 : 0.16, ease: EASE_OUT_QUINT_TUPLE }}
              >
                {validationMessage}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <motion.button
        type='button'
        className='swap-flip-button'
        aria-label='Switch swap direction'
        animate={{ rotate: swapTurn * 180 }}
        transition={{ duration: 0.22, ease: EASE_IN_OUT_QUINT_TUPLE }}
        disabled={!toAsset}
        onClick={onSwapSides}
      >
        <SwapIcon />
      </motion.button>

      <button type='button' className='swap-receive-card' onClick={onOpenReceiveDrawer}>
        {toAsset ? (
          <>
            <TokenAvatar asset={toAsset} size={36} />
            <div>
              <span>Receive {toAsset.ticker}</span>
              <small>{quoteLoading ? <SwapSkeletonText width='5.75rem' /> : receiveAmount}</small>
            </div>
            <ChevronDownIcon />
          </>
        ) : (
          <>
            <span className='swap-receive-card__empty'>+</span>
            <div>
              <span>Receive</span>
              <small>Choose asset</small>
            </div>
            <ChevronDownIcon />
          </>
        )}
      </button>
    </div>
  )
}

function SwapSkeletonText({ width }: { width: string }) {
  return <span className='swap-skeleton-text' style={{ width }} aria-hidden='true' />
}

// ponytail: single crossfade instead of 727's per-character animation rig
function AnimatedAmountValue({ value, reducedMotion }: { value: string; reducedMotion: boolean }) {
  return (
    <span className='swap-amount-value' aria-label={value}>
      <AnimatePresence mode='popLayout' initial={false}>
        <motion.span
          key={value}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -7 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.16, ease: EASE_OUT_QUINT_TUPLE }}
          aria-hidden='true'
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
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
  const tokenLogoTicker = tokenLogoTickerForTicker(asset.assetId === 'btc' ? 'BTC' : asset.ticker)
  // always wrapped: the bare AssetAvatar div would catch flex rules like
  // .swap-receive-card > div { flex: 1 } and stretch
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

export function Keypad({ amount, onPress }: { amount: string; onPress: (key: string) => void }) {
  return (
    <motion.div
      className='swap-keypad-shell'
      aria-label={`Swap keypad for ${amount || '0'}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE_OUT_QUINT_TUPLE }}
    >
      <div className='swap-keypad'>
        {keypadKeys.map((key) => (
          <button
            key={key}
            type='button'
            onClick={() => onPress(key)}
            aria-label={key === 'Back' ? 'Delete digit' : key}
          >
            {key === 'Back' ? '<' : key}
          </button>
        ))}
      </div>
    </motion.div>
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
              <MetricRow label='Fee' value={review.feeLabel} loading={quoteLoading} />
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2, ease: EASE_OUT_QUINT_TUPLE }}
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
      <span>{loading ? <SwapSkeletonText width='7rem' /> : value}</span>
    </div>
  )
}
