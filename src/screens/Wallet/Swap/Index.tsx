import Decimal from 'decimal.js'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { fromAtomic, isNetwork, type OfferPlan } from '@arkade-os/solver-discovery'
import { btcOn, type OpenRfqOffer, type Quote } from '@arkade-os/swap'
import type { NetworkName } from '@arkade-os/sdk'
import { useSolverQuote } from '../../../hooks/useSolverQuote'
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
import ArrowUpDownIcon from '../../../icons/ArrowUpDown'
import ChevronDownIcon from '../../../icons/ChevronDown'
import InfoIcon from '../../../icons/Info'
import SwapIcon from '../../../icons/Swap'
import { EASE_IN_OUT_QUINT_TUPLE, EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { atomicToUnits, unitsToAtomic } from '../../../lib/assets'
import { extractError } from '../../../lib/error'
import { formatFiatAmountParts, normalizeBitcoinUnit, prettyFiatAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSubtle, hapticTap } from '../../../lib/haptics'
import { swapRouteTicker } from '../../../lib/swapDisplay'
import { BTC_ASSET_ID, findMarket, l1ScriptForAddress, validatePlan } from '@arkade-os/swap/protocol'
import { marketLegId, preFeeDisplayRate } from '../../../lib/swapMarkets'
import { type AssetSwapQuoteSnapshot } from '../../../lib/swapRepository'
import { Currencies, Unit } from '../../../lib/types'
import { AspContext } from '../../../providers/asp'
import { SwapsContext } from '../../../providers/swaps'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { usePortfolioFiat, type PortfolioRow } from '../../../hooks/usePortfolioFiat'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { verifiedDesignatedCurrency } from '../../../lib/accountAssets'
import { useTranslation } from '../../../providers/language'
import { readSolverCards, saveSolverCards } from '../../../lib/solverCards'
import { l1NetworkOf } from '../../../lib/onchainPayout'
import { isSolverEnabled } from '../../../lib/solverRouting'
import QuoteChoices, { formatQuoteAmount } from './QuoteChoices'

type AssetTarget = 'from' | 'to'
type DrawerState = 'to' | 'quotes' | 'review' | null
type SwapStep = 'select-from' | 'compose'
type AmountMode = 'asset' | 'fiat'
type SwapValidationState = 'idle' | 'insufficient-balance' | 'quote-unavailable'

interface SwapAsset {
  assetId: string
  name: string
  ticker: string
  currency?: Currencies
  decimals: number
  balance: number | bigint
  fiatText?: string
  icon?: string
  usdPrice?: number
  external?: boolean
  receiveOnly?: boolean
  networkLabel?: string
}

interface SwapQuote {
  fromAsset: SwapAsset
  toAsset?: SwapAsset
  fromAmount: string
  fromCurrency: string
  toAmount: string
  toCurrency: string
  feeLabel: string
  rateFromTicker: string
  rateToTicker: string
  rateLabel: string
  fromCurrencyValue: number
  toCurrencyValue: number
  giveCurrencyValue: number
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
const validAssetDecimals = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 36

export default function WalletSwap() {
  const { aspInfo } = useContext(AspContext)
  const {
    quoteExchange,
    acceptSwapQuote,
    markets,
    allMarkets = [],
    discoveryReady,
    swapAvailable,
  } = useContext(SwapsContext)
  const { config } = useContext(ConfigContext)
  const { fiatDecimals, fromFiatAmount, toFiat, toFiatAmount } = useContext(FiatContext)
  const { swapFromAssetId, setSwapFromAssetId } = useContext(FlowContext)
  const { goBack, navigate } = useContext(NavigationContext)
  const { assetMetadataCache, availableAssetBalances, availableBalance, isVerifiedAsset } = useContext(WalletContext)
  const { rows } = usePortfolioFiat()
  const prefersReduced = useReducedMotion()
  const { t } = useTranslation()
  const solverNetwork = isNetwork(aspInfo.network) ? aspInfo.network : undefined

  const btcUnit = normalizeBitcoinUnit(config.unit)
  const swapAssets = useMemo<SwapAsset[]>(() => {
    const marketAssets = markets
      .flatMap((market) => [market.base_asset, market.quote_asset])
      .map((asset) => ({ ...asset, id: marketLegId(asset) }))
    const ownedAssets = rows.flatMap((row) => {
      const id = row.sourceAsset?.assetId ?? row.assetId
      const decimals = row.sourceAsset?.decimals ?? row.decimals
      if (!/^[0-9a-f]{68}$/.test(id) || !validAssetDecimals(decimals)) return []
      if (BigInt(row.sourceAsset?.balance ?? row.spendableBalance) <= 0n) return []
      return [{ id, name: row.name, ticker: row.ticker, decimals }]
    })
    const uniqueAssets = new Map(ownedAssets.map((asset) => [asset.id, asset]))
    for (const asset of marketAssets) {
      if (asset.id !== BTC_ASSET_ID && !uniqueAssets.has(asset.id)) uniqueAssets.set(asset.id, asset)
    }
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
          currency: Currencies.BTC,
          decimals: btcUnit === Unit.BTC ? 8 : 0,
          // the SDK's `available` already holds back the asset dust carrier
          balance: BigInt(availableBalance),
          fiatText: bitcoinRow?.hasFiatPrice
            ? prettyFiatAmount(bitcoinRow.fiatAmount, config.currency, { bitcoinUnit: config.unit })
            : undefined,
          usdPrice: bitcoinRow
            ? estimateRowUsdPrice(bitcoinRow, config.currency, fromFiatAmount, toFiat, toFiatAmount)
            : 0,
        }
      }

      const row = rows.find((candidate) => (candidate.sourceAsset?.assetId ?? candidate.assetId) === asset.id)
      const rowDecimals = row?.sourceAsset?.decimals ?? row?.decimals
      const cached = assetMetadataCache.get(asset.id)?.metadata
      const cachedDecimals = cached?.decimals
      const cachedName = typeof cached?.name === 'string' && cached.name.trim() ? cached.name.trim() : undefined
      const cachedTicker = typeof cached?.ticker === 'string' && cached.ticker.trim() ? cached.ticker.trim() : undefined
      // spendable, not owned: the composer offers this as a max
      const spendable = availableAssetBalances.find((balance) => balance.assetId === asset.id)
      const designatedCurrency = verifiedDesignatedCurrency(aspInfo.network, asset.id, isVerifiedAsset)
      return {
        assetId: asset.id,
        name: row?.name ?? designatedCurrency ?? cachedName ?? asset.name,
        ticker: row?.ticker ?? designatedCurrency ?? cachedTicker ?? asset.ticker,
        currency: designatedCurrency,
        decimals: validAssetDecimals(rowDecimals)
          ? rowDecimals
          : validAssetDecimals(cachedDecimals)
            ? cachedDecimals
            : asset.decimals,
        balance: BigInt(spendable?.amount ?? 0),
        fiatText: row?.hasFiatPrice
          ? prettyFiatAmount(row.fiatAmount, config.currency, { bitcoinUnit: config.unit })
          : undefined,
        icon: assetMetadataCache.get(asset.id)?.metadata?.icon,
        usdPrice: row ? estimateRowUsdPrice(row, config.currency, fromFiatAmount, toFiat, toFiatAmount) : 0,
      }
    })
  }, [
    assetMetadataCache,
    aspInfo.dust,
    aspInfo.network,
    availableAssetBalances,
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
  const swapTargets = useMemo<SwapAsset[]>(() => {
    const targets = new Map(swapAssets.map((asset) => [asset.assetId, asset]))
    for (const [assetId, entry] of assetMetadataCache) {
      const metadata = entry?.metadata
      if (!/^[0-9a-f]{68}$/.test(assetId) || targets.has(assetId) || !metadata) continue
      if (
        typeof metadata.name !== 'string' ||
        !metadata.name.trim() ||
        typeof metadata.ticker !== 'string' ||
        !metadata.ticker.trim()
      )
        continue
      if (!validAssetDecimals(metadata.decimals)) continue
      const row = rows.find((candidate) => (candidate.sourceAsset?.assetId ?? candidate.assetId) === assetId)
      const decimals = row?.sourceAsset?.decimals ?? row?.decimals ?? metadata.decimals
      if (!validAssetDecimals(decimals)) continue
      const currency = verifiedDesignatedCurrency(aspInfo.network, assetId, isVerifiedAsset)
      targets.set(assetId, {
        assetId,
        name: row?.name ?? currency ?? metadata.name.trim(),
        ticker: row?.ticker ?? currency ?? metadata.ticker.trim(),
        currency,
        decimals,
        balance: 0n,
        icon: metadata.icon,
        receiveOnly: true,
      })
    }
    return [...targets.values()]
  }, [assetMetadataCache, aspInfo.network, isVerifiedAsset, rows, swapAssets])
  const initialFromAssetId = resolveInitialFromAssetId(swapAssets, swapFromAssetId)
  const openedWithPreselectedAsset = useRef(Boolean(swapFromAssetId))
  const [step, setStep] = useState<SwapStep>(swapFromAssetId && initialFromAssetId ? 'compose' : 'select-from')
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState('0')
  const [selectedAmountMode, setSelectedAmountMode] = useState<AmountMode>('fiat')
  // Any path that changes the effective give amount must clear this pair.
  const [preservedAmountPair, setPreservedAmountPair] = useState<{
    assetId: string
    assetAmount: string
    currencyAmount: string
    entryMode: AmountMode
  }>()
  const [fromAssetId, setFromAssetId] = useState(initialFromAssetId ?? swapAssets[0]?.assetId ?? 'btc')
  const [toAssetId, setToAssetId] = useState<string | undefined>()
  const [destination, setDestination] = useState('')
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [swapTurn, setSwapTurn] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [successQuote, setSuccessQuote] = useState<SwapQuote>()
  const [selectedOffer, setSelectedOffer] = useState<{
    quote: Quote
    /** A chosen open offer carries the offer; smart routing's firm quote carries the estimate it answers. */
    offer?: OpenRfqOffer
    plan?: OfferPlan
    inputKey: string
    destination?: string
  }>()
  const [rememberSolver, setRememberSolver] = useState(false)
  const [firmQuoting, setFirmQuoting] = useState<string>()
  const inputEpoch = useRef(0)
  const [quoteClock, setQuoteClock] = useState(() => Math.floor(Date.now() / 1000))
  const submitting = useRef(false)

  const fromAsset =
    swapAssets.find((asset) => asset.assetId === fromAssetId) ??
    firstPositiveBalanceAsset(swapAssets) ??
    swapAssets[0] ??
    emptySwapAsset
  const onchainId = btcOn('bitcoin', aspInfo.network as NetworkName)
  const onchainTargets: SwapAsset[] =
    fromAsset.assetId === BTC_ASSET_ID
      ? [
          {
            assetId: onchainId,
            name: t('swap.bitcoinOnchain'),
            ticker: btcUnit === Unit.BTC ? 'BTC' : btcUnit,
            decimals: btcUnit === Unit.BTC ? 8 : 0,
            balance: 0n,
            external: true,
            networkLabel: aspInfo.network === 'bitcoin' ? t('swap.bitcoinMainnet') : aspInfo.network,
          },
        ]
      : []
  const toAsset = toAssetId
    ? [...swapTargets, ...onchainTargets].find(
        (asset) => asset.assetId === toAssetId && asset.assetId !== fromAsset.assetId,
      )
    : undefined
  const destinationValid = useMemo(() => {
    if (!toAsset?.external) return true
    try {
      l1ScriptForAddress(destination.trim(), l1NetworkOf(aspInfo.network))
      return true
    } catch {
      return false
    }
  }, [aspInfo.network, destination, toAsset?.external])
  const unitOfAccountUsd = toFiatAmount(fromFiatAmount(1, config.currency), Currencies.USD)
  const currencyConversionUseful = hasDistinctCurrencyConversion(fromAsset, config.currency, unitOfAccountUsd)
  const amountMode = currencyConversionUseful ? selectedAmountMode : 'asset'

  useEffect(() => {
    if (currencyConversionUseful || selectedAmountMode !== 'fiat') return
    setPreservedAmountPair(undefined)
    setAmount('0')
    setSelectedAmountMode('asset')
  }, [currencyConversionUseful, selectedAmountMode])

  const pair = toAsset ? findMarket(markets, fromAsset.assetId, toAsset.assetId) : undefined
  const previewTargetId = toAsset?.external ? undefined : toAsset?.assetId
  const quoteMarkets = useMemo(() => {
    if (!previewTargetId) return []
    const precisionFor = (assetId: string) => {
      if (assetId === BTC_ASSET_ID) return 8
      const row = rows.find((candidate) => (candidate.sourceAsset?.assetId ?? candidate.assetId) === assetId)
      const decimals =
        row?.sourceAsset?.decimals ?? row?.decimals ?? assetMetadataCache.get(assetId)?.metadata?.decimals
      return validAssetDecimals(decimals) ? decimals : undefined
    }
    const giveDecimals = precisionFor(fromAsset.assetId)
    const takeDecimals = precisionFor(previewTargetId)
    return markets.filter((market) => {
      const candidate = findMarket([market], fromAsset.assetId, previewTargetId)
      if (!candidate?.market) return false
      const giveAsset = candidate.give === 'base' ? market.base_asset : market.quote_asset
      const takeAsset = candidate.give === 'base' ? market.quote_asset : market.base_asset
      return (
        (giveDecimals === undefined || giveAsset.decimals === giveDecimals) &&
        (takeDecimals === undefined || takeAsset.decimals === takeDecimals)
      )
    })
  }, [assetMetadataCache, fromAsset.assetId, markets, rows, previewTargetId])
  const { plan, setGiveAmount, solvable, status } = useSolverQuote(
    quoteMarkets,
    fromAsset.assetId,
    previewTargetId,
    aspInfo.network,
    aspInfo.dust,
  )
  const preservedAmounts = preservedAmountPair?.assetId === fromAsset.assetId ? preservedAmountPair : undefined
  const assetAmount =
    preservedAmounts?.assetAmount ?? amountInAssetUnits(amount, amountMode, fromAsset, unitOfAccountUsd)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGiveAmount(Number(assetAmount) > 0 ? amountForQuote(assetAmount, fromAsset) : '')
    }, 600)
    return () => window.clearTimeout(timer)
  }, [assetAmount, fromAsset, setGiveAmount])

  const amountAtomic = unitsToAtomic(assetAmount, fromAsset.decimals)
  const planMatchesAssetAmount = Boolean(
    plan &&
      toAsset &&
      plan.deposit.atomic === amountAtomic &&
      plan.receive.asset.decimals === (toAsset.assetId === BTC_ASSET_ID || toAsset.external ? 8 : toAsset.decimals) &&
      new Decimal(plan.deposit.display).eq(amountForQuote(assetAmount, fromAsset) || '0'),
  )
  const currentPlan = status === 'success' && planMatchesAssetAmount ? plan : null
  const quoteStale = Boolean(toAsset && Number(assetAmount) > 0 && !currentPlan)
  const planError = currentPlan ? validatePlan(currentPlan, assetBalanceAtomic(fromAsset), aspInfo.dust) : undefined
  const inputKey = `${aspInfo.network}:${fromAsset.assetId}:${fromAsset.decimals}:${toAsset?.assetId}:${toAsset?.decimals}:${amountAtomic}:${destination}`
  const selected = selectedOffer?.inputKey === inputKey ? selectedOffer : undefined
  const selectedExpired = Boolean(selected && selected.quote.expiresAt <= quoteClock)
  const quotingFirm = firmQuoting === inputKey

  useEffect(() => {
    inputEpoch.current += 1
    setSelectedOffer(undefined)
    setRememberSolver(false)
    setConfirmError('')
    setDrawer((current) => (current === 'review' || current === 'quotes' ? null : current))
  }, [inputKey])

  useEffect(() => {
    if (!selected) return
    setQuoteClock(Math.floor(Date.now() / 1000))
    const timer = window.setInterval(() => setQuoteClock(Math.floor(Date.now() / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [selected])
  const exceedsBalance = amountAtomic > assetBalanceAtomic(fromAsset)
  // a partial asset deposit leaves asset change, and that change needs a second
  // dust carrier; without one the SDK fails with a bare "Insufficient funds"
  const lacksChangeCarrier =
    fromAsset.assetId !== BTC_ASSET_ID &&
    amountAtomic < assetBalanceAtomic(fromAsset) &&
    availableBalance < 2 * Number(aspInfo.dust)
  const validationMessage = swapValidationMessage({
    amount,
    exceedsBalance,
    lacksChangeCarrier,
    fromAsset,
    pairAvailable: toAsset && pair?.market ? true : undefined,
    plan: currentPlan,
    planError,
    solvable: currentPlan || toAsset?.external || !pair?.market ? undefined : solvable,
    status: toAsset?.external || !pair?.market ? 'idle' : status,
  })
  const quote = useMemo(
    () =>
      buildQuoteFromPlan(
        currentPlan,
        assetAmount,
        preservedAmounts?.entryMode ?? amountMode,
        fromAsset,
        toAsset,
        unitOfAccountUsd,
        config.currency,
        config.unit,
      ),
    [
      amountMode,
      assetAmount,
      config.currency,
      config.unit,
      currentPlan,
      fromAsset,
      preservedAmounts?.entryMode,
      toAsset,
      unitOfAccountUsd,
    ],
  )
  const currentCurrencyValue = quote.fromCurrencyValue > 0 ? quote.fromCurrencyValue : undefined
  const alternateCurrencyAmount =
    Number(assetAmount) === 0
      ? '0'
      : currentCurrencyValue !== undefined
        ? prettyNumber(currentCurrencyValue, fiatDecimals(), false, fiatDecimals())
        : undefined
  const hasPositiveAmount = Number(amount) > 0
  const validationState: SwapValidationState =
    validationMessage && validationMessage !== 'Insufficient balance'
      ? 'quote-unavailable'
      : validationMessage === 'Insufficient balance'
        ? 'insufficient-balance'
        : 'idle'
  const balanceValidation = isBalanceLimitValidation(validationMessage) ? validationMessage : ''

  const quoteLoading = Boolean(
    !toAsset?.external && pair?.market && (status === 'loading' || (quoteStale && hasPositiveAmount)),
  )
  const canContinue = Boolean(toAsset && currentPlan && !planError && !validationMessage)
  const canViewQuotes = Boolean(
    toAsset && amountAtomic > 0n && !exceedsBalance && !lacksChangeCarrier && destinationValid,
  )
  const hasSavedSolver = Boolean(
    toAsset &&
      (toAsset.external ? allMarkets : quoteMarkets).some((market) => {
        if (
          toAsset.external &&
          (typeof market.discovery_pubkey !== 'string' || !(market.transports?.nostr?.relays?.length ?? 0))
        )
          return false
        const route = findMarket([market], fromAsset.assetId, toAsset.assetId)
        return route?.market && isSolverEnabled(market, route.give, aspInfo.network)
      }),
  )
  const searchOpenByDefault = Boolean(
    discoveryReady && canViewQuotes && (!hasSavedSolver || (currentPlan && solvable === false)),
  )
  // The market's pre-fee rate beside the firm fee (spread plus any unreturned carrier) and amount.
  const firmDisplay = (estimate: OfferPlan, firm: Quote): SwapQuote => {
    const display = buildQuoteFromPlan(
      {
        ...estimate,
        receive: {
          ...estimate.receive,
          atomic: firm.take.amount,
          display: fromAtomic(firm.take.amount, estimate.receive.asset.decimals),
        },
      },
      assetAmount,
      preservedAmounts?.entryMode ?? amountMode,
      fromAsset,
      toAsset,
      unitOfAccountUsd,
      config.currency,
      config.unit,
    )
    return { ...display, feeLabel: quoteFeeLabel(display, firm) }
  }
  const reviewQuote = !selected
    ? quote
    : selected.plan
      ? firmDisplay(selected.plan, selected.quote)
      : selectedQuoteDisplay(quote, selected.quote)

  const stageTransition = prefersReduced ? { duration: 0 } : { duration: 0.28, ease: EASE_IN_OUT_QUINT_TUPLE }

  const filteredAssets = useMemo(() => filterAssets(swapAssets, search), [search, swapAssets])

  useEffect(() => {
    if (swapAssets.length === 0) return
    const currentAssetStillAvailable = swapAssets.some((asset) => asset.assetId === fromAssetId)
    if (currentAssetStillAvailable) return
    setFromAssetId(resolveInitialFromAssetId(swapAssets, swapFromAssetId) ?? swapAssets[0]?.assetId ?? 'btc')
  }, [fromAssetId, swapAssets, swapFromAssetId])

  const focusFromAsset = useCallback((assetId: string) => {
    setFromAssetId(assetId)
    setToAssetId((current) => (current && current !== assetId ? current : undefined))
    setSearch('')
    setStep('compose')
  }, [])

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

  const swapCommitted = confirming || Boolean(successQuote)

  useEffect(() => {
    if (swapCommitted || validationState === 'idle') return
    hapticSubtle()
  }, [swapCommitted, validationState])

  useEffect(() => {
    if (swapCommitted || balanceValidation || !validationMessage) {
      toast.dismiss('swap-validation')
      return
    }
    toast.error(swapValidationText(validationMessage, t), { id: 'swap-validation' })
  }, [amount, balanceValidation, swapCommitted, validationMessage, t])

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
    setPreservedAmountPair(undefined)
    focusFromAsset(asset.assetId)
  }

  const selectToAsset = (_target: AssetTarget, asset: SwapAsset) => {
    hapticLight()
    setConfirmError('')
    setToAssetId(asset.assetId)
    setDestination('')
    if (asset.assetId === fromAsset.assetId) setFromAssetId(toAsset?.assetId ?? fromAsset.assetId)
    setDrawer(null)
  }

  const swapSides = () => {
    if (!toAsset || toAsset.external || toAsset.receiveOnly) return
    hapticLight()
    setPreservedAmountPair(undefined)
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
    setPreservedAmountPair(undefined)

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
    const nextAmount =
      amountMode === 'fiat'
        ? (preservedAmounts?.assetAmount ?? amountInAssetUnits(amount, amountMode, fromAsset, unitOfAccountUsd))
        : (preservedAmounts?.currencyAmount ?? alternateCurrencyAmount)
    if (nextAmount === undefined) return
    hapticLight()
    setPreservedAmountPair({
      assetId: fromAsset.assetId,
      assetAmount: amountMode === 'asset' ? amount : nextAmount,
      currencyAmount: amountMode === 'fiat' ? amount : nextAmount,
      entryMode: preservedAmounts?.entryMode ?? amountMode,
    })
    setAmount(nextAmount)
    setSelectedAmountMode((current) => (current === 'asset' ? 'fiat' : 'asset'))
  }

  const useMaxBalance = () => {
    const rawBalance = assetBalanceAtomic(fromAsset)
    if (rawBalance <= BigInt(0)) return
    hapticLight()
    setConfirmError('')
    setPreservedAmountPair(undefined)
    // enter the exact balance in the asset's own units — sidestep the fiat
    // round-trip so "max" funds the whole balance to the last atomic unit
    setSelectedAmountMode('asset')
    setAmount(atomicToUnits(rawBalance, fromAsset.decimals))
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

  // The market the plan was priced against must still name this pair, the right way round.
  const planMatchesPair = (): boolean => {
    if (!plan || !pair?.market || !toAsset) return false
    const verified = findMarket([plan.market as typeof pair.market], fromAsset.assetId, toAsset.assetId)
    return Boolean(verified?.market && verified.give === plan.give)
  }

  // Fetched as the review opens so Confirm is one tap; keyed to the input it was asked for.
  const requestFirmQuote = async () => {
    if (!plan || !canContinue || quotingFirm) return
    if (!planMatchesPair()) {
      setConfirmError(t('swap.quoteUnavailable'))
      return
    }
    const requested = inputKey
    const epoch = inputEpoch.current
    setFirmQuoting(requested)
    setConfirmError('')
    try {
      const firm = await quoteExchange(plan)
      setSelectedOffer({ quote: firm, inputKey: requested, plan })
    } catch (error) {
      if (epoch === inputEpoch.current) setConfirmError(extractError(error))
    } finally {
      setFirmQuoting((current) => (current === requested ? undefined : current))
    }
  }

  const confirmSwap = async () => {
    if (submitting.current || !toAsset || confirming || quotingFirm) return
    const lapsed = selected && (selectedExpired || selected.quote.expiresAt <= Math.floor(Date.now() / 1000))
    if (selected?.offer && lapsed) {
      setConfirmError(t('swap.offerExpired'))
      return
    }
    // A lapsed firm quote falls through to smart routing, which quotes again.
    if (selected && !lapsed) {
      if (selected.quote.give.amount !== amountAtomic || selected.quote.take.amount <= 0n) return
      const offer = selected.offer
      submitting.current = true
      setConfirming(true)
      setConfirmError('')
      try {
        await acceptSwapQuote(
          selected.quote,
          selected.plan
            ? buildQuoteSnapshot(selected.plan, reviewQuote, config.currency)
            : {
                fromTicker: fromAsset.ticker,
                fromDecimals: fromAsset.decimals,
                toTicker: toAsset.ticker,
                toDecimals: toAsset.decimals,
              },
        )
        setDrawer(null)
        setSuccessQuote(reviewQuote)
        if (offer && rememberSolver && solverNetwork) {
          try {
            const cards = readSolverCards()
            const duplicate = cards.some(
              (input) =>
                input.network === solverNetwork &&
                (input.card as { discovery_pubkey?: string }).discovery_pubkey === offer.solverPubkey,
            )
            if (!duplicate)
              saveSolverCards([
                ...cards,
                { network: solverNetwork, label: offer.solverName.slice(0, 64), card: offer.signedCard },
              ])
          } catch (cause) {
            toast.error(extractError(cause))
          }
        }
        hapticLight()
      } catch (error) {
        setConfirmError(extractError(error))
      } finally {
        submitting.current = false
        setConfirming(false)
      }
      return
    }
    if (!plan || !pair?.market || !canContinue) return
    if (!planMatchesPair()) {
      setConfirmError(t('swap.quoteUnavailable'))
      return
    }

    // Never fund below the amount the review shows: show the new firm terms instead.
    const shown = selected?.plan ? selected.quote.take.amount : plan.receive.atomic
    setConfirmError('')
    submitting.current = true
    setConfirming(true)
    try {
      const firm = await quoteExchange(plan)
      // Kept before funding: a retry must accept this quote, not ask for its terms again.
      setSelectedOffer({ quote: firm, inputKey, plan })
      if (firm.take.amount < shown) return
      const funded = firmDisplay(plan, firm)
      await acceptSwapQuote(firm, buildQuoteSnapshot(plan, funded, config.currency))
      setDrawer(null)
      setSuccessQuote(funded)
      hapticLight()
    } catch (error) {
      setConfirmError(extractError(error))
    } finally {
      submitting.current = false
      setConfirming(false)
    }
  }

  const receiveAssets = [...swapTargets.filter((asset) => asset.assetId !== fromAsset.assetId), ...onchainTargets]

  return (
    <>
      <Header text={t('swap.title')} back={handleBack} />
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
                      title={t('swap.chooseAssetToSwap')}
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
                    assetAmount={assetAmount}
                    amountMode={amountMode}
                    currency={config.currency}
                    bitcoinUnit={config.unit}
                    alternateCurrencyAmount={preservedAmounts?.currencyAmount ?? alternateCurrencyAmount}
                    currencyConversionUseful={currencyConversionUseful}
                    quote={quote}
                    fromAsset={fromAsset}
                    toAsset={toAsset}
                    onAmountFocus={() => {}}
                    onModeToggle={toggleAmountMode}
                    onOpenReceiveDrawer={() => openDrawer('to')}
                    onSwapSides={swapSides}
                    onUseMaxBalance={useMaxBalance}
                    validationState={validationState}
                    balanceValidation={balanceValidation}
                    quoteLoading={quoteLoading}
                    swapTurn={swapTurn}
                  />
                  {toAsset?.external ? (
                    <label className='mb-3 flex flex-col gap-2 text-sm'>
                      <span>{t('swap.onchainAddress', { network: toAsset.networkLabel ?? '' })}</span>
                      <input
                        type='text'
                        value={destination}
                        autoComplete='off'
                        autoCapitalize='none'
                        spellCheck={false}
                        className='rounded-xl border border-border bg-background px-4 py-3'
                        placeholder={t('swap.pasteBitcoinAddress')}
                        aria-label={t('swap.onchainAddress', { network: toAsset.networkLabel ?? '' })}
                        onChange={(event) => setDestination(event.target.value)}
                        aria-invalid={Boolean(destination && !destinationValid)}
                      />
                      {destination && !destinationValid ? (
                        <span role='alert' className='text-destructive'>
                          {t('swap.invalidBitcoinAddress')}
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                  <Keypad amount={amount} onPress={pressKey} />
                  {searchOpenByDefault ? (
                    <p className='text-sm text-muted-foreground'>{t('swap.noSavedSolverOffers')}</p>
                  ) : null}
                  <Button label={t('swap.viewQuotes')} disabled={!canViewQuotes} onClick={() => openDrawer('quotes')} />
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

      {toAsset ? (
        <QuoteChoices
          open={drawer === 'quotes'}
          network={aspInfo.network}
          from={fromAsset}
          to={toAsset}
          amount={amountAtomic}
          destination={toAsset.external ? destination.trim() : undefined}
          automaticAmount={canContinue ? currentPlan?.receive.atomic : undefined}
          autoSearch={searchOpenByDefault}
          allowSmartRouting={!toAsset.external}
          onOpenChange={(open) => {
            if (!open) setDrawer(null)
          }}
          onSmartRouting={() => {
            setSelectedOffer((current) => (current?.offer ? undefined : current))
            openDrawer('review')
            if (!selected || selected.offer || selectedExpired) void requestFirmQuote()
          }}
          onChoose={(verifiedQuote, offer) => {
            let verifiedDestination: string | undefined
            if (toAsset.external) {
              const take = verifiedQuote.route.take
              if (
                take.corridor !== 'onchain' ||
                take.instrument.kind !== 'address' ||
                take.asset !== toAsset.assetId ||
                verifiedQuote.take.asset !== toAsset.assetId
              )
                throw new Error(t('swap.destinationChanged'))
              const expectedScript = l1ScriptForAddress(destination.trim(), l1NetworkOf(aspInfo.network))
              const preparedScript = l1ScriptForAddress(take.instrument.address, l1NetworkOf(aspInfo.network))
              if (
                expectedScript.length !== preparedScript.length ||
                !expectedScript.every((value, index) => value === preparedScript[index])
              )
                throw new Error(t('swap.destinationChanged'))
              verifiedDestination = take.instrument.address
            }
            setRememberSolver(false)
            setSelectedOffer({ quote: verifiedQuote, offer, inputKey, destination: verifiedDestination })
            openDrawer('review')
          }}
        />
      ) : null}

      <ReviewDrawer
        open={drawer === 'review'}
        quote={reviewQuote}
        provider={selected?.offer?.solverName}
        destination={selected?.destination}
        rememberSolver={rememberSolver}
        onRememberSolverChange={selected?.offer && solverNetwork ? setRememberSolver : undefined}
        canConfirm={!quotingFirm && (selected && !selectedExpired ? true : !selected?.offer && canContinue)}
        confirming={confirming}
        error={selected?.offer && selectedExpired ? t('swap.offerExpired') : confirmError}
        note={
          selected?.plan && selected.quote.take.amount < selected.plan.receive.atomic
            ? t('swap.quoteBelowEstimate')
            : undefined
        }
        quoteLoading={quotingFirm || (selected ? false : quoteLoading)}
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
  const { t } = useTranslation()
  return (
    <div className='swap-unavailable-state'>
      <span className='swap-unavailable-state__icon'>
        <SwapIcon />
      </span>
      <div>
        <p>{t('swap.swapsUnavailable')}</p>
        <span>{t('swap.swapsUnavailableText')}</span>
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
  const { t } = useTranslation()

  return (
    <div className='swap-asset-list-panel'>
      <div className='swap-step-heading'>
        <p>{title}</p>
        <span>{t('swap.selectAssetToTradeFrom')}</span>
      </div>
      <label className='swap-search-field'>
        <span>{t('swap.searchAssets')}</span>
        <input
          type='search'
          value={search}
          placeholder={t('swap.searchAssets')}
          autoComplete='off'
          spellCheck={false}
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      <div className='swap-token-list swap-token-list--page'>
        {empty ? (
          <div className='swap-empty-state'>{t('swap.noAssetsMatch')}</div>
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
  assetAmount,
  amountMode,
  currency,
  bitcoinUnit,
  alternateCurrencyAmount,
  currencyConversionUseful,
  quote,
  fromAsset,
  toAsset,
  onAmountFocus,
  onModeToggle,
  onOpenReceiveDrawer,
  onSwapSides,
  onUseMaxBalance,
  validationState,
  balanceValidation,
  quoteLoading,
  swapTurn,
}: {
  amount: string
  assetAmount: string
  amountMode: AmountMode
  currency: Currencies
  bitcoinUnit: Unit
  alternateCurrencyAmount?: string
  currencyConversionUseful: boolean
  quote: SwapQuote
  fromAsset: SwapAsset
  toAsset?: SwapAsset
  onAmountFocus: () => void
  onModeToggle: () => void
  onOpenReceiveDrawer: () => void
  onSwapSides: () => void
  onUseMaxBalance: () => void
  validationState: SwapValidationState
  balanceValidation: string
  quoteLoading: boolean
  swapTurn: number
}) {
  const prefersReduced = useReducedMotion()
  const { t } = useTranslation()
  const currencyAmountLabel =
    amountMode === 'fiat' || alternateCurrencyAmount !== undefined
      ? formatCurrencyInputAmount(
          amountMode === 'fiat' ? amount : alternateCurrencyAmount || '0',
          currency,
          bitcoinUnit,
        )
      : quote.fromCurrency
  const assetAmountLabel = `${assetAmount} ${fromAsset.ticker}`
  const secondaryAmountLabel = amountMode === 'fiat' ? assetAmountLabel : currencyAmountLabel
  const primaryAmountLabel = amountMode === 'fiat' ? currencyAmountLabel : assetAmountLabel
  const secondaryAmountMode = amountMode === 'fiat' ? 'asset' : 'fiat'
  const nextAmountModeLabel = amountMode === 'fiat' ? t('swap.assetAmount') : t('swap.currencyAmount', { currency })
  const amountValueTransition = prefersReduced ? { duration: 0 } : { duration: 0.22, ease: EASE_IN_OUT_QUINT_TUPLE }
  const amountLayoutId = useId()
  const secondaryMotion = {
    initial: prefersReduced ? false : { opacity: 0, y: 4, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: prefersReduced ? undefined : { opacity: 0, y: -4, scale: 0.97 },
    transition: { duration: prefersReduced ? 0 : 0.16, ease: EASE_OUT_QUINT_TUPLE },
  }

  return (
    <div className='swap-composer'>
      <div className='swap-input-card'>
        <div className='swap-input-card__asset'>
          <TokenAvatar asset={fromAsset} size={36} />
          <div className='swap-input-card__asset-copy'>
            <span>{fromAsset.name}</span>
            <div className='swap-input-card__balance-slot' aria-live='polite'>
              <AnimatePresence mode='wait' initial={false}>
                {balanceValidation === 'Insufficient balance' ? (
                  <motion.button
                    key='max'
                    type='button'
                    className='swap-input-card__balance swap-input-card__balance--max'
                    onClick={onUseMaxBalance}
                    aria-label={t('swap.useMaximum', { balance: formatAssetBalance(fromAsset) })}
                    {...secondaryMotion}
                  >
                    {t('swap.max')} {formatAssetBalance(fromAsset)}
                  </motion.button>
                ) : balanceValidation ? (
                  <motion.span key={balanceValidation} className='swap-input-card__balance-error' {...secondaryMotion}>
                    {swapValidationText(balanceValidation, t)}
                  </motion.span>
                ) : (
                  <motion.button
                    key='balance'
                    type='button'
                    className='swap-input-card__balance'
                    onClick={onUseMaxBalance}
                    {...secondaryMotion}
                  >
                    {formatAssetBalance(fromAsset)}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className='swap-amount-stack'>
          <LayoutGroup id={amountLayoutId}>
            <div className='swap-amount-stage'>
              <button
                type='button'
                className={
                  validationState === 'idle'
                    ? 'swap-amount-display'
                    : 'swap-amount-display swap-amount-display--invalid'
                }
                onClick={onAmountFocus}
                aria-label={`Swap amount, ${primaryAmountLabel}`}
              >
                <motion.span
                  className='swap-amount-value-shake'
                  data-testid='swap-amount-value-shake'
                  animate={prefersReduced || validationState === 'idle' ? undefined : { x: [0, -7, 6, -4, 2, 0] }}
                  transition={
                    prefersReduced || validationState === 'idle'
                      ? undefined
                      : { duration: 0.32, ease: EASE_OUT_QUINT_TUPLE }
                  }
                >
                  <motion.span
                    key={amountMode}
                    layoutId={`swap-amount-${amountMode}`}
                    className='swap-amount-value-row'
                    transition={{ layout: amountValueTransition }}
                  >
                    <AnimatedAmountValue
                      value={primaryAmountLabel}
                      reducedMotion={prefersReduced}
                      className={
                        validationState === 'idle'
                          ? 'swap-amount-value--primary'
                          : 'swap-amount-value--primary swap-amount-value--invalid'
                      }
                    />
                  </motion.span>
                </motion.span>
              </button>
              {currencyConversionUseful ? (
                <button
                  type='button'
                  className='swap-amount-secondary'
                  onClick={onModeToggle}
                  aria-label={t('swap.showFirst', { mode: nextAmountModeLabel })}
                >
                  <motion.span
                    className='swap-amount-secondary__background'
                    layout
                    transition={{ layout: amountValueTransition }}
                    aria-hidden='true'
                  />
                  <motion.span
                    key={secondaryAmountMode}
                    layoutId={`swap-amount-${secondaryAmountMode}`}
                    className='swap-amount-secondary__label swap-amount-value--secondary'
                    transition={{ layout: amountValueTransition }}
                    aria-hidden='true'
                  >
                    {secondaryAmountLabel}
                  </motion.span>
                  <motion.span
                    className='swap-amount-secondary__icon'
                    layout='position'
                    transition={{ layout: amountValueTransition }}
                    aria-hidden='true'
                  >
                    <ArrowUpDownIcon />
                  </motion.span>
                </button>
              ) : null}
            </div>
          </LayoutGroup>
        </div>
      </div>

      <motion.button
        type='button'
        className='swap-flip-button'
        aria-label={t('swap.switchSwapDirection')}
        animate={{ rotate: swapTurn * 180 }}
        transition={prefersReduced ? { duration: 0 } : { duration: 0.22, ease: EASE_IN_OUT_QUINT_TUPLE }}
        disabled={!toAsset || toAsset.external || toAsset.receiveOnly}
        onClick={onSwapSides}
      >
        <SwapIcon />
      </motion.button>

      <button type='button' className='swap-receive-card' onClick={onOpenReceiveDrawer}>
        {toAsset ? (
          <>
            <TokenAvatar asset={toAsset} size={36} />
            <div>
              <span>
                {t('swap.receive')} {toAsset.ticker}
                {toAsset.external ? ` · ${toAsset.name}` : ''}
              </span>
              <small>
                {quoteLoading ? <SwapSkeletonText width='5.75rem' /> : `${quote.toAmount} ${toAsset.ticker}`}
              </small>
            </div>
            {quote.toCurrency ? (
              <strong>{quoteLoading ? <SwapSkeletonText width='3.75rem' /> : quote.toCurrency}</strong>
            ) : null}
          </>
        ) : (
          <>
            <span className='swap-receive-card__empty'>+</span>
            <div>
              <span>{t('swap.receive')}</span>
              <small>{t('swap.chooseAsset')}</small>
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

function AnimatedAmountValue({
  value,
  reducedMotion,
  className,
}: {
  value: string
  reducedMotion: boolean
  className: string
}) {
  const previousValueRef = useRef(value)
  const characters = Array.from(value)
  const previousCharacters = Array.from(previousValueRef.current)
  const previousCharacterBySlot = new Map(
    previousCharacters.map((character, index) => [
      amountCharacterSlotKey(character, index, previousCharacters),
      character,
    ]),
  )
  const shouldAnimate = previousValueRef.current !== value
  const isAdding = value.length > previousValueRef.current.length

  useEffect(() => {
    previousValueRef.current = value
  }, [value])

  return (
    <span
      className={`swap-amount-value ${className}`}
      aria-label={value}
      style={{ '--swap-amount-scale': amountFontScale(value.length) } as React.CSSProperties}
    >
      <AnimatePresence mode='popLayout' initial={false}>
        {characters.map((character, characterIndex) => {
          const slotKey = amountCharacterSlotKey(character, characterIndex, characters)
          const entering = shouldAnimate && previousCharacterBySlot.get(slotKey) !== character
          return (
            <motion.span
              key={slotKey}
              layout={!reducedMotion}
              className={amountCharacterSlotClassName(character)}
              initial={reducedMotion ? false : { opacity: 0, y: isAdding ? 12 : 7 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -7 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : {
                      duration: isAdding ? 0.28 : 0.16,
                      ease: EASE_OUT_QUINT_TUPLE,
                      layout: { duration: 0.22, ease: EASE_OUT_QUINT_TUPLE },
                    }
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

function SwapAssetRow({ asset, active, onClick }: { asset: SwapAsset; active?: boolean; onClick: () => void }) {
  return (
    <button
      type='button'
      className={active ? 'swap-token-row swap-token-row--active' : 'swap-token-row'}
      data-testid={`swap-asset-row-${asset.ticker.toLowerCase()}`}
      onClick={onClick}
    >
      <TokenAvatar asset={asset} size={40} />
      <span className='swap-token-row__copy'>
        <span>{asset.name}</span>
        <small>{asset.networkLabel ?? formatAssetBalance(asset)}</small>
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
  const prefersReduced = useReducedMotion()
  const { t } = useTranslation()

  return (
    <motion.div
      className='swap-keypad-shell'
      aria-label={t('swap.keypadFor', { amount: amount || '0' })}
      initial={prefersReduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT_QUINT_TUPLE }}
    >
      <div className='swap-keypad'>
        {keypadKeys.map((key) => (
          <button
            key={key}
            type='button'
            onClick={() => onPress(key)}
            aria-label={key === 'Back' ? t('swap.deleteDigit') : key}
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
  const { t } = useTranslation()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className='swap-drawer-content swap-review-drawer-content'
        initialFocus={(openType) => openType === 'keyboard'}
        finalFocus={(closeType) => closeType === 'keyboard'}
      >
        <DrawerHeader className='swap-picker-header'>
          <DrawerTitle>{target === 'from' ? t('swap.chooseAssetToSwap') : t('swap.chooseAssetToReceive')}</DrawerTitle>
          <DrawerDescription>{t('swap.pickAssetForSide')}</DrawerDescription>
        </DrawerHeader>
        <div className='swap-drawer-body'>
          <label className='swap-search-field'>
            <span>{t('swap.searchAssets')}</span>
            <input
              type='search'
              value={query}
              placeholder={t('swap.searchAssets')}
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
  provider,
  destination,
  rememberSolver,
  onRememberSolverChange,
  canConfirm,
  confirming,
  error,
  note,
  quoteLoading,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  quote: SwapQuote
  provider?: string
  destination?: string
  rememberSolver: boolean
  onRememberSolverChange?: (remember: boolean) => void
  canConfirm: boolean
  confirming: boolean
  error: string
  note?: string
  quoteLoading: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const prefersReduced = useReducedMotion()
  const { t } = useTranslation()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='swap-drawer-content'>
        <DrawerHeader className='swap-review-header'>
          <DrawerTitle>{t('swap.reviewSwap')}</DrawerTitle>
          <DrawerDescription>{t('swap.reviewSwapDescription')}</DrawerDescription>
        </DrawerHeader>
        <div className='swap-review-drawer-body'>
          <ReviewSummary quote={quote} loading={quoteLoading} />
          <QuoteDetails quote={quote} loading={quoteLoading} />
          {provider ? <MetricRow label={t('swap.provider')} value={provider} loading={false} /> : null}
          {destination ? (
            <div className='flex flex-col gap-2 px-1 py-3 text-sm'>
              <span className='text-muted-foreground'>{t('common.address')}</span>
              <p className='select-text break-all font-medium'>{destination}</p>
            </div>
          ) : null}
          {onRememberSolverChange ? (
            <label className='flex cursor-pointer items-center gap-3 px-1 py-3 text-sm'>
              <input
                type='checkbox'
                checked={rememberSolver}
                disabled={confirming}
                onChange={(event) => onRememberSolverChange(event.target.checked)}
              />
              {t('swap.saveSolverAfterSwap')}
            </label>
          ) : null}
          {note ? <p className='px-1 py-2 text-xs text-muted-foreground'>{note}</p> : null}
        </div>
        <div className='swap-review-action'>
          <AnimatePresence initial={false}>
            {error ? (
              <motion.p
                className='swap-confirm-error'
                initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: 6 }}
                transition={prefersReduced ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT_QUINT_TUPLE }}
              >
                {error}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <Button
            label={t('swap.confirmSwap')}
            disabled={!canConfirm || confirming}
            loading={confirming}
            onClick={onConfirm}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function SwapSuccessOverlay({ quote, onDone }: { quote?: SwapQuote; onDone: () => void }) {
  const { t } = useTranslation()
  return (
    <WalletSuccessSplash
      show={Boolean(quote)}
      headline={t('swap.swapCreated')}
      text={
        quote
          ? `${swapRouteTicker(quote.fromAsset.assetId, quote.fromAsset.ticker)} ${t('swap.routeConnector')} ${swapRouteTicker(quote.toAsset?.assetId, quote.toAsset?.ticker)} · ${t('swap.waitingForFill')}`
          : undefined
      }
      ariaLabel={t('swap.createdTapHome')}
      onDone={onDone}
    />
  )
}

function ReviewSummary({ quote, loading }: { quote: SwapQuote; loading: boolean }) {
  const { t } = useTranslation()
  return (
    <div className='swap-review-card'>
      <div className='swap-review-hero'>
        <div className='swap-review-avatars'>
          <TokenAvatar asset={quote.fromAsset} size={48} />
          {quote.toAsset ? <TokenAvatar asset={quote.toAsset} size={48} /> : null}
        </div>
        <div>
          <span>{t('swap.swapRoute')}</span>
          <h3 className='text-heading-sm'>
            {swapRouteTicker(quote.fromAsset.assetId, quote.fromAsset.ticker)} {t('swap.routeConnector')}{' '}
            {quote.toAsset?.external
              ? 'BTC'
              : (swapRouteTicker(quote.toAsset?.assetId, quote.toAsset?.ticker) ?? t('swap.asset'))}
          </h3>
        </div>
      </div>
      <MetricRow label={t('swap.title')} value={`${quote.fromAmount} ${quote.fromAsset.ticker}`} loading={loading} />
      <MetricRow
        label={quote.toAsset?.external ? t('swap.receiveBeforeBitcoinFee') : t('swap.receive')}
        value={quote.toAsset ? `${quote.toAmount} ${quote.toAsset.ticker}` : t('swap.chooseAsset')}
        loading={loading}
      />
      <MetricRow label={t('swap.fees')} value={quote.feeLabel} loading={loading} />
      {quote.toAsset?.networkLabel ? (
        <>
          <MetricRow label={t('common.network')} value={quote.toAsset.networkLabel} loading={false} />
          <p className='mt-2 text-sm text-muted-foreground'>{t('swap.onchainNetworkFees')}</p>
        </>
      ) : null}
    </div>
  )
}

function QuoteDetails({ quote, loading }: { quote: SwapQuote; loading: boolean }) {
  const { t } = useTranslation()
  return (
    <div className='swap-detail-card'>
      <MetricRow
        label={<RateLabel />}
        value={
          quote.toAsset ? `1 ${quote.rateFromTicker} = ${quote.rateLabel} ${quote.rateToTicker}` : t('swap.pending')
        }
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

function selectedQuoteDisplay(display: SwapQuote, quote: Quote): SwapQuote {
  const to = display.toAsset
  if (!to) return display
  const from = display.fromAsset
  const fromDecimals = from.assetId === BTC_ASSET_ID ? 8 : from.decimals
  const toDecimals = to.assetId === BTC_ASSET_ID || to.external ? 8 : to.decimals
  const rate = new Decimal(quote.take.amount.toString())
    .div(new Decimal(10).pow(toDecimals))
    .div(new Decimal(quote.give.amount.toString()).div(new Decimal(10).pow(fromDecimals)))
  return {
    ...display,
    fromAmount: formatQuoteAmount(quote.give.amount, from.decimals),
    toAmount: formatQuoteAmount(quote.take.amount, to.decimals),
    toCurrency: '',
    toCurrencyValue: 0,
    feeLabel: quoteFeeLabel(display, quote),
    rateLabel: rate.toSignificantDigits(10).toFixed(),
    rateToTicker: to.external ? 'BTC' : display.rateToTicker,
  }
}

function quoteFeeLabel(display: SwapQuote, quote: Quote): string {
  const feeAsset = quote.fee.asset === quote.give.asset ? display.fromAsset : display.toAsset
  return feeAsset ? `${formatQuoteAmount(quote.fee.amount, feeAsset.decimals)} ${feeAsset.ticker}` : display.feeLabel
}

function buildQuoteFromPlan(
  plan: OfferPlan | null,
  assetAmount: string,
  entryMode: AmountMode,
  fromAsset: SwapAsset,
  toAsset: SwapAsset | undefined,
  unitOfAccountUsd: number,
  currency: Currencies,
  bitcoinUnit: Unit,
): SwapQuote {
  const parsed = Number(assetAmount) || 0
  const fromUsd = estimateSwapUsd(fromAsset)
  const toUsd = toAsset ? estimateSwapUsd(toAsset) : 0
  const fromScale = protocolToDisplayScale(fromAsset)
  const toScale = toAsset ? protocolToDisplayScale(toAsset) : 1
  // fromUsd/toUsd price per whole protocol unit (whole BTC, not sats), same
  // as the solver's plan.*.display — do the USD math and the rate in that
  // scale, and only convert to sats for the on-screen amount labels below.
  const estimatedFromUnitsProtocol = parsed / fromScale
  const fromUnitsProtocol = plan ? Number(plan.deposit.display) : estimatedFromUnitsProtocol
  const receivedProtocol = plan && toAsset ? Number(plan.receive.display) : 0
  const fromUnits = fromUnitsProtocol * fromScale
  const received = receivedProtocol * toScale
  const fromCurrencyAvailable = hasCurrencyConversion(fromAsset, unitOfAccountUsd)
  const toCurrencyAvailable = Boolean(toAsset && hasCurrencyConversion(toAsset, unitOfAccountUsd))
  const receivedCurrencyAmount = toCurrencyAvailable ? (receivedProtocol * toUsd) / unitOfAccountUsd : 0
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
  const giveEstimate = fromCurrencyAvailable ? (fromUnitsProtocol * fromUsd) / unitOfAccountUsd : 0
  const selectedCurrencyAmount =
    plan && toAsset && grossUp > 0 && receivedCurrencyAmount > 0 ? receivedCurrencyAmount * grossUp : giveEstimate
  // the review drawer's Fees row itemizes the fee, so the Rate row quotes the
  // market feed's pre-fee price — a net-derived rate would count the fee
  // twice and read consistently fee_bps below the market
  const rate = plan ? preFeeDisplayRate(plan) : 0
  // the market fee is deducted from the payout, so show it in the receive
  // asset (like the Swap/Receive rows), not the wallet's fiat display currency:
  // the fee is the gross-minus-net gap
  const feeReceived = received * feeFraction * grossUp
  const formatOptions = { bitcoinUnit }

  return {
    fromAsset,
    toAsset,
    fromAmount: formatAssetQuantity(fromUnits, fromAsset.decimals),
    fromCurrency: fromCurrencyAvailable ? prettyFiatAmount(selectedCurrencyAmount, currency, formatOptions) : '',
    toAmount: toAsset ? formatAssetQuantity(received, toAsset.decimals) : '0',
    toCurrency: toCurrencyAvailable ? prettyFiatAmount(receivedCurrencyAmount, currency, formatOptions) : '',
    feeLabel: toAsset ? `${formatAssetQuantity(feeReceived, toAsset.decimals)} ${toAsset.ticker}` : '',
    // the rate is always quoted per whole BTC even though amounts display in
    // sats — "1 sats = 0.0000006 USD" is technically correct but unreadable
    rateFromTicker: swapRouteTicker(fromAsset.assetId, fromAsset.ticker) ?? '',
    rateToTicker: toAsset ? (swapRouteTicker(toAsset.assetId, toAsset.ticker) ?? '') : '',
    rateLabel: prettyNumber(rate, swapAmountDecimals(rate)),
    fromCurrencyValue: fromCurrencyAvailable ? selectedCurrencyAmount : 0,
    toCurrencyValue: receivedCurrencyAmount,
    // what the persisted receipt echoes as the trade's volume: in fiat entry
    // the user committed a fiat figure converted at the wallet's own rate, so
    // echo it back (a "$5" swap reads $5.00 in activity, not a solver-rate
    // $4.99); in unit entry the solver-priced give label is what they saw
    // next to their amount and confirmed
    giveCurrencyValue: fromCurrencyAvailable ? (entryMode === 'fiat' ? giveEstimate : selectedCurrencyAmount) : 0,
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

/** Currency amount converted into the asset's entry/display scale (sats for
 * BTC, the asset's own decimals otherwise). Returns undefined with no price feed. */
function assetUnitsFromCurrencyAmount(
  amount: string,
  fromAsset: SwapAsset,
  unitOfAccountUsd: number,
): number | undefined {
  const assetUsd = estimateSwapUsd(fromAsset)
  if (!assetUsd || !unitOfAccountUsd) return undefined
  return (((Number(amount) || 0) * unitOfAccountUsd) / assetUsd) * protocolToDisplayScale(fromAsset)
}

function amountInAssetUnits(amount: string, mode: AmountMode, fromAsset: SwapAsset, unitOfAccountUsd: number): string {
  if (mode === 'asset') return amount
  const units = assetUnitsFromCurrencyAmount(amount, fromAsset, unitOfAccountUsd)
  if (units === undefined) return ''
  // this string is parsed by Number()/BigInt downstream (the quote debounce
  // gate, amountForQuote, the solver's giveAmount) — no thousands separators
  return prettyNumber(fromAsset.decimals === 0 ? Math.floor(units) : units, fromAsset.decimals, false)
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
  lacksChangeCarrier,
  fromAsset,
  pairAvailable,
  plan,
  planError,
  solvable,
  status,
}: {
  amount: string
  exceedsBalance: boolean
  lacksChangeCarrier: boolean
  fromAsset: SwapAsset
  pairAvailable: boolean | undefined
  plan: OfferPlan | null
  planError: ReturnType<typeof validatePlan>
  solvable: boolean | undefined
  status: string
}): string {
  if (!Number(amount)) return ''
  if (exceedsBalance) return 'Insufficient balance'
  if (lacksChangeCarrier) {
    return "You don't have enough bitcoin to do a partial swap. Please swap all or acquire some bitcoin."
  }
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

function isBalanceLimitValidation(message: string): boolean {
  return message === 'Insufficient balance' || message.startsWith('Minimum ') || message.startsWith('Maximum ')
}

/** swapValidationMessage() doubles as both an internal state marker and the
 * user-facing error text. Keep the markers as-is for state logic and localize
 * only the strings actually rendered (inline error / validation toast). */
function swapValidationText(message: string, t: (key: string) => string): string {
  if (message === 'Insufficient balance') return t('swap.insufficientBalance')
  if (message === 'Swap unavailable for this pair') return t('swap.pairUnavailable')
  if (message === 'Quote unavailable') return t('swap.quoteUnavailable')
  if (message === 'Amount too small') return t('swap.amountTooSmall')
  if (message === "You don't have enough bitcoin to do a partial swap. Please swap all or acquire some bitcoin.")
    return t('swap.partialSwapNeedsBtc')
  const minMatch = message.match(/^Minimum (.*)$/)
  if (minMatch) return `${t('swap.minimum')} ${minMatch[1]}`
  const maxMatch = message.match(/^Maximum (.*)$/)
  if (maxMatch) return `${t('swap.maximum')} ${maxMatch[1]}`
  return message
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
  const rate = preFeeDisplayRate(plan)
  if (!rate) return ''
  const limitReceiveProtocol = Number(limit.display)
  // the limits bound the NET receive side (post-fee), but the rate is the
  // pre-fee price — gross the bound up by the market fee or the suggested
  // give amount pays out just under the minimum
  const feeFraction = plan.market.fee_bps / 10_000
  const grossUp = feeFraction < 1 ? 1 / (1 - feeFraction) : 1
  // the rate is oriented give→receive, so dividing the receive-side limit by
  // it lands back on the give side in both market orientations
  const giveProtocol = (limitReceiveProtocol / rate) * grossUp
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
    // unpriceable trade: omit rather than persist a fabricated zero
    ...(quote.giveCurrencyValue > 0 || quote.fromCurrencyValue > 0
      ? {
          fiatCurrency: currency,
          fromFiatAmount: quote.giveCurrencyValue > 0 ? quote.giveCurrencyValue : quote.fromCurrencyValue,
        }
      : {}),
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

function hasCurrencyConversion(asset: SwapAsset, unitOfAccountUsd: number): boolean {
  return Boolean(estimateSwapUsd(asset) && unitOfAccountUsd)
}

function hasDistinctCurrencyConversion(asset: SwapAsset, currency: Currencies, unitOfAccountUsd: number): boolean {
  return asset.currency !== currency && hasCurrencyConversion(asset, unitOfAccountUsd)
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
  // verified fiat accounts price from their designation, not their ticker —
  // and the row's full-precision fiatAmount never has to divide a truncated balance
  if (row.fiatCurrency) return convertFiat(1, row.fiatCurrency, Currencies.USD)
  if (ticker === 'USDT' || ticker === 'USDC' || ticker === 'AUSD') return convertFiat(1, Currencies.USD, Currencies.USD)

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
  return `${formatAssetQuantity(atomicToUnits(assetBalanceAtomic(asset), asset.decimals), asset.decimals)} ${asset.ticker}`
}
