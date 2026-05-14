import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AssetAvatar from '../../../components/AssetAvatar'
import Button from '../../../components/Button'
import Content from '../../../components/Content'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import TokenLogo, { type TokenLogoTicker } from '../../../components/TokenLogo'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer'
import ChevronDownIcon from '../../../icons/ChevronDown'
import SuccessIcon from '../../../icons/Success'
import SwapIcon from '../../../icons/Swap'
import { EASE_IN_OUT_QUINT_TUPLE, EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { prettyCurrencyAssetAmount, prettyFiatAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticTap } from '../../../lib/haptics'
import { Fiats } from '../../../lib/types'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
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
  balance: number | bigint
  fiatText?: string
  icon?: string
  isBitcoin?: boolean
  sourceAssetIds?: string[]
  usdPrice?: number
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
  assetId: 'fallback-usd',
  name: 'US Dollars',
  ticker: 'USD',
  decimals: 2,
  balance: 0,
  fiatText: '$0.00',
  usdPrice: 1,
}

const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back']

export default function WalletSwap() {
  const { config } = useContext(ConfigContext)
  const { convertFiat, fiatDecimals, toFiat } = useContext(FiatContext)
  const { swapFromAssetId, setSwapFromAssetId } = useContext(FlowContext)
  const { goBack, navigate } = useContext(NavigationContext)
  const { addPrototypeSwap } = useContext(WalletContext)
  const { rows } = usePortfolioFiat()
  const prefersReduced = useReducedMotion()

  const assets = useMemo(
    () => toSwapAssets(rows, config.fiat, fiatDecimals(), convertFiat, toFiat),
    [rows, config.fiat, fiatDecimals, convertFiat, toFiat],
  )
  const [step, setStep] = useState<SwapStep>(swapFromAssetId ? 'compose' : 'select-from')
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState('1')
  const [amountMode, setAmountMode] = useState<AmountMode>('fiat')
  const [fromAssetId, setFromAssetId] = useState(
    (swapFromAssetId ? resolveSwapAssetId(assets, swapFromAssetId) : undefined) ?? assets[0]?.assetId ?? 'btc',
  )
  const [toAssetId, setToAssetId] = useState<string | undefined>()
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [swapTurn, setSwapTurn] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [successQuote, setSuccessQuote] = useState<SwapQuote>()

  const fromAsset = assets.find((asset) => asset.assetId === fromAssetId) ?? assets[0] ?? fallbackAsset
  const toAsset = toAssetId
    ? assets.find((asset) => asset.assetId === toAssetId && asset.assetId !== fromAsset.assetId)
    : undefined
  const quote = useMemo(
    () => buildQuote(amount, amountMode, fromAsset, toAsset),
    [amount, amountMode, fromAsset, toAsset],
  )

  const stageTransition = prefersReduced ? { duration: 0 } : { duration: 0.28, ease: EASE_IN_OUT_QUINT_TUPLE }

  const filteredAssets = useMemo(() => filterAssets(assets, search), [assets, search])

  const focusFromAsset = useCallback((assetId: string) => {
    setFromAssetId(assetId)
    setToAssetId((current) => (current === assetId ? undefined : current))
    setSearch('')
    setStep('compose')
  }, [])

  useEffect(() => {
    if (!swapFromAssetId || assets.length === 0) return

    const nextFromAssetId = resolveSwapAssetId(assets, swapFromAssetId) ?? assets[0]?.assetId ?? 'btc'

    focusFromAsset(nextFromAssetId)
    setSwapFromAssetId(undefined)
  }, [assets, focusFromAsset, setSwapFromAssetId, swapFromAssetId])

  const openDrawer = (nextDrawer: DrawerState) => {
    hapticLight()
    setDrawer(nextDrawer)
  }

  const selectFromAsset = (asset: SwapAsset) => {
    hapticLight()
    focusFromAsset(asset.assetId)
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

  const handleSuccessDone = useCallback(() => {
    setSuccessQuote(undefined)
    navigate(Pages.Wallet)
  }, [navigate])

  useEffect(() => {
    if (!successQuote) return
    const timer = window.setTimeout(handleSuccessDone, 3000)
    return () => window.clearTimeout(timer)
  }, [handleSuccessDone, successQuote])

  const confirmPrototypeSwap = () => {
    if (!toAsset || confirming || Number(amount) <= 0) return

    hapticLight()
    setConfirming(true)
    window.setTimeout(() => {
      const execution = buildPrototypeSwapExecution(amount, amountMode, fromAsset, toAsset)
      addPrototypeSwap(execution)
      setConfirming(false)
      setDrawer(null)
      setSuccessQuote(quote)
      hapticLight()
    }, 850)
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
        confirming={confirming}
        onOpenChange={(open) => {
          if (!open) setDrawer(null)
        }}
        onConfirm={confirmPrototypeSwap}
      />
      <SwapSuccessOverlay quote={successQuote} onDone={handleSuccessDone} />
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
  confirming,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  quote: SwapQuote
  confirming: boolean
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
          <Button
            label='Confirm swap'
            disabled={!quote.toAsset || confirming}
            loading={confirming}
            onClick={onConfirm}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function SwapSuccessOverlay({ quote, onDone }: { quote?: SwapQuote; onDone: () => void }) {
  return (
    <AnimatePresence>
      {quote ? (
        <motion.button
          type='button'
          className='swap-success-overlay'
          onClick={onDone}
          initial={{ transform: 'translate3d(0, 100%, 0)' }}
          animate={{ transform: 'translate3d(0, 0%, 0)' }}
          exit={{ transform: 'translate3d(0, 100%, 0)' }}
          transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.95 }}
          aria-label='Swap successful. Tap to go home.'
        >
          <motion.span
            className='swap-success-mark'
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.16, type: 'spring', duration: 0.42, bounce: 0.18 }}
          >
            <SuccessIcon small />
          </motion.span>
          <motion.span
            className='swap-success-copy'
            initial={{ opacity: 0, transform: 'translate3d(0, 10px, 0)' }}
            animate={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }}
            transition={{ delay: 0.2, duration: 0.24, ease: EASE_OUT_QUINT_TUPLE }}
          >
            <strong>Swap successful</strong>
            <small>
              {quote.fromAsset.ticker} to {quote.toAsset?.ticker}
            </small>
          </motion.span>
        </motion.button>
      ) : null}
    </AnimatePresence>
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
  const fromUsd = estimateSwapUsd(fromAsset)
  const toUsd = toAsset ? estimateSwapUsd(toAsset) : 0
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

function buildPrototypeSwapExecution(amount: string, mode: AmountMode, fromAsset: SwapAsset, toAsset: SwapAsset) {
  const parsed = Number(amount) || 0
  const fromUsd = estimateSwapUsd(fromAsset)
  const toUsd = estimateSwapUsd(toAsset)
  const fromUnits = mode === 'fiat' && fromUsd > 0 ? parsed / fromUsd : parsed
  const fromFiatNumber = mode === 'fiat' ? parsed : fromUnits * fromUsd
  const toUnits = toUsd > 0 ? fromFiatNumber / toUsd : 0

  return {
    fromAssetId: fromAsset.assetId,
    fromTicker: fromAsset.ticker,
    fromDecimals: fromAsset.decimals,
    fromAmount: toRawAmount(fromUnits, fromAsset.decimals),
    toAssetId: toAsset.assetId,
    toTicker: toAsset.ticker,
    toDecimals: toAsset.decimals,
    toAmount: toRawAmount(toUnits, toAsset.decimals),
    fiatAmount: fromFiatNumber,
  }
}

function toRawAmount(units: number, decimals: number): bigint {
  if (!Number.isFinite(units) || units <= 0) return 0n
  return BigInt(Math.max(0, Math.round(units * 10 ** decimals)))
}

function swapAmountDecimals(value: number): number {
  if (value >= 1000) return 2
  if (value >= 1) return 4
  return 8
}

function estimateSwapUsd(asset: SwapAsset): number {
  return Number.isFinite(asset.usdPrice) ? (asset.usdPrice ?? 0) : 0
}

function toSwapAssets(
  rows: PortfolioRow[],
  fiat: Fiats,
  decimals: number,
  convertFiat: (amount: number, from: Fiats, to?: Fiats) => number,
  toFiat: (satoshis?: number) => number,
): SwapAsset[] {
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
    sourceAssetIds: row.sourceAssetIds,
    usdPrice: estimateRowUsdPrice(row, fiat, convertFiat, toFiat),
  }))

  if (mapped.length < 2) return [...mapped, fallbackAsset]
  return mapped
}

function estimateRowUsdPrice(
  row: PortfolioRow,
  fiat: Fiats,
  convertFiat: (amount: number, from: Fiats, to?: Fiats) => number,
  toFiat: (satoshis?: number) => number,
): number {
  const ticker = row.ticker.trim().toUpperCase()
  if (row.assetId === 'btc' || ticker === 'BTC') return convertFiat(toFiat(100_000_000), fiat, Fiats.USD)
  if (ticker === 'USD' || ticker === 'USDT' || ticker === 'USDC' || ticker === 'AUSD')
    return convertFiat(1, Fiats.USD, Fiats.USD)
  if (ticker === 'CHF') return convertFiat(1, Fiats.CHF, Fiats.USD)
  if (ticker === 'BRL' || ticker === 'DPIX' || ticker === 'DEPIX') return convertFiat(1, Fiats.BRL, Fiats.USD)

  const rawBalance = typeof row.balance === 'bigint' ? Number(row.balance) : row.balance
  const unitBalance = rawBalance / 10 ** row.decimals
  if (!unitBalance || !row.hasFiatPrice) return 0

  return convertFiat(row.fiatAmount / unitBalance, fiat, Fiats.USD)
}

function filterAssets(assets: SwapAsset[], query: string): SwapAsset[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return assets
  return assets.filter((asset) => {
    return asset.name.toLowerCase().includes(normalized) || asset.ticker.toLowerCase().includes(normalized)
  })
}

function resolveSwapAssetId(assets: SwapAsset[], assetId: string): string | undefined {
  const exact = assets.find((asset) => asset.assetId === assetId)
  if (exact) return exact.assetId

  return assets.find((asset) => asset.sourceAssetIds?.includes(assetId))?.assetId
}

function formatAssetBalance(asset: SwapAsset): string {
  const rawBalance = typeof asset.balance === 'bigint' ? asset.balance : BigInt(asset.balance)
  return `${prettyCurrencyAssetAmount(rawBalance, asset.decimals, asset.ticker)} ${asset.ticker}`
}

function getTokenLogoTicker(ticker: string | undefined): TokenLogoTicker | undefined {
  const normalized = ticker?.trim().toUpperCase()
  if (
    normalized === 'BTC' ||
    normalized === 'USD' ||
    normalized === 'USDT' ||
    normalized === 'USDC' ||
    normalized === 'CHF' ||
    normalized === 'BRL'
  )
    return normalized
}
