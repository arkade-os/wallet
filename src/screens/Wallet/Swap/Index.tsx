import { AnimatePresence, motion } from 'framer-motion'
import { useContext, useEffect, useMemo, useState } from 'react'
import { fromAtomic, type OfferAmount } from '@arkade-os/solver-discovery'
import { useOfferQuote } from '@arkade-os/solver-discovery/react'
import Button from '../../../components/Button'
import Content from '../../../components/Content'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import WalletSuccessSplash from '../../../components/WalletSuccessSplash'
import { EASE_IN_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { extractError } from '../../../lib/error'
import { normalizeBitcoinUnit, prettyBitcoinAmount, prettyCurrencyAssetAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSubtle, hapticTap } from '../../../lib/haptics'
import { BTC_ASSET_ID, findMarket, QUOTE_OPTIONS, validatePlan } from '../../../lib/swap/markets'
import { AssetSwap, AssetSwapStatus } from '../../../lib/swap/store'
import { Unit } from '../../../lib/types'
import { AspContext } from '../../../providers/asp'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { ConfigContext } from '../../../providers/config'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import {
  AssetPickerDrawer,
  filterAssets,
  Keypad,
  ReviewDrawer,
  SwapAsset,
  SwapAssetList,
  SwapComposer,
  SwapUnavailableState,
} from './Components'

type SwapStep = 'select-from' | 'compose'
type DrawerState = 'to' | 'review' | null

const statusLabels: Record<AssetSwapStatus, string> = {
  pending: 'Pending',
  cancelling: 'Cancelling',
  fulfilled: 'Completed',
  cancelled: 'Cancelled',
  recoverable: 'Recoverable',
}

export default function WalletSwap() {
  const { aspInfo } = useContext(AspContext)
  const { cancelSwap, createSwap, markets, swapAvailable, swaps } = useContext(AssetSwapsContext)
  const { config } = useContext(ConfigContext)
  const { goBack, navigate } = useContext(NavigationContext)
  const { assetBalances, assetMetadataCache, balance, svcWallet } = useContext(WalletContext)
  const prefersReduced = useReducedMotion()

  const [availableSats, setAvailableSats] = useState(0)
  const [step, setStep] = useState<SwapStep>('select-from')
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState('0')
  const [fromAssetId, setFromAssetId] = useState(BTC_ASSET_ID)
  const [toAssetId, setToAssetId] = useState<string>()
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [swapTurn, setSwapTurn] = useState(0)
  const [invalidPulse, setInvalidPulse] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [successText, setSuccessText] = useState('')
  const [cancelling, setCancelling] = useState('')

  // spendable offchain balance, refreshed like the send form does
  useEffect(() => {
    if (!svcWallet) return
    svcWallet
      .getBalance()
      .then((bal) => setAvailableSats(bal.available))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance, svcWallet])

  // the wallet-wide bitcoin unit governs how the btc side is typed and shown
  const btcUnit = normalizeBitcoinUnit(config.unit)
  const btcEntryPrecision = btcUnit === Unit.BTC ? 8 : 0 // sats and ₿ are typed as whole sats

  // btc + every asset quoted by a discovered market, with wallet balances
  const swapAssets = useMemo<SwapAsset[]>(() => {
    const assets: SwapAsset[] = [
      {
        assetId: BTC_ASSET_ID,
        name: 'Bitcoin',
        ticker: btcUnit === Unit.BTC ? 'BTC' : btcUnit,
        precision: btcEntryPrecision,
        balance: BigInt(availableSats),
      },
    ]
    for (const market of markets) {
      const { id, name, ticker, precision } = market.quote_asset
      if (assets.some((asset) => asset.assetId === id)) continue
      const owned = assetBalances?.find((ab) => ab.assetId === id)
      assets.push({
        assetId: id,
        name,
        ticker,
        precision,
        balance: owned ? BigInt(owned.amount) : BigInt(0),
        icon: assetMetadataCache.get(id)?.metadata?.icon,
      })
    }
    return assets
  }, [markets, availableSats, assetBalances, assetMetadataCache, btcUnit, btcEntryPrecision])

  const fromAsset = swapAssets.find((asset) => asset.assetId === fromAssetId) ?? swapAssets[0]
  const toAsset = toAssetId ? swapAssets.find((asset) => asset.assetId === toAssetId) : undefined

  const pair = toAsset ? findMarket(markets, fromAsset.assetId, toAsset.assetId) : undefined
  const quote = useOfferQuote(pair?.market ?? null, { give: pair?.give, ...QUOTE_OPTIONS })
  const { plan, setGiveAmount, status } = quote

  /** Amounts of the btc side render in the configured unit; assets in their own. */
  const fmtAmount = (offerAmount: OfferAmount): string =>
    offerAmount.asset.id === BTC_ASSET_ID
      ? prettyBitcoinAmount(Number(offerAmount.atomic), btcUnit)
      : `${offerAmount.display} ${offerAmount.asset.ticker}`

  // typed sats are converted to the btc display string the quote lib expects
  const amountForQuote = (value: string): string =>
    fromAsset.assetId === BTC_ASSET_ID && btcEntryPrecision === 0
      ? fromAtomic(BigInt(value.replace(/\D/g, '') || '0'), 8)
      : value

  // the keypad renders instantly; the quote (a price feed fetch) is debounced.
  // quotedAmount tracks which input produced the current plan so a stale plan
  // can never be confirmed during the debounce window
  const [quotedAmount, setQuotedAmount] = useState('0')
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGiveAmount(Number(amount) > 0 ? amountForQuote(amount) : '')
      setQuotedAmount(amount)
    }, 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, fromAsset.assetId, setGiveAmount])
  const quoteStale = quotedAmount !== amount

  // trim the buffer when the send asset allows fewer decimals
  useEffect(() => {
    setAmount((current) => {
      const dot = current.indexOf('.')
      if (dot < 0) return current
      if (fromAsset.precision === 0) return current.slice(0, dot) || '0'
      return current.slice(0, dot + 1 + fromAsset.precision)
    })
  }, [fromAsset.assetId, fromAsset.precision])

  const planError = plan ? validatePlan(plan, fromAsset.balance, aspInfo.dust) : undefined
  const validationMessage = !toAsset
    ? ''
    : !pair?.market
      ? 'Swap unavailable for this pair'
      : status === 'error'
        ? 'Quote unavailable'
        : planError === 'insufficient-balance'
          ? 'Insufficient balance'
          : planError === 'below-min'
            ? `Minimum ${fmtAmount(plan!.limits.minBase)}`
            : planError === 'above-max'
              ? `Maximum ${fmtAmount(plan!.limits.maxBase)}`
              : planError === 'below-dust'
                ? 'Amount too small'
                : ''

  const quoteLoading = status === 'loading' || (quoteStale && Number(amount) > 0)
  const canContinue = Boolean(toAsset && plan && status === 'success' && !planError && !quoteStale)

  useEffect(() => {
    if (!validationMessage) return
    hapticSubtle()
    setInvalidPulse((current) => current + 1)
  }, [validationMessage])

  const review =
    plan && toAsset
      ? {
          fromAsset,
          toAsset,
          swapAmount: fmtAmount(plan.deposit),
          receiveAmount: `≥ ${fmtAmount(plan.receive)}`,
          feeLabel: `${prettyNumber(plan.market.fee_bps / 100, 2)}%`,
          rateLabel: `1 ${plan.market.base_asset.ticker} = ${prettyNumber(Number(plan.priceDisplay), 2)} ${plan.market.quote_asset.ticker}`,
        }
      : undefined

  const pressKey = (key: string) => {
    setConfirmError('')
    const maxDecimals = fromAsset.precision
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

  const selectFromAsset = (asset: SwapAsset) => {
    hapticLight()
    setFromAssetId(asset.assetId)
    // keep the receive asset only if a market quotes the new pair
    setToAssetId((current) =>
      current && current !== asset.assetId && findMarket(markets, asset.assetId, current)?.market ? current : undefined,
    )
    setSearch('')
    setStep('compose')
  }

  const selectToAsset = (asset: SwapAsset) => {
    hapticLight()
    setConfirmError('')
    setToAssetId(asset.assetId)
    setDrawer(null)
  }

  const swapSides = () => {
    if (!toAsset) return
    hapticLight()
    setSwapTurn((current) => current + 1)
    setFromAssetId(toAsset.assetId)
    setToAssetId(fromAsset.assetId)
  }

  const openDrawer = (nextDrawer: DrawerState) => {
    hapticLight()
    if (nextDrawer === 'review') setConfirmError('')
    setDrawer(nextDrawer)
  }

  const handleBack = () => {
    if (step === 'compose') {
      setStep('select-from')
      return
    }
    goBack()
  }

  const handleSuccessDone = () => {
    setSuccessText('')
    navigate(Pages.Wallet)
  }

  useEffect(() => {
    if (!successText) return
    const timer = window.setTimeout(handleSuccessDone, 3000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successText])

  const confirmSwap = async () => {
    if (!plan || !toAsset || confirming || !canContinue) return
    setConfirmError('')
    setConfirming(true)
    try {
      await createSwap(plan)
      setConfirming(false)
      setDrawer(null)
      setSuccessText(`${fromAsset.ticker} to ${toAsset.ticker} — waiting for the solver to fill it`)
    } catch (err) {
      setConfirming(false)
      setConfirmError(extractError(err))
    }
  }

  const handleCancelSwap = async (swap: AssetSwap) => {
    if (cancelling) return
    hapticLight()
    setCancelling(swap.id)
    try {
      await cancelSwap(swap.id)
    } catch (err) {
      setConfirmError(extractError(err))
    } finally {
      setCancelling('')
    }
  }

  const stageTransition = prefersReduced ? { duration: 0 } : { duration: 0.28, ease: EASE_IN_OUT_QUINT_TUPLE }
  const filteredAssets = useMemo(() => filterAssets(swapAssets, search), [search, swapAssets])
  const assetById = (assetId: string) => swapAssets.find((asset) => asset.assetId === assetId)

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
                  {/* an outage only blocks creating swaps; existing swaps stay
                      listed so pending funds remain cancellable */}
                  {swapAvailable ? (
                    <SwapAssetList
                      title='Choose asset to swap'
                      subtitle='Select the asset you want to trade from.'
                      search={search}
                      assets={filteredAssets}
                      onSearch={setSearch}
                      onSelect={selectFromAsset}
                    />
                  ) : (
                    <SwapUnavailableState />
                  )}
                  {swaps.length > 0 ? (
                    <div className='swap-asset-list-panel'>
                      <div className='swap-step-heading'>
                        <p>Your swaps</p>
                      </div>
                      <div className='swap-token-list'>
                        {swaps.map((swap) => {
                          const from = assetById(swap.fromAsset)
                          const to = assetById(swap.toAsset)
                          const fromAmount = from
                            ? `${prettyCurrencyAssetAmount(BigInt(swap.fromAmount), from.precision, from.ticker)} ${from.ticker}`
                            : swap.fromAmount
                          const toAmount = to
                            ? `${prettyCurrencyAssetAmount(BigInt(swap.toAmount), to.precision, to.ticker)} ${to.ticker}`
                            : swap.toAmount
                          const cancellable = swap.status === 'pending' || swap.status === 'recoverable'
                          return (
                            <div key={swap.id} className='swap-token-row'>
                              <span className='swap-token-row__copy'>
                                <span>
                                  {from?.ticker ?? '?'} to {to?.ticker ?? '?'}
                                </span>
                                <small>
                                  {fromAmount} for ≥ {toAmount}
                                </small>
                              </span>
                              {cancellable ? (
                                <button
                                  type='button'
                                  className='swap-cancel-button'
                                  disabled={Boolean(cancelling)}
                                  onClick={() => handleCancelSwap(swap)}
                                >
                                  {cancelling === swap.id ? 'Cancelling…' : 'Cancel'}
                                </button>
                              ) : null}
                              <strong>{statusLabels[swap.status]}</strong>
                            </div>
                          )
                        })}
                      </div>
                      {confirmError ? <p className='swap-confirm-error'>{confirmError}</p> : null}
                    </div>
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
                    fromAsset={fromAsset}
                    toAsset={toAsset}
                    receiveAmount={plan ? `≥ ${fmtAmount(plan.receive)}` : '—'}
                    onOpenReceiveDrawer={() => openDrawer('to')}
                    onSwapSides={swapSides}
                    validationMessage={validationMessage}
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
        assets={swapAssets.filter(
          (asset) =>
            asset.assetId !== fromAsset.assetId &&
            Boolean(findMarket(markets, fromAsset.assetId, asset.assetId)?.market),
        )}
        selectedId={toAsset?.assetId}
        onOpenChange={(open) => {
          if (!open) setDrawer(null)
        }}
        onSelect={selectToAsset}
      />

      <ReviewDrawer
        open={drawer === 'review'}
        review={review}
        canConfirm={canContinue}
        confirming={confirming}
        error={confirmError}
        quoteLoading={quoteLoading}
        onOpenChange={(open) => {
          if (!open) setDrawer(null)
        }}
        onConfirm={confirmSwap}
      />

      <WalletSuccessSplash
        show={Boolean(successText)}
        headline='Swap created'
        text={successText}
        ariaLabel='Swap created. Tap to go home.'
        onDone={handleSuccessDone}
      />
    </>
  )
}
