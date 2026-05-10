import { AnimatePresence, motion } from 'framer-motion'
import { useContext, useMemo, useState } from 'react'
import AssetAvatar from '../../../components/AssetAvatar'
import Button from '../../../components/Button'
import Content from '../../../components/Content'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import TokenLogo, { type TokenLogoTicker } from '../../../components/TokenLogo'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer'
import ChevronDownIcon from '../../../icons/ChevronDown'
import SwapIcon from '../../../icons/Swap'
import { centsToUnits } from '../../../lib/assets'
import { EASE_IN_OUT_QUINT_TUPLE, EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { prettyFiatAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticTap } from '../../../lib/haptics'
import { Fiats } from '../../../lib/types'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { usePortfolioFiat, type PortfolioRow } from '../../../hooks/usePortfolioFiat'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

type AssetTarget = 'from' | 'to'
type DrawerState = 'to' | 'review' | null
type SwapStep = 'select-from' | 'compose'
type AmountMode = 'asset' | 'fiat'

interface SwapAsset {
  assetId: string
  name: string
  ticker: string
  decimals: number
  balance: number
  fiatText?: string
  icon?: string
  isBitcoin?: boolean
}

interface SwapQuote {
  fromAsset: SwapAsset
  toAsset?: SwapAsset
  fromAmount: string
  fromFiat: string
  toAmount: string
  toFiat: string
  rateLabel: string
}

const fallbackAsset: SwapAsset = {
  assetId: 'prototype-asset',
  name: 'USDC',
  ticker: 'USDC',
  decimals: 2,
  balance: 0,
  fiatText: '$0.00',
}

const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back']

export default function WalletSwap() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { goBack, navigate } = useContext(NavigationContext)
  const { rows } = usePortfolioFiat()
  const prefersReduced = useReducedMotion()

  const assets = useMemo(() => toSwapAssets(rows, config.fiat, fiatDecimals()), [rows, config.fiat, fiatDecimals])
  const [step, setStep] = useState<SwapStep>('select-from')
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState('1')
  const [amountMode, setAmountMode] = useState<AmountMode>('fiat')
  const [fromAssetId, setFromAssetId] = useState(assets[0]?.assetId ?? 'btc')
  const [toAssetId, setToAssetId] = useState<string | undefined>(
    assets.find((asset) => asset.assetId !== (assets[0]?.assetId ?? 'btc'))?.assetId,
  )
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [swapTurn, setSwapTurn] = useState(0)

  const fromAsset = assets.find((asset) => asset.assetId === fromAssetId) ?? assets[0] ?? fallbackAsset
  const toAsset =
    assets.find((asset) => asset.assetId === toAssetId && asset.assetId !== fromAsset.assetId) ??
    assets.find((asset) => asset.assetId !== fromAsset.assetId)
  const quote = useMemo(
    () => buildQuote(amount, amountMode, fromAsset, toAsset),
    [amount, amountMode, fromAsset, toAsset],
  )

  const stageTransition = prefersReduced ? { duration: 0 } : { duration: 0.28, ease: EASE_IN_OUT_QUINT_TUPLE }

  const filteredAssets = useMemo(() => filterAssets(assets, search), [assets, search])

  const openDrawer = (nextDrawer: DrawerState) => {
    hapticLight()
    setDrawer(nextDrawer)
  }

  const selectFromAsset = (asset: SwapAsset) => {
    hapticLight()
    setFromAssetId(asset.assetId)
    const nextToAsset =
      toAssetId && toAssetId !== asset.assetId
        ? toAssetId
        : assets.find((candidate) => candidate.assetId !== asset.assetId)?.assetId
    setToAssetId(nextToAsset)
    setSearch('')
    setStep('compose')
  }

  const selectToAsset = (_target: AssetTarget, asset: SwapAsset) => {
    hapticLight()
    setToAssetId(asset.assetId)
    if (asset.assetId === fromAsset.assetId) setFromAssetId(toAsset?.assetId ?? fromAsset.assetId)
    setDrawer(null)
  }

  const swapSides = () => {
    if (!toAsset) return
    hapticLight()
    setSwapTurn((current) => current + 1)
    setFromAssetId(toAsset.assetId)
    setToAssetId(fromAsset.assetId)
  }

  const pressKey = (key: string) => {
    hapticTap()
    if (key === 'Back') {
      setAmount((current) => current.slice(0, -1) || '0')
      return
    }
    setAmount((current) => {
      const base = current === '0' ? '' : current
      if (key === '.' && base.includes('.')) return current
      return `${base}${key}`.slice(0, 10)
    })
  }

  const toggleAmountMode = () => {
    hapticLight()
    setAmountMode((current) => (current === 'asset' ? 'fiat' : 'asset'))
  }

  const handleBack = () => {
    if (step === 'compose') {
      setStep('select-from')
      return
    }
    goBack()
  }

  return (
    <>
      <Header text='Swap' back={handleBack} />
      <Content className='asset-swap-content'>
        <Padded>
          <div className='asset-swap-lab'>
            <AnimatePresence mode='wait' initial={false}>
              {step === 'select-from' ? (
                <motion.section
                  key='select-from'
                  className='swap-flow-stage'
                  initial={prefersReduced ? false : { opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReduced ? undefined : { opacity: 0, x: -16 }}
                  transition={stageTransition}
                >
                  <SwapAssetList
                    title='Choose asset to swap'
                    search={search}
                    assets={filteredAssets}
                    empty={assets.length === 0}
                    onSearch={setSearch}
                    onSelect={selectFromAsset}
                  />
                </motion.section>
              ) : (
                <motion.section
                  key='compose'
                  className='swap-flow-stage'
                  initial={prefersReduced ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReduced ? undefined : { opacity: 0, x: 18 }}
                  transition={stageTransition}
                >
                  <SwapComposer
                    amount={amount}
                    amountMode={amountMode}
                    quote={quote}
                    fromAsset={fromAsset}
                    toAsset={toAsset}
                    onAmountFocus={() => {}}
                    onModeToggle={toggleAmountMode}
                    onOpenReceiveDrawer={() => openDrawer('to')}
                    onSwapSides={swapSides}
                    swapTurn={swapTurn}
                  />
                  <Keypad amount={amount} onPress={pressKey} />
                  <Button
                    label='Continue'
                    disabled={!toAsset || Number(amount) <= 0}
                    onClick={() => openDrawer('review')}
                  />
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </Padded>
      </Content>

      <AssetPickerDrawer
        open={drawer === 'to'}
        target='to'
        assets={assets.filter((asset) => asset.assetId !== fromAsset.assetId)}
        selectedId={toAsset?.assetId}
        onOpenChange={(open) => {
          if (!open) setDrawer(null)
        }}
        onSelect={selectToAsset}
      />

      <ReviewDrawer
        open={drawer === 'review'}
        quote={quote}
        onOpenChange={(open) => {
          if (!open) setDrawer(null)
        }}
        onConfirm={() => navigate(Pages.Wallet)}
      />
    </>
  )
}

function SwapAssetList({
  title,
  search,
  assets,
  empty,
  selectedId,
  onSearch,
  onSelect,
}: {
  title: string
  search: string
  assets: SwapAsset[]
  empty: boolean
  selectedId?: string
  onSearch: (value: string) => void
  onSelect: (asset: SwapAsset) => void
}) {
  const prefersReduced = useReducedMotion()

  return (
    <div className='swap-asset-list-panel'>
      <div className='swap-step-heading'>
        <p>{title}</p>
        <span>Select the asset you want to trade from.</span>
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
        {empty ? (
          <div className='swap-empty-state'>No assets found</div>
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
              <SwapAssetRow asset={asset} active={selectedId === asset.assetId} onClick={() => onSelect(asset)} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

function SwapComposer({
  amount,
  amountMode,
  quote,
  fromAsset,
  toAsset,
  onAmountFocus,
  onModeToggle,
  onOpenReceiveDrawer,
  onSwapSides,
  swapTurn,
}: {
  amount: string
  amountMode: AmountMode
  quote: SwapQuote
  fromAsset: SwapAsset
  toAsset?: SwapAsset
  onAmountFocus: () => void
  onModeToggle: () => void
  onOpenReceiveDrawer: () => void
  onSwapSides: () => void
  swapTurn: number
}) {
  const amountLabel = amountMode === 'fiat' ? prettyFiatAmount(Number(amount) || 0, Fiats.USD) : amount
  const subAmountLabel = amountMode === 'fiat' ? `${quote.fromAmount} ${fromAsset.ticker}` : quote.fromFiat

  return (
    <div className='swap-composer'>
      <div className='swap-input-card'>
        <div className='swap-input-card__asset'>
          <TokenAvatar asset={fromAsset} size={36} />
          <div>
            <span>{fromAsset.name}</span>
            <small>{formatAssetBalance(fromAsset)}</small>
          </div>
          <button type='button' onClick={onModeToggle}>
            {amountMode === 'fiat' ? fromAsset.ticker : 'USD'}
          </button>
        </div>
        <button type='button' className='swap-amount-display' onClick={onAmountFocus} aria-label='Swap amount'>
          <AnimatePresence mode='wait' initial={false}>
            <motion.span
              key={`${amountMode}-${amountLabel}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: EASE_OUT_QUINT_TUPLE }}
            >
              {amountLabel}
            </motion.span>
          </AnimatePresence>
          <small>{subAmountLabel}</small>
        </button>
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
              <small>
                {quote.toAmount} {toAsset.ticker}
              </small>
            </div>
            <strong>{quote.toFiat}</strong>
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
      {asset.fiatText ? <strong>{asset.fiatText}</strong> : null}
    </button>
  )
}

function TokenAvatar({ asset, size }: { asset: SwapAsset; size: number }) {
  const tokenLogoTicker = getTokenLogoTicker(asset.ticker)
  if (tokenLogoTicker) {
    return (
      <span className='swap-token-avatar' style={{ width: size, height: size }}>
        <TokenLogo ticker={tokenLogoTicker} />
      </span>
    )
  }
  return <AssetAvatar icon={asset.icon} name={asset.name} ticker={asset.ticker} size={size} />
}

function Keypad({ amount, onPress }: { amount: string; onPress: (key: string) => void }) {
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

function AssetPickerDrawer({
  open,
  target,
  assets,
  selectedId,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  target: AssetTarget
  assets: SwapAsset[]
  selectedId?: string
  onOpenChange: (open: boolean) => void
  onSelect: (target: AssetTarget, asset: SwapAsset) => void
}) {
  const [query, setQuery] = useState('')
  const filteredAssets = useMemo(() => filterAssets(assets, query), [assets, query])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='swap-drawer-content swap-review-drawer-content'>
        <DrawerHeader>
          <DrawerTitle>{target === 'from' ? 'Choose asset to swap' : 'Choose asset to receive'}</DrawerTitle>
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
                onClick={() => onSelect(target, asset)}
              />
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function ReviewDrawer({
  open,
  quote,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  quote: SwapQuote
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
        <div className='swap-review-drawer-body'>
          <ReviewSummary quote={quote} />
          <QuoteDetails quote={quote} />
        </div>
        <div className='swap-review-action'>
          <Button label='Confirm swap' disabled onClick={onConfirm} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function ReviewSummary({ quote }: { quote: SwapQuote }) {
  return (
    <div className='swap-review-card'>
      <div className='swap-review-hero'>
        <div className='swap-review-avatars'>
          <TokenAvatar asset={quote.fromAsset} size={48} />
          {quote.toAsset ? <TokenAvatar asset={quote.toAsset} size={48} /> : null}
        </div>
        <div>
          <span>Swap route</span>
          <h3 className='text-heading-sm'>
            {quote.fromAsset.ticker} to {quote.toAsset?.ticker ?? 'asset'}
          </h3>
        </div>
      </div>
      <div className='swap-review-total'>
        <span>Estimated receive</span>
        <strong>{quote.toFiat}</strong>
      </div>
      <MetricRow label={`Swap ${quote.fromAsset.ticker}`} value={`${quote.fromAmount} ${quote.fromAsset.ticker}`} />
      <MetricRow
        label={`Receive ${quote.toAsset?.ticker ?? 'asset'}`}
        value={quote.toAsset ? `${quote.toAmount} ${quote.toAsset.ticker}` : 'Choose asset'}
      />
      <MetricRow label='Total value' value={quote.toFiat} />
    </div>
  )
}

function QuoteDetails({ quote }: { quote: SwapQuote }) {
  return (
    <div className='swap-detail-card'>
      <MetricRow
        label='Rate'
        value={quote.toAsset ? `1 ${quote.fromAsset.ticker} = ${quote.rateLabel} ${quote.toAsset.ticker}` : 'Pending'}
      />
      <MetricRow label='Price impact' value='0.04%' />
      <MetricRow label='Network cost' value='$0.00' />
      <MetricRow label='Arrival' value='About 12 seconds' />
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='swap-metric-row'>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function buildQuote(amount: string, mode: AmountMode, fromAsset: SwapAsset, toAsset?: SwapAsset): SwapQuote {
  const parsed = Number(amount) || 0
  const fromUsd = prototypeUsd(fromAsset)
  const toUsd = toAsset ? prototypeUsd(toAsset) : 0
  const fromUnits = mode === 'fiat' && fromUsd > 0 ? parsed / fromUsd : parsed
  const fromFiatNumber = mode === 'fiat' ? parsed : fromUnits * fromUsd
  const received = toUsd > 0 ? fromFiatNumber / toUsd : 0
  const rate = toUsd > 0 ? fromUsd / toUsd : 0

  return {
    fromAsset,
    toAsset,
    fromAmount: prettyNumber(fromUnits, swapAmountDecimals(fromUnits)),
    fromFiat: prettyFiatAmount(fromFiatNumber, Fiats.USD),
    toAmount: prettyNumber(received, swapAmountDecimals(received)),
    toFiat: prettyFiatAmount(received * toUsd, Fiats.USD),
    rateLabel: prettyNumber(rate, swapAmountDecimals(rate)),
  }
}

function swapAmountDecimals(value: number): number {
  if (value >= 1000) return 2
  if (value >= 1) return 4
  return 8
}

function prototypeUsd(asset: SwapAsset): number {
  if (asset.isBitcoin || asset.ticker === 'BTC') return 81500
  if (asset.ticker.toUpperCase().includes('USD')) return 1
  if (asset.ticker === 'POP') return 0.0042
  return Math.max(0.01, asset.ticker.length * 0.17)
}

function toSwapAssets(rows: PortfolioRow[], fiat: Fiats, decimals: number): SwapAsset[] {
  const mapped = rows.map((row) => ({
    assetId: row.assetId,
    name: row.name,
    ticker: row.ticker,
    decimals: row.decimals,
    balance: row.balance,
    fiatText: row.hasFiatPrice
      ? prettyFiatAmount(row.fiatAmount, fiat, {
          maximumFractionDigits: decimals,
          minimumFractionDigits: decimals,
        })
      : undefined,
    icon: row.icon,
    isBitcoin: row.assetId === 'btc',
  }))

  if (mapped.length < 2) return [...mapped, fallbackAsset]
  return mapped
}

function filterAssets(assets: SwapAsset[], query: string): SwapAsset[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return assets
  return assets.filter((asset) => {
    return asset.name.toLowerCase().includes(normalized) || asset.ticker.toLowerCase().includes(normalized)
  })
}

function formatAssetBalance(asset: SwapAsset): string {
  return `${prettyNumber(centsToUnits(asset.balance, asset.decimals), asset.decimals)} ${asset.ticker}`
}

function getTokenLogoTicker(ticker: string | undefined): TokenLogoTicker | undefined {
  const normalized = ticker?.trim().toUpperCase()
  if (normalized === 'BTC' || normalized === 'USDT' || normalized === 'USDC') return normalized
}
