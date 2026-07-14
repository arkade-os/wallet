import { AnimatePresence, motion } from 'framer-motion'
import { useContext, useEffect, useMemo, useState } from 'react'
import { useOfferQuote } from '@arkade-os/solver-discovery/react'
import Button from '../../../components/Button'
import Content from '../../../components/Content'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import WalletSuccessSplash from '../../../components/WalletSuccessSplash'
import { EASE_IN_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { extractError } from '../../../lib/error'
import { prettyCurrencyAssetAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSubtle, hapticTap } from '../../../lib/haptics'
import { BTC_ASSET_ID, findMarket, QUOTE_OPTIONS, validatePlan } from '../../../lib/swap/markets'
import { AssetSwap, AssetSwapStatus } from '../../../lib/swap/store'
import { AspContext } from '../../../providers/asp'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
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
  fulfilled: 'Completed',
  cancelled: 'Cancelled',
  recoverable: 'Recoverable',
}

export default function WalletSwap() {
  const { aspInfo } = useContext(AspContext)
  const { cancelSwap, createSwap, markets, swapAvailable, swaps } = useContext(AssetSwapsContext)
  const { goBack, navigate } = useContext(NavigationContext)
  const { assetBalances, balance, svcWallet } = useContext(WalletContext)
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

  // btc + every asset quoted by a discovered market, with wallet balances
  const swapAssets = useMemo<SwapAsset[]>(() => {
    const assets: SwapAsset[] = [
      { assetId: BTC_ASSET_ID, name: 'Bitcoin', ticker: 'BTC', precision: 8, balance: BigInt(availableSats) },
    ]
    for (const market of markets) {
      const { id, name, ticker, precision } = market.quote_asset
      if (assets.some((asset) => asset.assetId === id)) continue
      const owned = assetBalances?.find((ab) => ab.assetId === id)
      assets.push({ assetId: id, name, ticker, precision, balance: owned ? BigInt(owned.amount) : BigInt(0) })
    }
    return assets
  }, [markets, availableSats, assetBalances])

  const fromAsset = swapAssets.find((asset) => asset.assetId === fromAssetId) ?? swapAssets[0]
  const toAsset = toAssetId ? swapAssets.find((asset) => asset.assetId === toAssetId) : undefined

  const pair = toAsset ? findMarket(markets, fromAsset.assetId, toAsset.assetId) : undefined
  const quote = useOfferQuote(pair?.market ?? null, { give: pair?.give, ...QUOTE_OPTIONS })
  const { plan, setGiveAmount, status } = quote

  // the keypad renders instantly; the quote (a price feed fetch) is debounced
  useEffect(() => {
    const timer = window.setTimeout(() => setGiveAmount(Number(amount) > 0 ? amount : ''), 300)
    return () => window.clearTimeout(timer)
  }, [amount, setGiveAmount])

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
            ? `Minimum ${plan!.limits.minBase.display} ${plan!.limits.baseAsset.ticker}`
            : planError === 'above-max'
              ? `Maximum ${plan!.limits.maxBase.display} ${plan!.limits.baseAsset.ticker}`
              : planError === 'below-dust'
                ? 'Amount too small'
                : ''

  const quoteLoading = status === 'loading'
  const canContinue = Boolean(toAsset && plan && status === 'success' && !planError)

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
          swapAmount: `${plan.deposit.display} ${fromAsset.ticker}`,
          receiveAmount: `≥ ${plan.receive.display} ${toAsset.ticker}`,
          feeLabel: `${prettyNumber((plan.market.fee_bps + plan.safetyBps) / 100, 2)}%`,
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
    setToAssetId((current) => (current === asset.assetId ? undefined : current))
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

  if (!swapAvailable) {
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
                    subtitle='Select the asset you want to trade from.'
                    search={search}
                    assets={filteredAssets}
                    onSearch={setSearch}
                    onSelect={selectFromAsset}
                  />
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
                    receiveAmount={plan && toAsset ? `≥ ${plan.receive.display} ${toAsset.ticker}` : '—'}
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
        assets={swapAssets.filter((asset) => asset.assetId !== fromAsset.assetId)}
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
