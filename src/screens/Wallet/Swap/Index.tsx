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
import WalletSuccessSplash from '../../../components/WalletSuccessSplash'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer'
import ArrowUpDownIcon from '../../../icons/ArrowUpDown'
import ChevronDownIcon from '../../../icons/ChevronDown'
import InfoIcon from '../../../icons/Info'
import SwapIcon from '../../../icons/Swap'
import { EASE_IN_OUT_QUINT_TUPLE, EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { extractError } from '../../../lib/error'
import {
  formatFiatAmountParts,
  normalizeBitcoinUnit,
  prettyCurrencyAssetAmount,
  prettyFiatAmount,
  prettyNumber,
} from '../../../lib/format'
import { hapticLight, hapticSubtle, hapticTap } from '../../../lib/haptics'
import { BTC_ASSET_ID, findMarket, QUOTE_OPTIONS, validatePlan } from '../../../lib/swap/markets'
import { type AssetSwap, type AssetSwapQuoteSnapshot, type AssetSwapStatus } from '../../../lib/swap/store'
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

type AssetTarget = 'from' | 'to'
type DrawerState = 'to' | 'review' | null
type SwapStep = 'select-from' | 'compose'
type AmountMode = 'asset' | 'fiat'
type SwapValidationState = 'idle' | 'insufficient-balance' | 'quote-unavailable'

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
  feeFiat: string
  rateFromTicker: string
  rateToTicker: string
  rateLabel: string
  fromFiatValue: number
  toFiatValue: number
}

interface ExitingAmountCharacter {
  character: string
  id: number
  slotClassName: string
}

const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back']
const rateNote = 'Rates are dynamic and may update before you confirm.'
const rateNoteAutoDismissMs = 2400
const statusLabels: Record<AssetSwapStatus, string> = {
  pending: 'Pending',
  cancelling: 'Cancelling',
  fulfilled: 'Completed',
  cancelled: 'Cancelled',
  recoverable: 'Recoverable',
}
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
  const { cancelSwap, createSwap, markets, swapAvailable, swaps } = useContext(AssetSwapsContext)
  const { config } = useContext(ConfigContext)
  const { fiatDecimals, fromFiatAmount, toFiat, toFiatAmount } = useContext(FiatContext)
  const { swapFromAssetId, setSwapFromAssetId } = useContext(FlowContext)
  const { goBack, navigate } = useContext(NavigationContext)
  const { assetBalances, assetMetadataCache, balance, svcWallet } = useContext(WalletContext)
  const { rows } = usePortfolioFiat()
  const prefersReduced = useReducedMotion()

  const [availableSats, setAvailableSats] = useState(0)
  const [cancelling, setCancelling] = useState('')

  useEffect(() => {
    if (!svcWallet) return
    svcWallet
      .getBalance()
      .then((walletBalance) => setAvailableSats(walletBalance.available))
      .catch(() => {})
  }, [balance, svcWallet])

  const btcUnit = normalizeBitcoinUnit(config.unit)
  const btcEntryPrecision = btcUnit === Unit.BTC ? 8 : 0
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
          decimals: btcEntryPrecision,
          balance: BigInt(availableSats),
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
      return {
        assetId: asset.id,
        name: row?.name ?? asset.name,
        ticker: row?.ticker ?? asset.ticker,
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
    availableSats,
    btcEntryPrecision,
    btcUnit,
    config.currency,
    config.unit,
    fromFiatAmount,
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
  const { plan, setGiveAmount, solvable, status } = useOfferQuote(pair?.market ?? null, {
    give: pair?.give,
    ...QUOTE_OPTIONS,
  })
  const assetAmount = amountInAssetUnits(amount, amountMode, fromAsset, unitOfAccountUsd)
  const [quotedAmount, setQuotedAmount] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGiveAmount(Number(assetAmount) > 0 ? amountForQuote(assetAmount, fromAsset, btcEntryPrecision) : '')
      setQuotedAmount(amount)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [amount, assetAmount, btcEntryPrecision, fromAsset, setGiveAmount])

  const quoteStale = quotedAmount !== amount
  const planError = plan
    ? validatePlan(
        plan,
        typeof fromAsset.balance === 'bigint' ? fromAsset.balance : BigInt(fromAsset.balance),
        aspInfo.dust,
      )
    : undefined
  const validationMessage = swapValidationMessage({
    amount,
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
    setAmountMode((current) => (current === 'asset' ? 'fiat' : 'asset'))
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

  const handleCancelSwap = async (swap: AssetSwap) => {
    if (cancelling) return
    hapticLight()
    setCancelling(swap.id)
    try {
      await cancelSwap(swap.id)
    } catch (error) {
      setConfirmError(extractError(error))
    } finally {
      setCancelling('')
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
                  {swaps.length ? (
                    <PendingSwaps
                      swaps={swaps}
                      assets={swapAssets}
                      cancelling={cancelling}
                      error={confirmError}
                      onCancel={handleCancelSwap}
                    />
                  ) : null}
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
                    currency={config.currency}
                    bitcoinUnit={config.unit}
                    quote={quote}
                    fromAsset={fromAsset}
                    toAsset={toAsset}
                    onAmountFocus={() => {}}
                    onModeToggle={toggleAmountMode}
                    onOpenReceiveDrawer={() => openDrawer('to')}
                    onSwapSides={swapSides}
                    validationState={validationState}
                    validationText={validationMessage}
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

function PendingSwaps({
  swaps,
  assets,
  cancelling,
  error,
  onCancel,
}: {
  swaps: AssetSwap[]
  assets: SwapAsset[]
  cancelling: string
  error: string
  onCancel: (swap: AssetSwap) => void
}) {
  const assetById = (assetId: string) => assets.find((asset) => asset.assetId === assetId)
  const formatAmount = (assetId: string, atomic: string) => {
    const asset = assetById(assetId)
    return asset ? `${prettyCurrencyAssetAmount(BigInt(atomic), asset.decimals, asset.ticker)} ${asset.ticker}` : atomic
  }

  return (
    <div className='swap-asset-list-panel'>
      <div className='swap-step-heading'>
        <p>Your swaps</p>
      </div>
      <div className='swap-token-list'>
        {swaps.map((swap) => {
          const from = assetById(swap.fromAsset)
          const to = assetById(swap.toAsset)
          const cancellable = swap.status === 'pending' || swap.status === 'cancelling'
          return (
            <div key={swap.id} className='swap-token-row'>
              <span className='swap-token-row__copy'>
                <span>
                  {swap.quote?.fromTicker ?? from?.ticker ?? '?'} to {swap.quote?.toTicker ?? to?.ticker ?? '?'}
                </span>
                <small>
                  {formatAmount(swap.fromAsset, swap.fromAmount)} for ≥ {formatAmount(swap.toAsset, swap.toAmount)}
                </small>
              </span>
              {cancellable ? (
                <button
                  type='button'
                  className='swap-cancel-button'
                  disabled={Boolean(cancelling)}
                  onClick={() => onCancel(swap)}
                >
                  {cancelling === swap.id ? 'Cancelling…' : swap.status === 'cancelling' ? 'Retry cancel' : 'Cancel'}
                </button>
              ) : null}
              <strong>{statusLabels[swap.status]}</strong>
            </div>
          )
        })}
      </div>
      {error ? <p className='swap-confirm-error'>{error}</p> : null}
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
  validationState,
  validationText,
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
  validationState: SwapValidationState
  validationText: string
  invalidPulse: number
  quoteLoading: boolean
  swapTurn: number
}) {
  const prefersReduced = useReducedMotion()
  const amountLabel =
    amountMode === 'fiat' ? formatCurrencyInputAmount(amount, currency, bitcoinUnit) : `${amount} ${fromAsset.ticker}`
  const subAmountLabel = amountMode === 'fiat' ? `${quote.fromAmount} ${fromAsset.ticker}` : quote.fromFiat
  const nextAmountModeLabel = amountMode === 'fiat' ? 'asset amount' : `${currency} amount`
  const validationMessage = validationText

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
        <motion.button
          type='button'
          className='swap-amount-secondary'
          layout
          onClick={onModeToggle}
          aria-label={`Show ${nextAmountModeLabel} first`}
          transition={{ duration: prefersReduced ? 0 : 0.18, ease: EASE_IN_OUT_QUINT_TUPLE }}
        >
          <AnimatedSecondaryAmountValue value={subAmountLabel} reducedMotion={prefersReduced} />
          <motion.span
            className='swap-amount-secondary__icon'
            layout='position'
            animate={{ rotate: amountMode === 'fiat' ? 0 : 180 }}
            transition={{ duration: prefersReduced ? 0 : 0.22, ease: EASE_IN_OUT_QUINT_TUPLE }}
            aria-hidden='true'
          >
            <ArrowUpDownIcon />
          </motion.span>
        </motion.button>
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
    <span className='swap-amount-value' aria-label={value}>
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
      text={quote ? `${quote.fromAsset.ticker} to ${quote.toAsset?.ticker} · Waiting for fill` : undefined}
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
            {quote.fromAsset.ticker} to {quote.toAsset?.ticker ?? 'asset'}
          </h3>
        </div>
      </div>
      <MetricRow label='Swap' value={`${quote.fromAmount} ${quote.fromAsset.ticker}`} loading={loading} />
      <MetricRow
        label='Receive'
        value={quote.toAsset ? `${quote.toAmount} ${quote.toAsset.ticker}` : 'Choose asset'}
        loading={loading}
      />
      <MetricRow label='Fees' value={quote.feeFiat} loading={loading} />
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
  const selectedCurrencyAmount = unitOfAccountUsd > 0 ? (fromUnitsProtocol * fromUsd) / unitOfAccountUsd : 0
  const receivedCurrencyAmount = unitOfAccountUsd > 0 ? (receivedProtocol * toUsd) / unitOfAccountUsd : 0
  const rate = fromUnitsProtocol > 0 ? receivedProtocol / fromUnitsProtocol : 0
  const feeAmount = selectedCurrencyAmount * ((plan?.market.fee_bps ?? 0) / 10_000)
  const formatOptions = { bitcoinUnit }

  return {
    fromAsset,
    toAsset,
    fromAmount: prettyNumber(fromUnits, swapAmountDecimals(fromUnits)),
    fromFiat: prettyFiatAmount(selectedCurrencyAmount, currency, formatOptions),
    toAmount: prettyNumber(received, swapAmountDecimals(received)),
    toFiat: prettyFiatAmount(receivedCurrencyAmount, currency, formatOptions),
    feeFiat: prettyFiatAmount(feeAmount, currency, formatOptions),
    // the rate is always quoted per whole BTC even though amounts display in
    // sats — "1 sats = 0.0000006 USD" is technically correct but unreadable
    rateFromTicker: protocolTicker(fromAsset),
    rateToTicker: toAsset ? protocolTicker(toAsset) : '',
    rateLabel: prettyNumber(rate, swapAmountDecimals(rate)),
    fromFiatValue: selectedCurrencyAmount,
    toFiatValue: receivedCurrencyAmount,
  }
}

/** The asset's ticker for contexts where BTC must read as "BTC" rather than
 * its swap-entry unit ("sats"/"₿") — quoted rates and token logos. */
function protocolTicker(asset: SwapAsset): string {
  return asset.assetId === BTC_ASSET_ID ? 'BTC' : asset.ticker
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

function amountForQuote(amount: string, fromAsset: SwapAsset, btcEntryPrecision: number): string {
  // BTC entered in whole-BTC (8 decimals) is already the solver's expected
  // format — only a sats/₿ (0-decimal) entry needs converting to atomic
  if (fromAsset.assetId !== BTC_ASSET_ID || btcEntryPrecision > 0) return amount
  return fromAtomic(BigInt(amount.split('.')[0].replace(/\D/g, '') || '0'), 8)
}

function swapValidationMessage({
  amount,
  fromAsset,
  pairAvailable,
  plan,
  planError,
  solvable,
  status,
}: {
  amount: string
  fromAsset: SwapAsset
  pairAvailable: boolean | undefined
  plan: OfferPlan | null
  planError: ReturnType<typeof validatePlan>
  solvable: boolean | undefined
  status: string
}): string {
  if (!Number(amount)) return ''
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
  // priceDisplay is quote-per-base; convert the receive-side limit back to
  // the give side using whichever side the plan actually gives
  const giveProtocol = plan.give === 'base' ? limitReceiveProtocol / price : limitReceiveProtocol * price
  const value = giveProtocol * protocolToDisplayScale(fromAsset)
  return `${label} ${prettyNumber(value, swapAmountDecimals(value))} ${fromAsset.ticker}`.trim()
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
    fiatCurrency: currency,
    fromFiatAmount: quote.fromFiatValue,
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

function firstPositiveBalanceAsset(assets: SwapAsset[]): SwapAsset | undefined {
  return assets.find((asset) => {
    const balance = typeof asset.balance === 'bigint' ? asset.balance : BigInt(asset.balance)
    return balance > BigInt(0)
  })
}

function formatAssetBalance(asset: SwapAsset): string {
  const rawBalance = typeof asset.balance === 'bigint' ? asset.balance : BigInt(asset.balance)
  return `${prettyCurrencyAssetAmount(rawBalance, asset.decimals, asset.ticker)} ${asset.ticker}`
}
