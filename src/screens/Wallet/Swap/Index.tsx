import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import AssetAvatar from '../../../components/AssetAvatar'
import Button from '../../../components/Button'
import Content from '../../../components/Content'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import TokenLogo, { type TokenLogoTicker } from '../../../components/TokenLogo'
import WalletSuccessSplash from '../../../components/WalletSuccessSplash'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer'
import ArrowUpDownIcon from '../../../icons/ArrowUpDown'
import ChevronDownIcon from '../../../icons/ChevronDown'
import SwapIcon from '../../../icons/Swap'
import { EASE_IN_OUT_QUINT_TUPLE, EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { prettyCurrencyAssetAmount, prettyFiatAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSubtle, hapticTap } from '../../../lib/haptics'
import { Currencies } from '../../../lib/types'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { containsDevSwapTestAssets, usePortfolioFiat, type PortfolioRow } from '../../../hooks/usePortfolioFiat'
import { isDevSwapTestAssetId } from '../../../lib/devSwapTestAssets'
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

interface ExitingAmountCharacter {
  character: string
  id: number
  slotClassName: string
}

const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back']
const emptySwapAsset: SwapAsset = {
  assetId: 'swap-empty',
  name: 'Asset',
  ticker: 'ASSET',
  decimals: 0,
  balance: BigInt(0),
  usdPrice: 0,
}

export default function WalletSwap() {
  const { config } = useContext(ConfigContext)
  const { fiatDecimals, fromFiatAmount, toFiat, toFiatAmount } = useContext(FiatContext)
  const { swapFromAssetId, setSwapFromAssetId } = useContext(FlowContext)
  const { goBack, navigate } = useContext(NavigationContext)
  const { addPrototypeSwap } = useContext(WalletContext)
  const { rows } = usePortfolioFiat()
  const prefersReduced = useReducedMotion()

  const assets = useMemo(
    () => toSwapAssets(rows, config.fiat, fiatDecimals(), fromFiatAmount, toFiat, toFiatAmount),
    [rows, config.fiat, fiatDecimals, fromFiatAmount, toFiat, toFiatAmount],
  )
  const swapAssets = useMemo(
    () => (containsDevSwapTestAssets(rows) ? assets.filter((asset) => isDevSwapTestAssetId(asset.assetId)) : assets),
    [assets, rows],
  )
  const initialFromAssetId = resolveInitialFromAssetId(swapAssets, swapFromAssetId)
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
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [successQuote, setSuccessQuote] = useState<SwapQuote>()

  const fromAsset =
    swapAssets.find((asset) => asset.assetId === fromAssetId) ??
    firstPositiveBalanceAsset(swapAssets) ??
    swapAssets[0] ??
    emptySwapAsset
  const toAsset = toAssetId
    ? swapAssets.find((asset) => asset.assetId === toAssetId && asset.assetId !== fromAsset.assetId)
    : undefined
  const quote = useMemo(
    () => buildQuote(amount, amountMode, fromAsset, toAsset),
    [amount, amountMode, fromAsset, toAsset],
  )
  const quoteAvailable = !toAsset || isQuoteAvailable(fromAsset, toAsset)
  const hasPositiveAmount = Number(amount) > 0
  const hasSufficientBalance = canSpendSwapAmount(amount, amountMode, fromAsset)
  const validationState: SwapValidationState = !quoteAvailable
    ? 'quote-unavailable'
    : hasPositiveAmount && !hasSufficientBalance
      ? 'insufficient-balance'
      : 'idle'
  const canContinue = Boolean(toAsset) && hasPositiveAmount && hasSufficientBalance && quoteAvailable && !quoteLoading

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
    setToAssetId((current) => (current === assetId ? undefined : current))
    setSearch('')
    setStep('compose')
  }, [])

  useEffect(() => {
    if (!swapFromAssetId || swapAssets.length === 0) return

    const nextFromAssetId = resolveInitialFromAssetId(swapAssets, swapFromAssetId) ?? swapAssets[0]?.assetId ?? 'btc'

    focusFromAsset(nextFromAssetId)
    setSwapFromAssetId(undefined)
  }, [focusFromAsset, setSwapFromAssetId, swapAssets, swapFromAssetId])

  useEffect(() => {
    if (!toAsset || !hasPositiveAmount || !quoteAvailable) {
      setQuoteLoading(false)
      return
    }

    setQuoteLoading(true)
    const timer = window.setTimeout(() => setQuoteLoading(false), 360)
    return () => window.clearTimeout(timer)
  }, [amount, amountMode, fromAsset.assetId, hasPositiveAmount, quoteAvailable, toAsset?.assetId])

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
    setSwapTurn((current) => current + 1)
    setFromAssetId(toAsset.assetId)
    setToAssetId(fromAsset.assetId)
  }

  const pressKey = (key: string) => {
    setConfirmError('')
    const maxDecimals = amountMode === 'fiat' ? 2 : fromAsset.decimals
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
    if (!toAsset || confirming || !canContinue) return

    setConfirmError('')
    setConfirming(true)
    window.setTimeout(() => {
      try {
        const execution = buildPrototypeSwapExecution(amount, amountMode, fromAsset, toAsset)
        addPrototypeSwap(execution)
        setConfirming(false)
        setDrawer(null)
        setSuccessQuote(quote)
        hapticLight()
      } catch {
        setConfirming(false)
        setConfirmError('Swap failed. Check the route and try again.')
        hapticLight()
      }
    }, 850)
  }

  if (swapAssets.length < 2) {
    return (
      <>
        <Header text='Swap' back={goBack} />
        <Content className='asset-swap-content'>
          <Padded>
            <SwapUnavailableState />
          </Padded>
        </Content>
      </>
    )
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
                    empty={filteredAssets.length === 0}
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
                    validationState={validationState}
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
        assets={swapAssets.filter((asset) => asset.assetId !== fromAsset.assetId)}
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
          if (!open) setDrawer(null)
        }}
        onConfirm={confirmPrototypeSwap}
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
  quote,
  fromAsset,
  toAsset,
  onAmountFocus,
  onModeToggle,
  onOpenReceiveDrawer,
  onSwapSides,
  validationState,
  invalidPulse,
  quoteLoading,
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
  validationState: SwapValidationState
  invalidPulse: number
  quoteLoading: boolean
  swapTurn: number
}) {
  const prefersReduced = useReducedMotion()
  const amountLabel = amountMode === 'fiat' ? formatFiatInputAmount(amount) : `${amount} ${fromAsset.ticker}`
  const subAmountLabel = amountMode === 'fiat' ? `${quote.fromAmount} ${fromAsset.ticker}` : quote.fromFiat
  const nextAmountModeLabel = amountMode === 'fiat' ? 'asset amount' : 'fiat amount'
  const validationMessage =
    validationState === 'insufficient-balance'
      ? 'Insufficient balance'
      : validationState === 'quote-unavailable'
        ? 'Swap unavailable for this pair'
        : ''

  return (
    <div className='swap-composer'>
      <div className='swap-input-card'>
        <div className='swap-input-card__asset'>
          <TokenAvatar asset={fromAsset} size={36} />
          <div>
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
  return `symbol-${character}`
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
      headline='Swap successful'
      text={quote ? `${quote.fromAsset.ticker} to ${quote.toAsset?.ticker}` : undefined}
      ariaLabel='Swap successful. Tap to go home.'
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
      <div className='swap-review-total'>
        <span>Estimated receive</span>
        <strong>{loading ? <SwapSkeletonText width='5rem' /> : quote.toFiat}</strong>
      </div>
      <MetricRow
        label={`Swap ${quote.fromAsset.ticker}`}
        value={`${quote.fromAmount} ${quote.fromAsset.ticker}`}
        loading={loading}
      />
      <MetricRow
        label={`Receive ${quote.toAsset?.ticker ?? 'asset'}`}
        value={quote.toAsset ? `${quote.toAmount} ${quote.toAsset.ticker}` : 'Choose asset'}
        loading={loading}
      />
      <MetricRow label='Total value' value={quote.toFiat} loading={loading} />
    </div>
  )
}

function QuoteDetails({ quote, loading }: { quote: SwapQuote; loading: boolean }) {
  return (
    <div className='swap-detail-card'>
      <MetricRow
        label='Rate'
        value={quote.toAsset ? `1 ${quote.fromAsset.ticker} = ${quote.rateLabel} ${quote.toAsset.ticker}` : 'Pending'}
        loading={loading}
      />
    </div>
  )
}

function MetricRow({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className='swap-metric-row'>
      <span>{label}</span>
      <span>{loading ? <SwapSkeletonText width='7rem' /> : value}</span>
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
    fromFiat: prettyFiatAmount(fromFiatNumber, Currencies.USD),
    toAmount: prettyNumber(received, swapAmountDecimals(received)),
    toFiat: prettyFiatAmount(received * toUsd, Currencies.USD),
    rateLabel: prettyNumber(rate, swapAmountDecimals(rate)),
  }
}

function formatFiatInputAmount(amount: string): string {
  const normalized = amount || '0'
  if (normalized.includes('.')) return `$${normalized}`
  return `$${Math.trunc(Number(normalized) || 0).toLocaleString('en-US')}`
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

function canSpendSwapAmount(amount: string, mode: AmountMode, fromAsset: SwapAsset): boolean {
  const parsed = Number(amount) || 0
  const fromUsd = estimateSwapUsd(fromAsset)
  const fromUnits = mode === 'fiat' && fromUsd > 0 ? parsed / fromUsd : parsed
  const requestedRawAmount = toRawAmount(fromUnits, fromAsset.decimals)
  const balanceRawAmount = typeof fromAsset.balance === 'bigint' ? fromAsset.balance : BigInt(fromAsset.balance)

  return requestedRawAmount > BigInt(0) && requestedRawAmount <= balanceRawAmount
}

function toRawAmount(units: number, decimals: number): bigint {
  if (!Number.isFinite(units) || units <= 0) return BigInt(0)
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

function isQuoteAvailable(fromAsset: SwapAsset, toAsset: SwapAsset): boolean {
  return estimateSwapUsd(fromAsset) > 0 && estimateSwapUsd(toAsset) > 0
}

function toSwapAssets(
  rows: PortfolioRow[],
  fiat: Currencies,
  decimals: number,
  fromFiatAmount: (amount: number, currency: Currencies) => number,
  toFiat: (satoshis?: number) => number,
  toFiatAmount: (satoshis: number, currency: Currencies) => number,
): SwapAsset[] {
  const convertFiatAmount = (amount: number, from: Currencies, to: Currencies) =>
    toFiatAmount(fromFiatAmount(amount, from), to)
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
    sourceAssetIds: row.sourceAssetIds,
    usdPrice: estimateRowUsdPrice(row, fiat, convertFiatAmount, toFiat),
  }))

  return mapped
}

function estimateRowUsdPrice(
  row: PortfolioRow,
  fiat: Currencies,
  convertFiatAmount: (amount: number, from: Currencies, to: Currencies) => number,
  toFiat: (satoshis?: number) => number,
): number {
  const ticker = row.ticker.trim().toUpperCase()
  if (row.assetId === 'btc' || ticker === 'BTC') return convertFiatAmount(toFiat(100_000_000), fiat, Currencies.USD)
  if (ticker === 'USD' || ticker === 'USDT' || ticker === 'USDC' || ticker === 'AUSD')
    return convertFiatAmount(1, Currencies.USD, Currencies.USD)
  if (ticker === 'CHF') return convertFiatAmount(1, Currencies.CHF, Currencies.USD)

  const rawBalance = typeof row.balance === 'bigint' ? Number(row.balance) : row.balance
  const unitBalance = rawBalance / 10 ** row.decimals
  if (!unitBalance || !row.hasFiatPrice) return 0

  return convertFiatAmount(row.fiatAmount / unitBalance, fiat, Currencies.USD)
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

function resolveInitialFromAssetId(assets: SwapAsset[], requestedAssetId?: string): string | undefined {
  if (requestedAssetId) return resolveSwapAssetId(assets, requestedAssetId)
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

function getTokenLogoTicker(ticker: string | undefined): TokenLogoTicker | undefined {
  const normalized = ticker?.trim().toUpperCase()
  if (
    normalized === 'BTC' ||
    normalized === 'USD' ||
    normalized === 'USDT' ||
    normalized === 'USDC' ||
    normalized === 'CHF'
  )
    return normalized
}
