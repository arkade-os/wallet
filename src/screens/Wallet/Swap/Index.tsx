import { motion } from 'framer-motion'
import { useContext, useMemo, useState } from 'react'
import AssetAvatar from '../../../components/AssetAvatar'
import Button from '../../../components/Button'
import Content from '../../../components/Content'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer'
import BitcoinIcon from '../../../icons/Bitcoin'
import ChevronDownIcon from '../../../icons/ChevronDown'
import SwapIcon from '../../../icons/Swap'
import { centsToUnits } from '../../../lib/assets'
import { EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { prettyFiatAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticTap } from '../../../lib/haptics'
import { Fiats } from '../../../lib/types'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { usePortfolioFiat, type PortfolioRow } from '../../../hooks/usePortfolioFiat'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

type VariantSource = 'codex' | 'claude'
type SwapStep = 'compose' | 'select' | 'review'
type AssetTarget = 'from' | 'to'
type DrawerState = AssetTarget | 'review' | null

type LayoutKind =
  | 'stack'
  | 'focus'
  | 'route'
  | 'ticket'
  | 'balance'
  | 'split'
  | 'drawer'
  | 'timeline'
  | 'quote'
  | 'minimal'

interface SwapVariant {
  id: string
  title: string
  intent: string
  layout: LayoutKind
}

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

const codexVariants: SwapVariant[] = [
  { id: 'c1', title: 'Stacked quote', intent: 'Composer first, quote second', layout: 'stack' },
  { id: 'c2', title: 'Amount focus', intent: 'One amount owns the screen', layout: 'focus' },
  { id: 'c3', title: 'Route rail', intent: 'Make the asset path obvious', layout: 'route' },
  { id: 'c4', title: 'Receipt ticket', intent: 'Feels like preparing an order', layout: 'ticket' },
  { id: 'c5', title: 'Balance first', intent: 'Start from what the user owns', layout: 'balance' },
  { id: 'c6', title: 'Split desk', intent: 'Quote and controls side by side', layout: 'split' },
  { id: 'c7', title: 'Drawer-led', intent: 'Composer is light, sheets do detail', layout: 'drawer' },
  { id: 'c8', title: 'Step timeline', intent: 'Guided progress through swap', layout: 'timeline' },
  { id: 'c9', title: 'Quote card', intent: 'Rate and receive amount lead', layout: 'quote' },
  { id: 'c10', title: 'Minimal trade', intent: 'Fewest objects possible', layout: 'minimal' },
]

const claudeVariants: SwapVariant[] = [
  { id: 'h1', title: 'Family flow', intent: 'Large input, quiet receive row', layout: 'focus' },
  { id: 'h2', title: 'Uniswap sheet', intent: 'Stacked cards with sheet review', layout: 'stack' },
  { id: 'h3', title: 'Asset chooser', intent: 'Picker state is central', layout: 'drawer' },
  { id: 'h4', title: 'Confirm-led', intent: 'Preview the irreversible step early', layout: 'ticket' },
  { id: 'h5', title: 'Keypad native', intent: 'Mobile thumb-entry prototype', layout: 'minimal' },
  { id: 'h6', title: 'Route map', intent: 'Path and rate are the product', layout: 'route' },
  { id: 'h7', title: 'Bento quote', intent: 'Dense but calm information blocks', layout: 'split' },
  { id: 'h8', title: 'Stepper', intent: 'One decision per step', layout: 'timeline' },
  { id: 'h9', title: 'Portfolio swap', intent: 'Swap starts from holdings', layout: 'balance' },
  { id: 'h10', title: 'Market slip', intent: 'Compact exchange order slip', layout: 'quote' },
]

const variantsBySource: Record<VariantSource, SwapVariant[]> = {
  codex: codexVariants,
  claude: claudeVariants,
}

const fallbackAsset: SwapAsset = {
  assetId: 'prototype-asset',
  name: 'Arkade USD',
  ticker: 'AUSD',
  decimals: 2,
  balance: 125050,
  fiatText: '$1,250.50',
}

const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back']

export default function WalletSwap() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { rows } = usePortfolioFiat()
  const prefersReduced = useReducedMotion()

  const assets = useMemo(() => toSwapAssets(rows, config.fiat, fiatDecimals()), [rows, config.fiat, fiatDecimals])
  const [source, setSource] = useState<VariantSource>('codex')
  const [variantIndex, setVariantIndex] = useState(0)
  const [step, setStep] = useState<SwapStep>('compose')
  const [amount, setAmount] = useState('0.01')
  const [fromAssetId, setFromAssetId] = useState(assets[0]?.assetId ?? 'btc')
  const [toAssetId, setToAssetId] = useState(assets[1]?.assetId ?? fallbackAsset.assetId)
  const [drawer, setDrawer] = useState<DrawerState>(null)

  const variants = variantsBySource[source]
  const variant = variants[variantIndex] ?? variants[0]
  const fromAsset = assets.find((asset) => asset.assetId === fromAssetId) ?? assets[0] ?? fallbackAsset
  const toAsset =
    assets.find((asset) => asset.assetId === toAssetId && asset.assetId !== fromAsset.assetId) ??
    assets.find((asset) => asset.assetId !== fromAsset.assetId) ??
    fallbackAsset
  const quote = useMemo(() => buildQuote(amount, fromAsset, toAsset), [amount, fromAsset, toAsset])

  const motionTransition = prefersReduced ? { duration: 0 } : { duration: 0.24, ease: EASE_OUT_QUINT_TUPLE }

  const selectSource = (nextSource: VariantSource) => {
    hapticLight()
    setSource(nextSource)
    setVariantIndex(0)
  }

  const selectVariant = (index: number) => {
    hapticLight()
    setVariantIndex(index)
  }

  const selectAsset = (target: AssetTarget, asset: SwapAsset) => {
    hapticLight()
    if (target === 'from') {
      setFromAssetId(asset.assetId)
      if (asset.assetId === toAsset.assetId) setToAssetId(fromAsset.assetId)
    } else {
      setToAssetId(asset.assetId)
      if (asset.assetId === fromAsset.assetId) setFromAssetId(toAsset.assetId)
    }
    setDrawer(null)
  }

  const swapSides = () => {
    hapticLight()
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

  const chooseStep = (nextStep: SwapStep) => {
    hapticLight()
    setStep(nextStep)
    if (nextStep === 'review') setDrawer('review')
  }

  return (
    <>
      <Header text='Swap' back />
      <Content className='asset-swap-content'>
        <Padded>
          <div className='asset-swap-lab'>
            <section className='swap-lab-controls' aria-label='Swap prototype controls'>
              <div className='swap-source-switcher' role='tablist' aria-label='Design source'>
                {(['codex', 'claude'] as const).map((item) => (
                  <button
                    key={item}
                    type='button'
                    role='tab'
                    aria-selected={source === item}
                    className={source === item ? 'swap-source-tab swap-source-tab--active' : 'swap-source-tab'}
                    onClick={() => selectSource(item)}
                  >
                    {item === 'codex' ? 'Codex' : 'Claude'}
                  </button>
                ))}
              </div>

              <div className='swap-variant-strip hide-scrollbar' aria-label={`${source} swap variants`}>
                {variants.map((item, index) => (
                  <button
                    key={item.id}
                    type='button'
                    aria-pressed={variant.id === item.id}
                    className={
                      variant.id === item.id ? 'swap-variant-chip swap-variant-chip--active' : 'swap-variant-chip'
                    }
                    onClick={() => selectVariant(index)}
                  >
                    <span>{index + 1}</span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className='swap-step-tabs' role='tablist' aria-label='Swap step preview'>
              {(['compose', 'select', 'review'] as const).map((item) => (
                <button
                  key={item}
                  type='button'
                  role='tab'
                  aria-selected={step === item}
                  className={step === item ? 'swap-step-tab swap-step-tab--active' : 'swap-step-tab'}
                  onClick={() => chooseStep(item)}
                >
                  {stepLabel(item)}
                </button>
              ))}
            </div>

            <motion.section
              key={`${source}-${variant.id}-${step}`}
              className='swap-variant-stage'
              initial={prefersReduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransition}
            >
              <VariantHeader source={source} variant={variant} />
              <VariantBody
                variant={variant}
                step={step}
                amount={amount}
                quote={quote}
                fromAsset={fromAsset}
                toAsset={toAsset}
                onAmountChange={setAmount}
                onOpenAssetDrawer={setDrawer}
                onSwapSides={swapSides}
                onReview={() => setDrawer('review')}
              />
              <Keypad amount={amount} onPress={pressKey} />
            </motion.section>
          </div>
        </Padded>
      </Content>

      <AssetPickerDrawer
        open={drawer === 'from' || drawer === 'to'}
        target={drawer === 'from' || drawer === 'to' ? drawer : 'from'}
        assets={assets}
        selectedId={drawer === 'to' ? toAsset.assetId : fromAsset.assetId}
        onOpenChange={(open) => {
          if (!open) setDrawer(null)
        }}
        onSelect={selectAsset}
      />

      <ReviewDrawer
        open={drawer === 'review'}
        quote={quote}
        onOpenChange={(open) => {
          if (!open) setDrawer(null)
        }}
      />
    </>
  )
}

function VariantHeader({ source, variant }: { source: VariantSource; variant: SwapVariant }) {
  return (
    <header className='swap-variant-header'>
      <div>
        <p className='swap-eyebrow'>{source === 'codex' ? 'Codex variant' : 'Claude variant'}</p>
        <h2 className='text-heading-md'>{variant.title}</h2>
      </div>
      <p>{variant.intent}</p>
    </header>
  )
}

function VariantBody({
  variant,
  step,
  amount,
  quote,
  fromAsset,
  toAsset,
  onAmountChange,
  onOpenAssetDrawer,
  onSwapSides,
  onReview,
}: {
  variant: SwapVariant
  step: SwapStep
  amount: string
  quote: SwapQuote
  fromAsset: SwapAsset
  toAsset: SwapAsset
  onAmountChange: (value: string) => void
  onOpenAssetDrawer: (target: AssetTarget) => void
  onSwapSides: () => void
  onReview: () => void
}) {
  const composer = (
    <SwapComposer
      amount={amount}
      quote={quote}
      fromAsset={fromAsset}
      toAsset={toAsset}
      onAmountChange={onAmountChange}
      onOpenAssetDrawer={onOpenAssetDrawer}
      onSwapSides={onSwapSides}
    />
  )
  const details = <QuoteDetails quote={quote} />
  const review = <ReviewSummary quote={quote} />

  if (step === 'select') {
    return (
      <div className='swap-layout swap-layout--drawer'>
        <AssetSelectionPanel fromAsset={fromAsset} toAsset={toAsset} onOpenAssetDrawer={onOpenAssetDrawer} />
        {details}
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className='swap-layout swap-layout--ticket'>
        {review}
        <Button label='Open review sheet' onClick={onReview} />
      </div>
    )
  }

  switch (variant.layout) {
    case 'focus':
      return (
        <div className='swap-layout swap-layout--focus'>
          <HeroAmount amount={amount} quote={quote} fromAsset={fromAsset} onAmountChange={onAmountChange} />
          {composer}
          <Button label='Review swap' onClick={onReview} />
        </div>
      )
    case 'route':
      return (
        <div className='swap-layout swap-layout--route'>
          <RouteMap fromAsset={fromAsset} toAsset={toAsset} quote={quote} />
          {composer}
          {details}
        </div>
      )
    case 'ticket':
      return (
        <div className='swap-layout swap-layout--ticket'>
          {composer}
          {review}
          <Button label='Review swap' onClick={onReview} />
        </div>
      )
    case 'balance':
      return (
        <div className='swap-layout swap-layout--balance'>
          <BalanceLedgers fromAsset={fromAsset} toAsset={toAsset} onOpenAssetDrawer={onOpenAssetDrawer} />
          {composer}
        </div>
      )
    case 'split':
      return (
        <div className='swap-layout swap-layout--split'>
          {composer}
          <div className='swap-side-panel'>
            {details}
            {review}
          </div>
        </div>
      )
    case 'drawer':
      return (
        <div className='swap-layout swap-layout--drawer'>
          <AssetSelectionPanel fromAsset={fromAsset} toAsset={toAsset} onOpenAssetDrawer={onOpenAssetDrawer} />
          {composer}
          <Button label='Review in drawer' onClick={onReview} />
        </div>
      )
    case 'timeline':
      return (
        <div className='swap-layout swap-layout--timeline'>
          <StepRail activeStep={step} />
          {composer}
          {details}
        </div>
      )
    case 'quote':
      return (
        <div className='swap-layout swap-layout--quote'>
          {details}
          {composer}
          <Button label='Review swap' onClick={onReview} />
        </div>
      )
    case 'minimal':
      return (
        <div className='swap-layout swap-layout--minimal'>
          <HeroAmount amount={amount} quote={quote} fromAsset={fromAsset} onAmountChange={onAmountChange} />
          <AssetPairLine fromAsset={fromAsset} toAsset={toAsset} onOpenAssetDrawer={onOpenAssetDrawer} />
          <Button label='Review swap' onClick={onReview} />
        </div>
      )
    case 'stack':
    default:
      return (
        <div className='swap-layout swap-layout--stack'>
          {composer}
          {details}
          <Button label='Review swap' onClick={onReview} />
        </div>
      )
  }
}

function SwapComposer({
  amount,
  quote,
  fromAsset,
  toAsset,
  onAmountChange,
  onOpenAssetDrawer,
  onSwapSides,
}: {
  amount: string
  quote: SwapQuote
  fromAsset: SwapAsset
  toAsset: SwapAsset
  onAmountChange: (value: string) => void
  onOpenAssetDrawer: (target: AssetTarget) => void
  onSwapSides: () => void
}) {
  return (
    <div className='swap-composer'>
      <SwapAmountCard
        label='Swap'
        amount={amount}
        fiat={quote.fromFiat}
        asset={fromAsset}
        active
        onAmountChange={onAmountChange}
        onAssetClick={() => onOpenAssetDrawer('from')}
      />
      <button type='button' className='swap-flip-button' aria-label='Switch swap direction' onClick={onSwapSides}>
        <SwapIcon />
      </button>
      <SwapAmountCard
        label='Receive'
        amount={quote.toAmount}
        fiat={quote.toFiat}
        asset={toAsset}
        onAssetClick={() => onOpenAssetDrawer('to')}
      />
    </div>
  )
}

function SwapAmountCard({
  label,
  amount,
  fiat,
  asset,
  active,
  onAmountChange,
  onAssetClick,
}: {
  label: string
  amount: string
  fiat: string
  asset: SwapAsset
  active?: boolean
  onAmountChange?: (value: string) => void
  onAssetClick: () => void
}) {
  return (
    <div className={active ? 'swap-amount-card swap-amount-card--active' : 'swap-amount-card'}>
      <div className='swap-card-topline'>
        <span>{label}</span>
        <AssetButton asset={asset} onClick={onAssetClick} />
      </div>
      {active ? (
        <input
          aria-label='Swap amount'
          inputMode='decimal'
          value={amount}
          onChange={(event) => onAmountChange?.(normalizeAmountInput(event.target.value))}
        />
      ) : (
        <p className='swap-output-amount'>{amount}</p>
      )}
      <div className='swap-card-footer'>
        <span>{fiat}</span>
        <span>Balance {formatAssetBalance(asset)}</span>
      </div>
    </div>
  )
}

function AssetButton({ asset, onClick }: { asset: SwapAsset; onClick: () => void }) {
  return (
    <button type='button' className='swap-asset-button' onClick={onClick}>
      <TokenAvatar asset={asset} size={24} />
      <span>{asset.ticker}</span>
      <ChevronDownIcon />
    </button>
  )
}

function TokenAvatar({ asset, size }: { asset: SwapAsset; size: number }) {
  if (asset.isBitcoin) {
    return (
      <span className='swap-token-avatar swap-token-avatar--bitcoin' style={{ width: size, height: size }}>
        <BitcoinIcon size={Math.max(16, size - 8)} />
      </span>
    )
  }
  return <AssetAvatar icon={asset.icon} name={asset.name} ticker={asset.ticker} size={size} />
}

function HeroAmount({
  amount,
  quote,
  fromAsset,
  onAmountChange,
}: {
  amount: string
  quote: SwapQuote
  fromAsset: SwapAsset
  onAmountChange: (value: string) => void
}) {
  return (
    <div className='swap-hero-amount'>
      <p>You're swapping</p>
      <div>
        <input
          aria-label='Focused swap amount'
          inputMode='decimal'
          value={amount}
          onChange={(event) => onAmountChange(normalizeAmountInput(event.target.value))}
        />
        <span>{fromAsset.ticker}</span>
      </div>
      <p>
        {quote.fromFiat} into {quote.toAmount} {quote.toAsset.ticker}
      </p>
    </div>
  )
}

function QuoteDetails({ quote }: { quote: SwapQuote }) {
  return (
    <div className='swap-detail-card'>
      <MetricRow label='Rate' value={`1 ${quote.fromAsset.ticker} = ${quote.rateLabel} ${quote.toAsset.ticker}`} />
      <MetricRow label='Price impact' value='0.04%' />
      <MetricRow label='Network cost' value='$0.00' />
      <MetricRow label='Arrival' value='About 12 seconds' />
    </div>
  )
}

function ReviewSummary({ quote }: { quote: SwapQuote }) {
  return (
    <div className='swap-review-card'>
      <div className='swap-review-avatars'>
        <TokenAvatar asset={quote.fromAsset} size={52} />
        <TokenAvatar asset={quote.toAsset} size={52} />
      </div>
      <h3 className='text-heading-sm'>
        Review swap of {quote.fromAsset.ticker} to {quote.toAsset.ticker}
      </h3>
      <MetricRow label={`Swap ${quote.fromAsset.ticker}`} value={`${quote.fromAmount} ${quote.fromAsset.ticker}`} />
      <MetricRow label={`Receive ${quote.toAsset.ticker}`} value={`${quote.toAmount} ${quote.toAsset.ticker}`} />
      <MetricRow label='Total value' value={quote.toFiat} />
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

function AssetSelectionPanel({
  fromAsset,
  toAsset,
  onOpenAssetDrawer,
}: {
  fromAsset: SwapAsset
  toAsset: SwapAsset
  onOpenAssetDrawer: (target: AssetTarget) => void
}) {
  return (
    <div className='swap-selection-panel'>
      <AssetChoiceButton label='From' asset={fromAsset} onClick={() => onOpenAssetDrawer('from')} />
      <AssetChoiceButton label='To' asset={toAsset} onClick={() => onOpenAssetDrawer('to')} />
    </div>
  )
}

function AssetChoiceButton({ label, asset, onClick }: { label: string; asset: SwapAsset; onClick: () => void }) {
  return (
    <button type='button' className='swap-choice-button' onClick={onClick}>
      <span>{label}</span>
      <span>
        <TokenAvatar asset={asset} size={32} />
        <span>{asset.ticker}</span>
      </span>
    </button>
  )
}

function AssetPairLine({
  fromAsset,
  toAsset,
  single,
  onOpenAssetDrawer,
}: {
  fromAsset: SwapAsset
  toAsset: SwapAsset
  single?: boolean
  onOpenAssetDrawer: (target: AssetTarget) => void
}) {
  return (
    <div className='swap-asset-pair-line'>
      <button type='button' onClick={() => onOpenAssetDrawer('from')}>
        <TokenAvatar asset={fromAsset} size={32} />
        <span>{fromAsset.ticker}</span>
      </button>
      {!single ? (
        <>
          <span className='swap-pair-arrow'>to</span>
          <button type='button' onClick={() => onOpenAssetDrawer('to')}>
            <TokenAvatar asset={toAsset} size={32} />
            <span>{toAsset.ticker}</span>
          </button>
        </>
      ) : null}
    </div>
  )
}

function RouteMap({ fromAsset, toAsset, quote }: { fromAsset: SwapAsset; toAsset: SwapAsset; quote: SwapQuote }) {
  return (
    <div className='swap-route-map'>
      <TokenAvatar asset={fromAsset} size={48} />
      <div className='swap-route-line'>
        <span />
        <p>{quote.rateLabel}</p>
      </div>
      <TokenAvatar asset={toAsset} size={48} />
    </div>
  )
}

function BalanceLedgers({
  fromAsset,
  toAsset,
  onOpenAssetDrawer,
}: {
  fromAsset: SwapAsset
  toAsset: SwapAsset
  onOpenAssetDrawer: (target: AssetTarget) => void
}) {
  return (
    <div className='swap-balance-ledgers'>
      {[
        { target: 'from' as const, asset: fromAsset },
        { target: 'to' as const, asset: toAsset },
      ].map(({ target, asset }) => (
        <button key={target} type='button' onClick={() => onOpenAssetDrawer(target)}>
          <TokenAvatar asset={asset} size={36} />
          <span>{asset.name}</span>
          <span>{formatAssetBalance(asset)}</span>
        </button>
      ))}
    </div>
  )
}

function StepRail({ activeStep }: { activeStep: SwapStep }) {
  const steps: SwapStep[] = ['compose', 'select', 'review']
  return (
    <ol className='swap-step-rail'>
      {steps.map((item) => (
        <li
          key={item}
          className={activeStep === item ? 'swap-step-rail-item swap-step-rail-item--active' : 'swap-step-rail-item'}
        >
          <span />
          <p>{stepLabel(item)}</p>
        </li>
      ))}
    </ol>
  )
}

function Keypad({ amount, onPress }: { amount: string; onPress: (key: string) => void }) {
  return (
    <div className='swap-keypad' aria-label={`Prototype keypad for ${amount || '0'}`}>
      {keypadKeys.map((key) => (
        <button key={key} type='button' onClick={() => onPress(key)}>
          {key}
        </button>
      ))}
    </div>
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
  selectedId: string
  onOpenChange: (open: boolean) => void
  onSelect: (target: AssetTarget, asset: SwapAsset) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='swap-drawer-content'>
        <DrawerHeader>
          <DrawerTitle>{target === 'from' ? 'Choose asset to swap' : 'Choose asset to receive'}</DrawerTitle>
          <DrawerDescription>Available balances in your wallet.</DrawerDescription>
        </DrawerHeader>
        <div className='swap-token-search'>Search assets</div>
        <div className='swap-token-list'>
          {assets.map((asset) => (
            <button
              key={asset.assetId}
              type='button'
              className={selectedId === asset.assetId ? 'swap-token-row swap-token-row--active' : 'swap-token-row'}
              onClick={() => onSelect(target, asset)}
            >
              <TokenAvatar asset={asset} size={40} />
              <span>
                <span>{asset.name}</span>
                <small>
                  {formatAssetBalance(asset)} {asset.fiatText ? `- ${asset.fiatText}` : ''}
                </small>
              </span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function ReviewDrawer({
  open,
  quote,
  onOpenChange,
}: {
  open: boolean
  quote: SwapQuote
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='swap-drawer-content'>
        <DrawerHeader>
          <DrawerTitle>Review swap</DrawerTitle>
          <DrawerDescription>Confirm the amounts, route, and estimated arrival.</DrawerDescription>
        </DrawerHeader>
        <div className='swap-review-drawer-body'>
          <ReviewSummary quote={quote} />
          <Button label='Confirm swap' disabled onClick={() => {}} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

interface SwapQuote {
  fromAsset: SwapAsset
  toAsset: SwapAsset
  fromAmount: string
  fromFiat: string
  toAmount: string
  toFiat: string
  rateLabel: string
}

function buildQuote(amount: string, fromAsset: SwapAsset, toAsset: SwapAsset): SwapQuote {
  const parsed = Number(amount) || 0
  const rate = prototypeRate(fromAsset, toAsset)
  const received = parsed * rate
  const fromFiatNumber = parsed * prototypeUsd(fromAsset)
  const toFiatNumber = received * prototypeUsd(toAsset)

  return {
    fromAsset,
    toAsset,
    fromAmount: prettyNumber(parsed, swapAmountDecimals(parsed)),
    fromFiat: prettyFiatAmount(fromFiatNumber, Fiats.USD),
    toAmount: prettyNumber(received, swapAmountDecimals(received)),
    toFiat: prettyFiatAmount(toFiatNumber, Fiats.USD),
    rateLabel: prettyNumber(rate, swapAmountDecimals(rate)),
  }
}

function swapAmountDecimals(value: number): number {
  if (value >= 1000) return 2
  if (value >= 1) return 4
  return 8
}

function normalizeAmountInput(value: string): string {
  const sanitized = value.replace(/[^0-9.]/g, '')
  const [whole, ...fractionParts] = sanitized.split('.')
  const normalized = fractionParts.length ? `${whole}.${fractionParts.join('')}` : whole
  return normalized.slice(0, 10)
}

function stepLabel(step: SwapStep): string {
  return step.charAt(0).toUpperCase() + step.slice(1)
}

function prototypeRate(fromAsset: SwapAsset, toAsset: SwapAsset): number {
  const fromUsd = prototypeUsd(fromAsset)
  const toUsd = prototypeUsd(toAsset)
  if (!toUsd) return 0
  return fromUsd / toUsd
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

function formatAssetBalance(asset: SwapAsset): string {
  return `${prettyNumber(centsToUnits(asset.balance, asset.decimals), asset.decimals)} ${asset.ticker}`
}
