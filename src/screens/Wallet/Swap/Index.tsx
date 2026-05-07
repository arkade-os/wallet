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

type AssetTarget = 'from' | 'to'
type DrawerState = AssetTarget | 'review' | null

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
  const [amount, setAmount] = useState('0.01')
  const [fromAssetId, setFromAssetId] = useState(assets[0]?.assetId ?? 'btc')
  const [toAssetId, setToAssetId] = useState(assets[1]?.assetId ?? fallbackAsset.assetId)
  const [drawer, setDrawer] = useState<DrawerState>(null)

  const fromAsset = assets.find((asset) => asset.assetId === fromAssetId) ?? assets[0] ?? fallbackAsset
  const toAsset =
    assets.find((asset) => asset.assetId === toAssetId && asset.assetId !== fromAsset.assetId) ??
    assets.find((asset) => asset.assetId !== fromAsset.assetId) ??
    fallbackAsset
  const quote = useMemo(() => buildQuote(amount, fromAsset, toAsset), [amount, fromAsset, toAsset])

  const motionTransition = prefersReduced ? { duration: 0 } : { duration: 0.24, ease: EASE_OUT_QUINT_TUPLE }

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

  return (
    <>
      <Header text='Swap' back />
      <Content className='asset-swap-content'>
        <Padded>
          <div className='asset-swap-lab'>
            <motion.section
              key='stacked-quote'
              className='swap-flow-stage'
              initial={prefersReduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransition}
            >
              <SwapBody
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

function SwapBody({
  amount,
  quote,
  fromAsset,
  toAsset,
  onAmountChange,
  onOpenAssetDrawer,
  onSwapSides,
  onReview,
}: {
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

  return (
    <div className='swap-layout swap-layout--stack'>
      {composer}
      {details}
      <Button label='Review swap' onClick={onReview} />
    </div>
  )
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
