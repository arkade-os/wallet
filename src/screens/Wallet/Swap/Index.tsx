import Decimal from 'decimal.js'
import { AnimatePresence, motion } from 'framer-motion'
import { fromAtomic, type OfferPlan } from '@arkade-os/solver-discovery'
import { useOfferQuote } from '@arkade-os/solver-discovery/react'
import { type ReactNode, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import AssetAvatar from '../../../components/AssetAvatar'
import Button from '../../../components/Button'
import Content from '../../../components/Content'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import TokenLogo, { tokenLogoTickerForAsset } from '../../../components/TokenLogo'
import { toast } from '../../../components/Toast'
import WalletSuccessSplash from '../../../components/WalletSuccessSplash'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '../../../components/ui/popover'
import ArrowUpDownIcon from '../../../icons/ArrowUpDown'
import ChevronDownIcon from '../../../icons/ChevronDown'
import InfoIcon from '../../../icons/Info'
import SwapIcon from '../../../icons/Swap'
import { EASE_IN_OUT_QUINT_TUPLE, EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { centsToUnits, unitsToCents } from '../../../lib/assets'
import { extractError } from '../../../lib/error'
import { formatFiatAmountParts, normalizeBitcoinUnit, prettyFiatAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSubtle, hapticTap } from '../../../lib/haptics'
import { swapRouteTicker } from '../../../lib/swapDisplay'
import { BTC_ASSET_ID, findMarket, makeCachedFeedFetch, QUOTE_OPTIONS, validatePlan } from '../../../lib/swap/markets'
import { type AssetSwapQuoteSnapshot } from '../../../lib/swap/store'
import { Currencies, Unit } from '../../../lib/types'
import { AspContext } from '../../../providers/asp'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { usePortfolioFiat, type PortfolioRow } from '../../../hooks/usePortfolioFiat'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { verifiedDesignatedCurrency } from '../../../lib/accountAssets'

type AssetTarget = 'from' | 'to'
type DrawerState = 'to' | 'review' | null
type SwapStep = 'select-from' | 'compose'
type AmountMode = 'asset' | 'fiat'
type SwapValidationState = 'idle' | 'insufficient-balance' | 'quote-unavailable'
type SwapValidationVariant = 'sonner' | 'inline'

interface SwapAsset {
  assetId: string
  name: string
  ticker: string
  decimals: number
  balance: number | bigint
  fiatText?: string
  icon?: string
  usdPrice?: number
}

interface SwapQuote {
  fromAsset: SwapAsset
  toAsset?: SwapAsset
  fromAmount: string
  fromFiat: string
  toAmount: string
  toFiat: string
  feeLabel: string
  rateFromTicker: string
  rateToTicker: string
  rateLabel: string
  fromFiatValue: number
  toFiatValue: number
  giveFiatValue: number
}

interface ExitingAmountCharacter {
  character: string
  id: number
  slotClassName: string
}

const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back']
const rateNote = 'Rates are dynamic and may update before you confirm.'
const rateNoteAutoDismissMs = 2400
const emptySwapAsset: SwapAsset = {
  assetId: 'swap-empty',
  name: 'Asset',
  ticker: 'ASSET',
  decimals: 0,
  balance: BigInt(0),
  usdPrice: 0,
}

export default function WalletSwap() {
  const { aspInfo } = useContext(AspContext)
  const { createSwap, markets, swapAvailable } = useContext(AssetSwapsContext)
  const { config } = useContext(ConfigContext)
  const { fiatDecimals, fromFiatAmount, toFiat, toFiatAmount } = useContext(FiatContext)
  const { swapFromAssetId, setSwapFromAssetId } = useContext(FlowContext)
  const { goBack, navigate } = useContext(NavigationContext)
  const { assetBalances, assetMetadataCache, availableBalance, isVerifiedAsset } = useContext(WalletContext)
  const { rows } = usePortfolioFiat()
  const prefersReduced = useReducedMotion()

  const btcUnit = normalizeBitcoinUnit(config.unit)
  const swapAssets = useMemo<SwapAsset[]>(() => {
    const marketAssets = markets.flatMap((market) => [market.base_asset, market.quote_asset])
    const uniqueAssets = new Map(marketAssets.map((asset) => [asset.id, asset]))
    uniqueAssets.set(BTC_ASSET_ID, {
      id: BTC_ASSET_ID,
      name: 'Bitcoin',
      ticker: 'BTC',
      decimals: 8,
    })

    return [...uniqueAssets.values()].map((asset) => {
      if (asset.id === BTC_ASSET_ID) {
        const bitcoinRow = rows.find((row) => row.assetId === 'btc')
        return {
          assetId: BTC_ASSET_ID,
          name: 'Bitcoin',
          // BTC enters/displays in whatever unit the wallet's bitcoin-unit
          // setting picks (sats/BTC/₿), same as the rest of the wallet
          ticker: btcUnit === Unit.BTC ? 'BTC' : btcUnit,
          decimals: btcUnit === Unit.BTC ? 8 : 0,
          balance: BigInt(availableBalance),
          fiatText: bitcoinRow?.hasFiatPrice
            ? prettyFiatAmount(bitcoinRow.fiatAmount, config.currency, { bitcoinUnit: config.unit })
            : undefined,
          usdPrice: bitcoinRow
            ? estimateRowUsdPrice(bitcoinRow, config.currency, fromFiatAmount, toFiat, toFiatAmount)
            : 0,
        }
      }

      const row = rows.find((candidate) => candidate.assetId === asset.id)
      const owned = assetBalances.find((balance) => balance.assetId === asset.id)
      const designatedCurrency = verifiedDesignatedCurrency(aspInfo.network, asset.id, isVerifiedAsset)
      return {
        assetId: asset.id,
        name: row?.name ?? designatedCurrency ?? asset.name,
        ticker: row?.ticker ?? designatedCurrency ?? asset.ticker,
        decimals: asset.decimals,
        balance: BigInt(owned?.amount ?? 0),
        fiatText: row?.hasFiatPrice
          ? prettyFiatAmount(row.fiatAmount, config.currency, { bitcoinUnit: config.unit })
          : undefined,
        icon: assetMetadataCache.get(asset.id)?.metadata?.icon,
        usdPrice: row ? estimateRowUsdPrice(row, config.currency, fromFiatAmount, toFiat, toFiatAmount) : 0,
      }
    })
  }, [
    assetBalances,
    assetMetadataCache,
    aspInfo.network,
    availableBalance,
    btcUnit,
    config.currency,
    config.unit,
    fromFiatAmount,
    isVerifiedAsset,
    markets,
    rows,
    toFiat,
    toFiatAmount,
  ])
  const initialFromAssetId = resolveInitialFromAssetId(swapAssets, swapFromAssetId)
  const openedWithPreselectedAsset = useRef(Boolean(swapFromAssetId))
  const [step, setStep] = useState<SwapStep>(swapFromAssetId && initialFromAssetId ? 'compose' : 'select-from')
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState('0')
  const [amountMode, setAmountMode] = useState<AmountMode>('fiat')
  const [fromAssetId, setFromAssetId] = useState(initialFromAssetId ?? swapAssets[0]?.assetId ?? 'btc')
  const [toAssetId, setToAssetId] = useState<string | undefined>()
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [swapTurn, setSwapTurn] = useState(0)
  const [invalidPulse, setInvalidPulse] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [successQuote, setSuccessQuote] = useState<SwapQuote>()
  const [validationVariant, setValidationVariant] = useState<SwapValidationVariant>('sonner')

  const fromAsset =
    swapAssets.find((asset) => asset.assetId === fromAssetId) ??
    firstPositiveBalanceAsset(swapAssets) ??
    swapAssets[0] ??
    emptySwapAsset
  const toAsset = toAssetId
    ? swapAssets.find((asset) => asset.assetId === toAssetId && asset.assetId !== fromAsset.assetId)
    : undefined
  const unitOfAccountUsd = toFiatAmount(fromFiatAmount(1, config.currency), Currencies.USD)
  const pair = toAsset ? findMarket(markets, fromAsset.assetId, toAsset.assetId) : undefined
  // per-mount cache: a burst of keystroke-debounced quotes reuses one feed
  // value instead of getting rate-limited into "Quote unavailable"
  const feedFetch = useMemo(() => makeCachedFeedFetch(), [])
  const { plan, setGiveAmount, solvable, status } = useOfferQuote(pair?.market ?? null, {
    give: pair?.give,
    fetchImpl: feedFetch,
    ...QUOTE_OPTIONS,
  })
  const assetAmount = amountInAssetUnits(amount, amountMode, fromAsset, unitOfAccountUsd)
  const [quotedAmount, setQuotedAmount] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGiveAmount(Number(assetAmount) > 0 ? amountForQuote(assetAmount, fromAsset) : '')
      setQuotedAmount(amount)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [amount, assetAmount, fromAsset, setGiveAmount])

  const quoteStale = quotedAmount !== amount
  const planError = plan ? validatePlan(plan, assetBalanceAtomic(fromAsset), aspInfo.dust) : undefined
  const exceedsBalance = unitsToCents(assetAmount, fromAsset.decimals) > assetBalanceAtomic(fromAsset)
  const validationMessage = swapValidationMessage({
    amount,
    exceedsBalance,
    fromAsset,
    pairAvailable: toAsset ? Boolean(pair?.market) : undefined,
    plan,
    planError,
    solvable: solvable ?? undefined,
    status,
  })
  const quote = useMemo(
    () =>
      buildQuoteFromPlan(plan, amount, amountMode, fromAsset, toAsset, unitOfAccountUsd, config.currency, config.unit),
    [amount, amountMode, config.currency, config.unit, fromAsset, plan, toAsset, unitOfAccountUsd],
  )
  const hasPositiveAmount = Number(amount) > 0
  const validationState: SwapValidationState =
    validationMessage && validationMessage !== 'Insufficient balance'
      ? 'quote-unavailable'
      : validationMessage === 'Insufficient balance'
        ? 'insufficient-balance'
        : 'idle'
  const quoteLoading = status === 'loading' || (quoteStale && hasPositiveAmount)
  const canContinue = Boolean(toAsset && plan && status === 'success' && !planError && !quoteStale)

  const stageTransition = prefersReduced ? { duration: 0 } : { duration: 0.28, ease: EASE_IN_OUT_QUINT_TUPLE }

  const filteredAssets = useMemo(() => filterAssets(swapAssets, search), [search, swapAssets])

  useEffect(() => {
    if (swapAssets.length === 0) return
    const currentAssetStillAvailable = swapAssets.some((asset) => asset.assetId === fromAssetId)
    if (currentAssetStillAvailable) return
    setFromAssetId(resolveInitialFromAssetId(swapAssets, swapFromAssetId) ?? swapAssets[0]?.assetId ?? 'btc')
  }, [fromAssetId, swapAssets, swapFromAssetId])

  const focusFromAsset = useCallback(
    (assetId: string) => {
      setFromAssetId(assetId)
      setToAssetId((current) =>
        current && current !== assetId && findMarket(markets, assetId, current)?.market ? current : undefined,
      )
      setSearch('')
      setStep('compose')
    },
    [markets],
  )

  useEffect(() => {
    if (!swapFromAssetId || swapAssets.length === 0) return
    if (!swapAvailable) {
      setSwapFromAssetId(undefined)
      setStep('select-from')
      return
    }

    const nextFromAssetId = resolveInitialFromAssetId(swapAssets, swapFromAssetId) ?? swapAssets[0]?.assetId ?? 'btc'

    focusFromAsset(nextFromAssetId)
    setSwapFromAssetId(undefined)
  }, [focusFromAsset, setSwapFromAssetId, swapAssets, swapAvailable, swapFromAssetId])

  useEffect(() => {
    if (validationState === 'idle') return
    hapticSubtle()
    setInvalidPulse((current) => current + 1)
  }, [validationState])

  useEffect(() => {
    if (validationVariant !== 'sonner' || !validationMessage) {
      toast.dismiss('swap-validation')
      return
    }
    toast.error(validationMessage, { id: 'swap-validation' })
  }, [amount, validationMessage, validationVariant])

  useEffect(
    () => () => {
      toast.dismiss('swap-validation')
    },
    [],
  )

  const openDrawer = (nextDrawer: DrawerState) => {
    hapticLight()
    if (nextDrawer === 'review') setConfirmError('')
    setDrawer(nextDrawer)
  }

  const selectFromAsset = (asset: SwapAsset) => {
    hapticLight()
    focusFromAsset(asset.assetId)
  }

  const selectToAsset = (_target: AssetTarget, asset: SwapAsset) => {
    hapticLight()
    setConfirmError('')
    setToAssetId(asset.assetId)
    if (asset.assetId === fromAsset.assetId) setFromAssetId(toAsset?.assetId ?? fromAsset.assetId)
    setDrawer(null)
  }

  const swapSides = () => {
    if (!toAsset) return
    hapticLight()
    setAmount('0')
    setGiveAmount('')
    setSwapTurn((current) => current + 1)
    setFromAssetId(toAsset.assetId)
    setToAssetId(fromAsset.assetId)
  }

  const pressKey = (key: string) => {
    setConfirmError('')
    const maxDecimals = amountMode === 'fiat' ? fiatDecimals() : fromAsset.decimals
    const canApplyKey = (current: string) => {
      if (key === 'Back') return current !== '0'
      const base = current === '0' && key !== '.' ? '' : current
      if (key === '.') return maxDecimals > 0 && !base.includes('.')
      const decimalIndex = base.indexOf('.')
      return decimalIndex < 0 || base.length - decimalIndex - 1 < maxDecimals
    }

    if (!canApplyKey(amount)) return
    hapticTap()

    if (key === 'Back') {
      setAmount((current) => current.slice(0, -1) || '0')
      return
    }
    setAmount((current) => {
      const base = current === '0' && key !== '.' ? '' : current
      if (key === '.') return maxDecimals > 0 && !base.includes('.') ? `${base}.` : current
      const decimalIndex = base.indexOf('.')
      if (decimalIndex >= 0 && base.length - decimalIndex - 1 >= maxDecimals) return current
      return `${base}${key}`.slice(0, 10)
    })
  }

  const toggleAmountMode = () => {
    hapticLight()
    // promote the value the secondary pill was showing — flipping only the
    // unit would reread "115 BRL" as "€115" (#839). The fiat figure floors at
    // display precision so a Max entry can't round above the balance.
    const scale = Math.pow(10, fiatDecimals())
    const converted =
      amountMode === 'asset'
        ? prettyNumber(Math.floor(quote.fromFiatValue * scale) / scale, fiatDecimals(), false)
        : assetAmount
    setAmount(Number(converted) > 0 ? converted : '0')
    setAmountMode((current) => (current === 'asset' ? 'fiat' : 'asset'))
  }

  const useMaxBalance = () => {
    const rawBalance = assetBalanceAtomic(fromAsset)
    if (rawBalance <= BigInt(0)) return
    hapticLight()
    setConfirmError('')
    // enter the exact balance in the asset's own units — sidestep the fiat
    // round-trip so "max" funds the whole balance to the last atomic unit
    setAmountMode('asset')
    setAmount(centsToUnits(rawBalance, fromAsset.decimals))
  }

  const handleBack = () => {
    if (step === 'compose' && !openedWithPreselectedAsset.current) {
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

  const confirmSwap = async () => {
    if (!plan || !toAsset || confirming || !canContinue) return

    setConfirmError('')
    setConfirming(true)
    try {
      await createSwap(plan, buildQuoteSnapshot(plan, quote, config.currency))
      setDrawer(null)
      setSuccessQuote(quote)
      hapticLight()
    } catch (error) {
      setConfirmError(extractError(error))
    } finally {
      setConfirming(false)
    }
  }

  const receiveAssets = swapAssets.filter((asset) =>
    Boolean(findMarket(markets, fromAsset.assetId, asset.assetId)?.market),
  )

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
                  {swapAvailable ? (
                    <SwapAssetList
                      title='Choose asset to swap'
                      search={search}
                      assets={filteredAssets}
                      empty={filteredAssets.length === 0}
                      onSearch={setSearch}
                      onSelect={selectFromAsset}
                    />
                  ) : (
                    <SwapUnavailableState />
                  )}
                </motion.section>
              ) : (
                <motion.section
                  key='compose'
                  className='swap-flow-stage swap-flow-stage--compose'
                  initial={prefersReduced ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReduced ? undefined : { opacity: 0, x: 18 }}
                  transition={stageTransition}
                >
                  <SwapComposer
                    amount={amount}
                    amountMode={amountMode}
                    currency={config.currency}
                    bitcoinUnit={config.unit}
                    quote={quote}
                    fromAsset={fromAsset}
                    toAsset={toAsset}
                    onAmountFocus={() => {}}
                    onModeToggle={toggleAmountMode}
                    onOpenReceiveDrawer={() => openDrawer('to')}
                    onSwapSides={swapSides}
                    onUseMaxBalance={useMaxBalance}
                    validationState={validationState}
                    validationText={validationMessage}
                    validationVariant={validationVariant}
                    invalidPulse={invalidPulse}
                    quoteLoading={quoteLoading}
                    swapTurn={swapTurn}
                  />
                  <Keypad amount={amount} onPress={pressKey} />
                  <Button label='Continue' disabled={!canContinue} onClick={() => openDrawer('review')} />
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </Padded>
      </Content>

      {step === 'compose' ? (
        <ValidationVariantSwitcher variant={validationVariant} onChange={setValidationVariant} />
      ) : null}

      <AssetPickerDrawer
        open={drawer === 'to'}
        target='to'
        assets={receiveAssets}
        selectedId={toAsset?.assetId}
        onOpenChange={(open) => {
          if (!open) setDrawer(null)
        }}
        onSelect={selectToAsset}
      />

      <ReviewDrawer
        open={drawer === 'review'}
        quote={quote}
        canConfirm={canContinue}
        confirming={confirming}
        error={confirmError}
        quoteLoading={quoteLoading}
        onOpenChange={(open) => {
          // keep the drawer up while the swap is being created so a late
          // failure still has a surface to report on
          if (!open && !confirming) setDrawer(null)
        }}
        onConfirm={confirmSwap}
      />
      <SwapSuccessOverlay quote={successQuote} onDone={handleSuccessDone} />
    </>
  )
}

function SwapUnavailableState() {
  return (
    <div className='swap-unavailable-state'>
      <span className='swap-unavailable-state__icon'>
        <SwapIcon />
      </span>
      <div>
        <p>Swaps are unavailable</p>
        <span>Add another supported asset to swap between balances.</span>
      </div>
    </div>
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
  currency,
  bitcoinUnit,
  quote,
  fromAsset,
  toAsset,
  onAmountFocus,
  onModeToggle,
  onOpenReceiveDrawer,
  onSwapSides,
  onUseMaxBalance,
  validationState,
  validationText,
  validationVariant,
  invalidPulse,
  quoteLoading,
  swapTurn,
}: {
  amount: string
  amountMode: AmountMode
  currency: Currencies
  bitcoinUnit: Unit
  quote: SwapQuote
  fromAsset: SwapAsset
  toAsset?: SwapAsset
  onAmountFocus: () => void
  onModeToggle: () => void
  onOpenReceiveDrawer: () => void
  onSwapSides: () => void
  onUseMaxBalance: () => void
  validationState: SwapValidationState
  validationText: string
  validationVariant: SwapValidationVariant
  invalidPulse: number
  quoteLoading: boolean
  swapTurn: number
}) {
  const prefersReduced = useReducedMotion()
  const amountLabel =
    amountMode === 'fiat' ? formatCurrencyInputAmount(amount, currency, bitcoinUnit) : `${amount} ${fromAsset.ticker}`
  const subAmountLabel = amountMode === 'fiat' ? `${quote.fromAmount} ${fromAsset.ticker}` : quote.fromFiat
  const nextAmountModeLabel = amountMode === 'fiat' ? 'asset amount' : `${currency} amount`
  const inlineValidation = validationVariant === 'inline' ? validationText : ''
  const secondaryTransition = {
    duration: prefersReduced ? 0 : 0.16,
    ease: EASE_OUT_QUINT_TUPLE,
  }
  const secondaryMotion = {
    initial: prefersReduced ? false : { opacity: 0, y: 4, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: prefersReduced ? undefined : { opacity: 0, y: -4, scale: 0.97 },
    transition: secondaryTransition,
  }

  return (
    <div className='swap-composer'>
      <div className='swap-input-card'>
        <div className='swap-input-card__asset'>
          <TokenAvatar asset={fromAsset} size={36} />
          <div className='swap-input-card__asset-copy'>
            <span>{fromAsset.name}</span>
            <button type='button' className='swap-input-card__balance' onClick={onUseMaxBalance}>
              {formatAssetBalance(fromAsset)}
            </button>
          </div>
        </div>
        <div className='swap-amount-stack'>
          <motion.button
            key={invalidPulse}
            type='button'
            className={
              validationState === 'idle' ? 'swap-amount-display' : 'swap-amount-display swap-amount-display--invalid'
            }
            onClick={onAmountFocus}
            aria-label='Swap amount'
            animate={prefersReduced || validationState === 'idle' ? undefined : { x: [0, -7, 6, -4, 2, 0] }}
            transition={
              prefersReduced || validationState === 'idle' ? undefined : { duration: 0.32, ease: EASE_OUT_QUINT_TUPLE }
            }
          >
            <AnimatedAmountValue value={amountLabel} reducedMotion={prefersReduced} />
          </motion.button>
        </div>
        <div className='swap-amount-secondary-slot' aria-live='polite'>
          <AnimatePresence mode='wait' initial={false}>
            {inlineValidation === 'Insufficient balance' ? (
              <motion.button
                key='max'
                type='button'
                className='swap-inline-validation swap-inline-validation--action'
                onClick={onUseMaxBalance}
                aria-label={`Use maximum ${formatAssetBalance(fromAsset)}`}
                {...secondaryMotion}
              >
                Max {formatAssetBalance(fromAsset)}
              </motion.button>
            ) : inlineValidation ? (
              <motion.span key={inlineValidation} className='swap-inline-validation' role='status' {...secondaryMotion}>
                {inlineValidation}
              </motion.span>
            ) : (
              <motion.button
                key='amount'
                type='button'
                className='swap-amount-secondary'
                onClick={onModeToggle}
                aria-label={`Show ${nextAmountModeLabel} first`}
                {...secondaryMotion}
              >
                <AnimatedSecondaryAmountValue value={subAmountLabel} reducedMotion={prefersReduced} />
                <motion.span
                  className='swap-amount-secondary__icon'
                  animate={{ rotate: amountMode === 'fiat' ? 0 : 180 }}
                  transition={{ duration: prefersReduced ? 0 : 0.22, ease: EASE_IN_OUT_QUINT_TUPLE }}
                  aria-hidden='true'
                >
                  <ArrowUpDownIcon />
                </motion.span>
              </motion.button>
            )}
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
              <small>
                {quoteLoading ? <SwapSkeletonText width='5.75rem' /> : `${quote.toAmount} ${toAsset.ticker}`}
              </small>
            </div>
            <strong>{quoteLoading ? <SwapSkeletonText width='3.75rem' /> : quote.toFiat}</strong>
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

function ValidationVariantSwitcher({
  variant,
  onChange,
}: {
  variant: SwapValidationVariant
  onChange: (variant: SwapValidationVariant) => void
}) {
  const [open, setOpen] = useState(false)

  const selectVariant = (nextVariant: SwapValidationVariant) => {
    hapticLight()
    onChange(nextVariant)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className='swap-variant-trigger' aria-label='Choose validation variant' onClick={hapticLight}>
        {variant === 'sonner' ? 'V1' : 'V2'}
      </PopoverTrigger>
      <PopoverContent className='swap-variant-popover' side='top' align='end' sideOffset={8}>
        <PopoverHeader>
          <PopoverTitle>Validation feedback</PopoverTitle>
          <PopoverDescription>Compare how swap errors appear.</PopoverDescription>
        </PopoverHeader>
        <div className='swap-variant-options' role='radiogroup' aria-label='Validation feedback variant'>
          <button
            type='button'
            className='swap-variant-option'
            role='radio'
            aria-checked={variant === 'sonner'}
            onClick={() => selectVariant('sonner')}
          >
            <span className='swap-variant-option__badge'>V1</span>
            <span>
              <strong>Sonner toast</strong>
              <small>Temporary message above the screen.</small>
            </span>
          </button>
          <button
            type='button'
            className='swap-variant-option'
            role='radio'
            aria-checked={variant === 'inline'}
            onClick={() => selectVariant('inline')}
          >
            <span className='swap-variant-option__badge'>V2</span>
            <span>
              <strong>Inline max</strong>
              <small>Replaces the conversion pill.</small>
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SwapSkeletonText({ width }: { width: string }) {
  return <span className='swap-skeleton-text' style={{ width }} aria-hidden='true' />
}

function AnimatedAmountValue({ value, reducedMotion }: { value: string; reducedMotion: boolean }) {
  const previousValueRef = useRef(value)
  const exitingIdRef = useRef(0)
  const [exitingCharacters, setExitingCharacters] = useState<ExitingAmountCharacter[]>([])
  const characters = Array.from(value)
  const previousCharacters = Array.from(previousValueRef.current)
  const shouldAnimate = previousValueRef.current !== value
  const isAdding = value.length > previousValueRef.current.length

  useEffect(() => {
    const previousCharactersForExit = Array.from(previousValueRef.current)
    const nextCharacters = Array.from(value)
    const isDeleting = nextCharacters.length < previousCharactersForExit.length

    if (isDeleting) {
      const removedCharacters = previousCharactersForExit.slice(nextCharacters.length).map((character) => ({
        character,
        id: exitingIdRef.current++,
        slotClassName: amountCharacterSlotClassName(character),
      }))
      setExitingCharacters(removedCharacters)
      const timer = window.setTimeout(() => setExitingCharacters([]), 180)
      previousValueRef.current = value
      return () => window.clearTimeout(timer)
    }

    setExitingCharacters([])
    previousValueRef.current = value
  }, [value])

  return (
    <span
      className='swap-amount-value'
      aria-label={value}
      style={{ '--swap-amount-scale': amountFontScale(value.length) } as React.CSSProperties}
    >
      <AnimatePresence initial={false}>
        {characters.map((character, characterIndex) => {
          const characterChanged = previousCharacters[characterIndex] !== character
          const entering = shouldAnimate && (characterChanged || characterIndex >= previousCharacters.length)
          return (
            <motion.span
              key={amountCharacterSlotKey(character, characterIndex, characters)}
              className={amountCharacterSlotClassName(character)}
              initial={reducedMotion ? false : { opacity: 0, y: isAdding ? 12 : 7 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -7 }}
              transition={
                reducedMotion ? { duration: 0 } : { duration: isAdding ? 0.28 : 0.16, ease: EASE_OUT_QUINT_TUPLE }
              }
            >
              <AnimatePresence mode='popLayout' initial={shouldAnimate}>
                <motion.span
                  key={character}
                  className={
                    entering && !reducedMotion
                      ? 'swap-amount-character swap-amount-character--entering'
                      : 'swap-amount-character'
                  }
                  initial={reducedMotion ? false : { opacity: 0, y: isAdding ? 12 : 7 }}
                  animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={
                    reducedMotion ? { duration: 0 } : { duration: isAdding ? 0.28 : 0.16, ease: EASE_OUT_QUINT_TUPLE }
                  }
                  aria-hidden='true'
                >
                  {character === ' ' ? '\u00a0' : character}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          )
        })}
      </AnimatePresence>
      {exitingCharacters.map(({ character, id, slotClassName }) => (
        <span key={`exiting-${id}`} className={`${slotClassName} swap-amount-character-slot--exiting`}>
          <span className='swap-amount-character swap-amount-character--exiting' aria-hidden='true'>
            {character === ' ' ? '\u00a0' : character}
          </span>
        </span>
      ))}
    </span>
  )
}

/** Long amounts (a full-precision balance plus ticker) shrink in steps so
 * they stay inside the card — stepped rather than fit-to-width so the
 * per-character animation keeps stable metrics while typing. */
function amountFontScale(length: number): number {
  if (length <= 12) return 1
  if (length <= 16) return 0.8
  if (length <= 20) return 0.66
  if (length <= 26) return 0.54
  return 0.44
}

function amountCharacterSlotKey(character: string, characterIndex: number, source: string[]): string {
  if (/\d/.test(character)) {
    const digitPosition = source.slice(0, characterIndex).filter((candidate) => /\d/.test(candidate)).length
    return `digit-${digitPosition}`
  }

  if (character === '.') return 'decimal-point'
  if (character === ' ')
    return `space-${source.slice(0, characterIndex).filter((candidate) => candidate === ' ').length}`
  // a repeated letter in the ticker suffix (e.g. the two 's' in "sats") must
  // not collapse onto the same React key, or the animated renderer smears it
  return `symbol-${character}-${source.slice(0, characterIndex).filter((candidate) => candidate === character).length}`
}

function amountCharacterSlotClassName(character: string): string {
  if (character === ' ') return 'swap-amount-character-slot swap-amount-character-slot--space'
  if (/\d/.test(character)) return 'swap-amount-character-slot swap-amount-character-slot--digit'
  return 'swap-amount-character-slot'
}

function AnimatedSecondaryAmountValue({ value, reducedMotion }: { value: string; reducedMotion: boolean }) {
  return (
    <span className='swap-amount-value swap-amount-value--secondary' aria-label={value}>
      <AnimatePresence mode='wait' initial={false}>
        <motion.span
          key={value}
          initial={reducedMotion ? false : { opacity: 0, y: 5 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -5 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.14, ease: EASE_OUT_QUINT_TUPLE }}
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
      {asset.fiatText ? <strong>{asset.fiatText}</strong> : null}
    </button>
  )
}

function TokenAvatar({ asset, size }: { asset: SwapAsset; size: number }) {
  const tokenLogoTicker = tokenLogoTickerForAsset(asset.assetId, asset.ticker)
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
        <DrawerHeader className='swap-picker-header'>
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
  canConfirm,
  confirming,
  error,
  quoteLoading,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  quote: SwapQuote
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
        <div className='swap-review-drawer-body'>
          <ReviewSummary quote={quote} loading={quoteLoading} />
          <QuoteDetails quote={quote} loading={quoteLoading} />
        </div>
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

function SwapSuccessOverlay({ quote, onDone }: { quote?: SwapQuote; onDone: () => void }) {
  return (
    <WalletSuccessSplash
      show={Boolean(quote)}
      headline='Swap created'
      text={
        quote
          ? `${swapRouteTicker(quote.fromAsset.assetId, quote.fromAsset.ticker)} to ${swapRouteTicker(quote.toAsset?.assetId, quote.toAsset?.ticker)} · Waiting for fill`
          : undefined
      }
      ariaLabel='Swap created. Tap to go home.'
      onDone={onDone}
    />
  )
}

function ReviewSummary({ quote, loading }: { quote: SwapQuote; loading: boolean }) {
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
            {swapRouteTicker(quote.fromAsset.assetId, quote.fromAsset.ticker)} to{' '}
            {swapRouteTicker(quote.toAsset?.assetId, quote.toAsset?.ticker) ?? 'asset'}
          </h3>
        </div>
      </div>
      <MetricRow label='Swap' value={`${quote.fromAmount} ${quote.fromAsset.ticker}`} loading={loading} />
      <MetricRow
        label='Receive'
        value={quote.toAsset ? `${quote.toAmount} ${quote.toAsset.ticker}` : 'Choose asset'}
        loading={loading}
      />
      <MetricRow label='Fees' value={quote.feeLabel} loading={loading} />
    </div>
  )
}

function QuoteDetails({ quote, loading }: { quote: SwapQuote; loading: boolean }) {
  return (
    <div className='swap-detail-card'>
      <MetricRow
        label={<RateLabel />}
        value={quote.toAsset ? `1 ${quote.rateFromTicker} = ${quote.rateLabel} ${quote.rateToTicker}` : 'Pending'}
        loading={loading}
      />
    </div>
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

function buildQuoteFromPlan(
  plan: OfferPlan | null,
  amount: string,
  mode: AmountMode,
  fromAsset: SwapAsset,
  toAsset: SwapAsset | undefined,
  unitOfAccountUsd: number,
  currency: Currencies,
  bitcoinUnit: Unit,
): SwapQuote {
  const parsed = Number(amount) || 0
  const fromUsd = estimateSwapUsd(fromAsset)
  const toUsd = toAsset ? estimateSwapUsd(toAsset) : 0
  const fromScale = protocolToDisplayScale(fromAsset)
  const toScale = toAsset ? protocolToDisplayScale(toAsset) : 1
  // fromUsd/toUsd price per whole protocol unit (whole BTC, not sats), same
  // as the solver's plan.*.display — do the USD math and the rate in that
  // scale, and only convert to sats for the on-screen amount labels below.
  const estimatedFromUnitsProtocol =
    mode === 'fiat'
      ? (assetUnitsFromFiatAmount(amount, fromAsset, unitOfAccountUsd) ?? 0) / fromScale
      : parsed / fromScale
  const fromUnitsProtocol = plan ? Number(plan.deposit.display) : estimatedFromUnitsProtocol
  const receivedProtocol = plan && toAsset ? Number(plan.receive.display) : 0
  const fromUnits = fromUnitsProtocol * fromScale
  const received = receivedProtocol * toScale
  const receivedCurrencyAmount = unitOfAccountUsd > 0 ? (receivedProtocol * toUsd) / unitOfAccountUsd : 0
  const feeFraction = (plan?.market.fee_bps ?? 0) / 10_000
  // received amounts are net of the fee; grossUp recovers the pre-fee total
  const grossUp = feeFraction < 1 ? 1 / (1 - feeFraction) : 0
  // once a live quote exists, price the give side off that SAME quote (via
  // the solver's own exchange rate) instead of this asset's own independent
  // price estimate — fromUsd/toUsd are fetched from two unrelated feeds, and
  // when they disagree even slightly the two sides of one trade can show
  // wildly different dollar values. Fall back to the independent per-asset
  // estimate before a quote exists, OR when the receive asset has no price
  // feed (receivedCurrencyAmount 0) — otherwise a priced give side would read
  // $0 just because the receive side can't be valued.
  const giveEstimate = unitOfAccountUsd > 0 ? (fromUnitsProtocol * fromUsd) / unitOfAccountUsd : 0
  const selectedCurrencyAmount =
    plan && toAsset && grossUp > 0 && receivedCurrencyAmount > 0 ? receivedCurrencyAmount * grossUp : giveEstimate
  const rate = fromUnitsProtocol > 0 ? receivedProtocol / fromUnitsProtocol : 0
  // the market fee is deducted from the payout, so show it in the receive
  // asset (like the Swap/Receive rows), not the wallet's fiat display currency:
  // the fee is the gross-minus-net gap
  const feeReceived = received * feeFraction * grossUp
  const formatOptions = { bitcoinUnit }

  return {
    fromAsset,
    toAsset,
    fromAmount: formatAssetQuantity(fromUnits, fromAsset.decimals),
    fromFiat: prettyFiatAmount(selectedCurrencyAmount, currency, formatOptions),
    toAmount: toAsset ? formatAssetQuantity(received, toAsset.decimals) : '0',
    toFiat: prettyFiatAmount(receivedCurrencyAmount, currency, formatOptions),
    feeLabel: toAsset ? `${formatAssetQuantity(feeReceived, toAsset.decimals)} ${toAsset.ticker}` : '',
    // the rate is always quoted per whole BTC even though amounts display in
    // sats — "1 sats = 0.0000006 USD" is technically correct but unreadable
    rateFromTicker: swapRouteTicker(fromAsset.assetId, fromAsset.ticker) ?? '',
    rateToTicker: toAsset ? (swapRouteTicker(toAsset.assetId, toAsset.ticker) ?? '') : '',
    rateLabel: prettyNumber(rate, swapAmountDecimals(rate)),
    fromFiatValue: selectedCurrencyAmount,
    toFiatValue: receivedCurrencyAmount,
    // what the persisted receipt echoes as the trade's volume: in fiat entry
    // the user committed a fiat figure converted at the wallet's own rate, so
    // echo it back (a "$5" swap reads $5.00 in activity, not a solver-rate
    // $4.99); in unit entry the solver-priced give label is what they saw
    // next to their amount and confirmed
    giveFiatValue: mode === 'fiat' ? giveEstimate : selectedCurrencyAmount,
  }
}

/** BTC's USD price and the solver's plan.*.display are both in whole-BTC
 * scale, but the swap screen enters/displays BTC in whatever unit the wallet
 * picks — sats/₿ (0 entry decimals) needs scaling up from whole BTC, while
 * BTC entry (8 decimals) is already that same scale (a no-op, like every
 * other asset). */
function protocolToDisplayScale(asset: SwapAsset): number {
  return asset.assetId === BTC_ASSET_ID && asset.decimals === 0 ? 1e8 : 1
}

/** USD-fiat amount converted into the asset's entry/display scale (sats for
 * BTC, the asset's own decimals otherwise). Returns undefined with no price feed. */
function assetUnitsFromFiatAmount(amount: string, fromAsset: SwapAsset, unitOfAccountUsd: number): number | undefined {
  const assetUsd = estimateSwapUsd(fromAsset)
  if (!assetUsd) return undefined
  return (((Number(amount) || 0) * unitOfAccountUsd) / assetUsd) * protocolToDisplayScale(fromAsset)
}

function amountInAssetUnits(amount: string, mode: AmountMode, fromAsset: SwapAsset, unitOfAccountUsd: number): string {
  if (mode === 'asset') return amount
  const units = assetUnitsFromFiatAmount(amount, fromAsset, unitOfAccountUsd)
  if (units === undefined) return ''
  // this string is parsed by Number()/BigInt downstream (the quote debounce
  // gate, amountForQuote, the solver's giveAmount) — no thousands separators
  return prettyNumber(units, fromAsset.decimals, false)
}

function amountForQuote(amount: string, fromAsset: SwapAsset): string {
  // BTC entered in whole-BTC (8 decimals) is already the solver's expected
  // format — only a sats/₿ (0-decimal) entry needs converting to atomic
  if (fromAsset.assetId !== BTC_ASSET_ID || fromAsset.decimals > 0) return amount
  return fromAtomic(BigInt(amount.split('.')[0].replace(/\D/g, '') || '0'), 8)
}

function swapValidationMessage({
  amount,
  exceedsBalance,
  fromAsset,
  pairAvailable,
  plan,
  planError,
  solvable,
  status,
}: {
  amount: string
  exceedsBalance: boolean
  fromAsset: SwapAsset
  pairAvailable: boolean | undefined
  plan: OfferPlan | null
  planError: ReturnType<typeof validatePlan>
  solvable: boolean | undefined
  status: string
}): string {
  if (!Number(amount)) return ''
  if (exceedsBalance) return 'Insufficient balance'
  if (pairAvailable === undefined) return ''
  if (!pairAvailable || solvable === false) return 'Swap unavailable for this pair'
  if (status === 'error') return 'Quote unavailable'
  if (!plan) return ''
  switch (planError) {
    case 'insufficient-balance':
      return 'Insufficient balance'
    case 'side-disabled':
      return 'Swap unavailable for this pair'
    case 'below-min':
      return formatLimitMessage('Minimum', plan.limits.min, plan, fromAsset)
    case 'above-max':
      return formatLimitMessage('Maximum', plan.limits.max, plan, fromAsset)
    case 'below-dust':
      return 'Amount too small'
    default:
      return ''
  }
}

/** plan.limits bound the RECEIVE side (see validatePlan), but the user is
 * typing the GIVE (from) side — quoting a receive-side minimum/maximum while
 * they're staring at the from-asset field reads as a typo ("Minimum 1 USDT"
 * while typing a BTC amount). Convert through the plan's own price into the
 * equivalent give-side amount instead. */
function formatLimitMessage(
  label: string,
  limit: OfferPlan['limits']['min'],
  plan: OfferPlan,
  fromAsset: SwapAsset,
): string {
  if (!limit) return ''
  const price = Number(plan.priceDisplay)
  if (!price) return ''
  const limitReceiveProtocol = Number(limit.display)
  // the limits bound the NET receive side (post-fee), but priceDisplay is the
  // pre-fee rate — gross the bound up by the market fee or the suggested give
  // amount pays out just under the minimum
  const feeFraction = plan.market.fee_bps / 10_000
  const grossUp = feeFraction < 1 ? 1 / (1 - feeFraction) : 1
  // priceDisplay is quote-per-base; convert the receive-side limit back to
  // the give side using whichever side the plan actually gives
  const giveProtocol = (plan.give === 'base' ? limitReceiveProtocol / price : limitReceiveProtocol * price) * grossUp
  // the market card also bounds the give side directly (atomic units of the
  // deposit asset); the user must satisfy whichever constraint is tighter —
  // e.g. a 1,000-sat card floor outranks a smaller converted receive minimum
  const isMin = label === 'Minimum'
  const giveCardAtomic = Number(
    isMin
      ? plan.give === 'base'
        ? plan.market.min_base_amount
        : plan.market.min_quote_amount
      : plan.give === 'base'
        ? plan.market.max_base_amount
        : plan.market.max_quote_amount,
  )
  const giveCardProtocol = giveCardAtomic / Math.pow(10, plan.deposit.asset.decimals)
  const combinedProtocol = isMin
    ? Math.max(giveProtocol, giveCardProtocol)
    : Math.min(giveProtocol, giveCardProtocol || Infinity)
  const raw = combinedProtocol * protocolToDisplayScale(fromAsset)
  // round the bound so the displayed amount actually satisfies it: a minimum
  // rounds up, a maximum rounds down — round-to-nearest could display a
  // minimum one atomic unit short of clearing the check, so entering exactly
  // the suggested amount still failed (the epsilon absorbs float noise). The
  // bound can never be finer than the asset's own precision: a 0-decimal
  // sats/₿ unit ceils to whole units, never "296.3665 sats"
  const decimals = Math.min(swapAmountDecimals(raw), fromAsset.decimals)
  const scale = Math.pow(10, decimals)
  const value = isMin ? Math.ceil(raw * scale - 1e-9) / scale : Math.floor(raw * scale + 1e-9) / scale
  return `${label} ${prettyNumber(value, decimals)} ${fromAsset.ticker}`.trim()
}

function buildQuoteSnapshot(plan: OfferPlan, quote: SwapQuote, currency: Currencies): AssetSwapQuoteSnapshot {
  // ticker and decimals must come from the same source (quote.*Asset) —
  // plan.*.asset.decimals is the solver's real protocol decimals (8 for
  // BTC), which mismatches the 'sats' ticker the receipt actually stores
  return {
    fromTicker: quote.fromAsset.ticker,
    fromDecimals: quote.fromAsset.decimals,
    toTicker: quote.toAsset?.ticker ?? plan.receive.asset.ticker,
    toDecimals: quote.toAsset?.decimals ?? plan.receive.asset.decimals,
    feeBps: plan.market.fee_bps,
    // TODO: when currency is BTC this snapshot is write-only — every branch of
    // swapUnitOfAccountAmount ignores a BTC-denominated fiatAmount (it values
    // the BTC leg's sats directly, since the snapshot's sats-vs-BTC meaning
    // depends on the bitcoin-unit setting at swap time). Skip persisting it
    // next time the store shape changes.
    fiatCurrency: currency,
    fromFiatAmount: quote.giveFiatValue > 0 ? quote.giveFiatValue : quote.fromFiatValue,
  }
}

function formatCurrencyInputAmount(amount: string, currency: Currencies, bitcoinUnit: Unit): string {
  const normalized = amount || '0'
  const fractionDigits = normalized.includes('.') ? (normalized.split('.')[1]?.length ?? 0) : 0
  const parts = formatFiatAmountParts(Number(normalized) || 0, currency, {
    bitcoinUnit,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  })
  const formattedAmount = normalized.endsWith('.') ? `${parts.amount}.` : parts.amount
  return parts.unit ? `${formattedAmount} ${parts.unit}` : formattedAmount
}

function swapAmountDecimals(value: number): number {
  if (value >= 1000) return 2
  if (value >= 1) return 4
  return 8
}

/** An asset amount at its full protocol precision, zero-padded — no compact
 * "100K", no trimmed trailing zeros: BRL/BTC always show their 8 decimals, a
 * 2-decimal currency shows 2, and the 0-decimal sats/₿ units stay whole
 * (never a fractional sat). */
function formatAssetQuantity(value: number | string | Decimal, decimals: number): string {
  return prettyNumber(value, decimals, true, decimals)
}

function estimateSwapUsd(asset: SwapAsset): number {
  return Number.isFinite(asset.usdPrice) ? (asset.usdPrice ?? 0) : 0
}

function estimateRowUsdPrice(
  row: PortfolioRow,
  fiat: Currencies,
  fromFiatAmount: (amount: number, currency: Currencies) => number,
  toFiat: (satoshis?: number) => number,
  toFiatAmount: (satoshis: number, currency: Currencies) => number,
): number {
  const ticker = row.ticker.trim().toUpperCase()
  const convertFiat = (amount: number, from: Currencies, to: Currencies) =>
    toFiatAmount(fromFiatAmount(amount, from), to)
  if (row.assetId === 'btc' || ticker === 'BTC') return convertFiat(toFiat(100_000_000), fiat, Currencies.USD)
  if (ticker === 'USD' || ticker === 'USDT' || ticker === 'USDC' || ticker === 'AUSD')
    return convertFiat(1, Currencies.USD, Currencies.USD)
  if (ticker === 'CHF') return convertFiat(1, Currencies.CHF, Currencies.USD)

  const rawBalance = typeof row.balance === 'bigint' ? Number(row.balance) : row.balance
  const unitBalance = rawBalance / 10 ** row.decimals
  if (!unitBalance || !row.hasFiatPrice) return 0

  return convertFiat(row.fiatAmount / unitBalance, fiat, Currencies.USD)
}

function filterAssets(assets: SwapAsset[], query: string): SwapAsset[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return assets
  return assets.filter((asset) => {
    // the BTC row's ticker is the display unit ('sats'/'₿'), not 'BTC' —
    // let searching "btc" still find it
    const searchableTicker = asset.assetId === BTC_ASSET_ID ? 'btc' : asset.ticker.toLowerCase()
    return asset.name.toLowerCase().includes(normalized) || searchableTicker.includes(normalized)
  })
}

function resolveInitialFromAssetId(assets: SwapAsset[], requestedAssetId?: string): string | undefined {
  if (requestedAssetId) return assets.find((asset) => asset.assetId === requestedAssetId)?.assetId
  return firstPositiveBalanceAsset(assets)?.assetId ?? assets[0]?.assetId
}

/** The asset's atomic balance as a bigint, whichever way SwapAsset.balance holds it. */
function assetBalanceAtomic(asset: SwapAsset): bigint {
  return typeof asset.balance === 'bigint' ? asset.balance : BigInt(asset.balance)
}

function firstPositiveBalanceAsset(assets: SwapAsset[]): SwapAsset | undefined {
  return assets.find((asset) => assetBalanceAtomic(asset) > BigInt(0))
}

function formatAssetBalance(asset: SwapAsset): string {
  return `${formatAssetQuantity(centsToUnits(assetBalanceAtomic(asset), asset.decimals), asset.decimals)} ${asset.ticker}`
}
