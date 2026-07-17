import { AnimatePresence, motion } from 'framer-motion'
import { useContext, useEffect, useMemo, useState } from 'react'
import { fromAtomic, toAtomic, type OfferAmount } from '@arkade-os/solver-discovery'
import { useOfferQuote } from '@arkade-os/solver-discovery/react'
import Button from '../../../components/Button'
import Content from '../../../components/Content'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import WalletSuccessSplash from '../../../components/WalletSuccessSplash'
import { EASE_IN_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { extractError } from '../../../lib/error'
import { normalizeBitcoinUnit, prettyBitcoinAmount, prettyCurrencyAssetAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSubtle } from '../../../lib/haptics'
import { BTC_ASSET_ID, findMarket, QUOTE_OPTIONS, validatePlan } from '../../../lib/swap/markets'
import { AssetSwap, AssetSwapStatus } from '../../../lib/swap/store'
import { Unit } from '../../../lib/types'
import { AspContext } from '../../../providers/asp'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { ConfigContext } from '../../../providers/config'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { AssetPickerDrawer, ReviewDrawer, SwapAsset, SwapAssetList, SwapUnavailableState } from './Components'
import ButtonsOnBottom from '@/components/ButtonsOnBottom'
import SwapForm from './Form'
import Keyboard from '@/components/Keyboard'

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
  const [amount, setAmount] = useState('')
  const [fromAssetId, setFromAssetId] = useState(BTC_ASSET_ID)
  const [toAssetId, setToAssetId] = useState<string>()
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [successText, setSuccessText] = useState('')
  const [cancelling, setCancelling] = useState('')
  const [showKeypad, setShowKeypad] = useState(false)

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
        decimals: btcEntryPrecision,
        balance: BigInt(availableSats),
      },
    ]
    for (const market of markets) {
      const { id, name, ticker, decimals } = market.quote_asset
      if (assets.some((asset) => asset.assetId === id)) continue
      const owned = assetBalances?.find((ab) => ab.assetId === id)
      assets.push({
        assetId: id,
        name,
        ticker,
        decimals,
        balance: owned ? BigInt(owned.amount) : BigInt(0),
        icon: assetMetadataCache.get(id)?.metadata?.icon,
      })
    }
    return assets
  }, [markets, availableSats, assetBalances, assetMetadataCache, btcUnit, btcEntryPrecision])

  const assetById = (assetId: string) => swapAssets.find((asset) => asset.assetId === assetId)
  const fromAsset = assetById(fromAssetId) ?? swapAssets[0]
  const toAsset = toAssetId ? assetById(toAssetId) : undefined

  const pair = toAsset ? findMarket(markets, fromAsset.assetId, toAsset.assetId) : undefined
  const { plan, setGiveAmount, solvable, status } = useOfferQuote(pair?.market ?? null, {
    give: pair?.give,
    ...QUOTE_OPTIONS,
  })

  /** Amounts of the btc side render in the configured unit; assets in their own. */
  const fmtAmount = (offerAmount: OfferAmount): string =>
    offerAmount.asset.id === BTC_ASSET_ID
      ? prettyBitcoinAmount(Number(offerAmount.atomic), btcUnit)
      : `${offerAmount.display} ${offerAmount.asset.ticker}`

  // typed sats are converted to the btc display string the quote lib expects;
  // the fraction is dropped, never concatenated (the input already blocks it)
  const amountForQuote = (value: string): string =>
    fromAsset.assetId === BTC_ASSET_ID && btcEntryPrecision === 0
      ? fromAtomic(BigInt(value.split('.')[0].replace(/\D/g, '') || '0'), 8)
      : value

  // the keypad renders instantly; the quote (a price feed fetch) is debounced.
  // quotedAmount tracks which input produced the current plan so a stale plan
  // can never be confirmed during the debounce window
  const [quotedAmount, setQuotedAmount] = useState('0')
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGiveAmount(Number(amount) > 0 ? amountForQuote(amount) : '')
      setQuotedAmount(amount)
    }, 600)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, fromAsset.assetId, setGiveAmount])
  const quoteStale = quotedAmount !== amount

  // trim the buffer when the send asset allows fewer decimals
  useEffect(() => {
    setAmount((current) => {
      const dot = current.indexOf('.')
      if (dot < 0) return current
      if (fromAsset.decimals === 0) return current.slice(0, dot) || '0'
      return current.slice(0, dot + 1 + fromAsset.decimals)
    })
  }, [fromAsset.assetId, fromAsset.decimals])

  const planError = plan ? validatePlan(plan, fromAsset.balance, aspInfo.dust) : undefined
  const validationMessage = ((): string => {
    if (!toAsset || !amount) return ''
    if (!pair?.market || solvable === false) return 'Swap unavailable for this pair'
    if (status === 'error') return 'Quote unavailable'
    switch (planError) {
      case 'insufficient-balance':
        return 'Insufficient balance'
      case 'side-disabled':
        return 'Swap unavailable for this pair'
      case 'below-min':
        return `Minimum ${fmtAmount(plan!.limits.min!)}`
      case 'above-max':
        return `Maximum ${fmtAmount(plan!.limits.max!)}`
      case 'below-dust':
        return 'Amount too small'
      default:
        return ''
    }
  })()

  const quoteLoading = status === 'loading' || (quoteStale && Number(amount) > 0)
  const canContinue = Boolean(toAsset && plan && status === 'success' && !planError && !quoteStale)

  useEffect(() => {
    if (!validationMessage) return
    hapticSubtle()
  }, [validationMessage])

  const receiveLabel = plan ? `≥ ${fmtAmount(plan.receive)}` : undefined
  const review =
    plan && toAsset
      ? {
          fromAsset,
          toAsset,
          swapAmount: fmtAmount(plan.deposit),
          receiveAmount: receiveLabel!,
          feeLabel: `${prettyNumber(plan.market.fee_bps / 100, 2)}%`,
          rateLabel: `1 ${plan.market.base_asset.ticker} = ${prettyNumber(Number(plan.priceDisplay), 2)} ${plan.market.quote_asset.ticker}`,
        }
      : undefined

  const selectFromAsset = (asset: SwapAsset) => {
    hapticLight()
    setFromAssetId(asset.assetId)
    // keep the receive asset only if a market quotes the new pair
    setToAssetId((current) =>
      current && current !== asset.assetId && findMarket(markets, asset.assetId, current)?.market ? current : undefined,
    )
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
    setAmount('')
    // clear the hook synchronously too — the flipped `give` would otherwise
    // re-quote the old amount in the new deposit asset's units until the
    // debounce fires
    setGiveAmount('')
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
  const receiveAssets = useMemo(
    () => swapAssets.filter((asset) => Boolean(findMarket(markets, fromAsset.assetId, asset.assetId)?.market)),
    [swapAssets, markets, fromAsset.assetId],
  )
  const fmtSwapAmount = (assetId: string, atomic: string): string => {
    const asset = assetById(assetId)
    return asset ? `${prettyCurrencyAssetAmount(BigInt(atomic), asset.decimals, asset.ticker)} ${asset.ticker}` : atomic
  }

  if (showKeypad) {
    return (
      <Keyboard
        asset={fromAsset}
        // seed the keypad with the current entry (atomic units per contract)
        initialValue={amount ? toAtomic(amount, fromAsset.decimals) : undefined}
        back={() => setShowKeypad(false)}
        onSave={(value) => {
          setAmount(value)
          setShowKeypad(false)
        }}
      />
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
                  {/* an outage only blocks creating swaps; existing swaps stay
                      listed so pending funds remain cancellable */}
                  {swapAvailable ? (
                    <SwapAssetList
                      title='Choose asset to swap'
                      subtitle='Select the asset you want to trade from.'
                      assets={swapAssets}
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
                          const fromAmount = fmtSwapAmount(swap.fromAsset, swap.fromAmount)
                          const toAmount = fmtSwapAmount(swap.toAsset, swap.toAmount)
                          // recoverable (swept) deposits cannot be cancelled cooperatively,
                          // so no button; a persisted 'cancelling' can be retried
                          const cancellable = swap.status === 'pending' || swap.status === 'cancelling'
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
                                  {cancelling === swap.id
                                    ? 'Cancelling…'
                                    : swap.status === 'cancelling'
                                      ? 'Retry cancel'
                                      : 'Cancel'}
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
                  transition={stageTransition}
                  animate={{ opacity: 1, x: 0 }}
                  initial={prefersReduced ? false : { opacity: 0, x: 18 }}
                  exit={prefersReduced ? undefined : { opacity: 0, x: 18 }}
                >
                  <SwapForm
                    amount={amount}
                    toAsset={toAsset}
                    fromAsset={fromAsset}
                    onSwapSides={swapSides}
                    onOpenAssetPicker={() => openDrawer('to')}
                    onChangeAmount={setAmount}
                    quoteLoading={quoteLoading}
                    validationMessage={validationMessage}
                    onShowKeypad={() => setShowKeypad(true)}
                    receiveAmount={receiveLabel ?? '—'}
                  />
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </Padded>
      </Content>
      {step === 'compose' ? (
        <ButtonsOnBottom>
          <Button label='Continue' disabled={!canContinue} onClick={() => openDrawer('review')} />
        </ButtonsOnBottom>
      ) : null}

      <AssetPickerDrawer
        open={drawer === 'to'}
        assets={receiveAssets}
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
          // keep the drawer up while the swap is being created so a late
          // failure still has a surface to report on
          if (!open && !confirming) setDrawer(null)
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
