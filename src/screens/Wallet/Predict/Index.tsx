import { useContext, useEffect, useMemo, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import Figure from '../../../components/Figure'
import Header from '../../../components/Header'
import Keyboard, { type KeyboardInputMode } from '../../../components/Keyboard'
import Padded from '../../../components/Padded'
import SheetModal from '../../../components/SheetModal'
import Glyph from '../../../icons/Glyph'
import { usePredict } from '../../../hooks/usePredict'
import { prettyNumber, toSatoshis } from '../../../lib/format'
import { hapticLight, hapticSubtle } from '../../../lib/haptics'
import { BEACON_READ_FEE, type PredictKind } from '../../../lib/predict/constants'
import { formatCountdown, predictPayout, usdFromCents, windowOpen } from '../../../lib/predict/pricing'
import { FiatContext } from '../../../providers/fiat'
import { useTranslation } from '../../../providers/language'
import { WalletContext } from '../../../providers/wallet'
import IntroSheet, { introSeen } from './IntroSheet'
import PositionDetail from './PositionDetail'
import PositionsList from './PositionsList'
import PredictChart from './PredictChart'
import ReviewSheet from './ReviewSheet'
import { formatClockTime, formatGap, formatMultiplier, formatSats } from './format'

const MAINNET_PRESETS = [10_000, 25_000, 50_000, 100_000]
const TESTNET_PRESETS = [10_000, 50_000, 100_000, 250_000]

type View = { name: 'market' } | { name: 'positions' } | { name: 'position'; id: string }

export default function Predict() {
  const { fromFiat } = useContext(FiatContext)
  const { availableBalance } = useContext(WalletContext)
  const { t } = useTranslation()

  const {
    config,
    market,
    windows,
    selectedExpiry,
    setSelectedExpiry,
    lineCents,
    lineOfficial,
    secondsToClose,
    higherMultiplier,
    lowerMultiplier,
    positions,
    activeCount,
    requestQuote,
    fundQuote,
    cancelPosition,
    refundVoidPosition,
  } = usePredict()

  const presets = config.profile.isMainnet ? MAINNET_PRESETS : TESTNET_PRESETS
  const [view, setView] = useState<View>({ name: 'market' })
  const [kind, setKind] = useState<PredictKind>(2)
  const [stakeSats, setStakeSats] = useState<bigint>(BigInt(presets[1]!))
  const [stakeOpen, setStakeOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [introOpen, setIntroOpen] = useState(() => !introSeen())
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1_000)
    return () => clearInterval(id)
  }, [])

  const stakeMin = config.profile.stakeMin
  const stakeMax = config.profile.stakeMax
  const belowMin = stakeSats < stakeMin
  const aboveMax = stakeSats > stakeMax
  const overBalance = !config.demoMode && stakeSats > BigInt(availableBalance)
  const stakeError = belowMin
    ? t('predict.stakeBelowMin', { min: prettyNumber(Number(stakeMin)) })
    : aboveMax
      ? t('predict.stakeAboveMax', { max: prettyNumber(Number(stakeMax)) })
      : overBalance
        ? t('send.insufficientFunds')
        : ''

  const multiplier = kind === 2 ? higherMultiplier : lowerMultiplier
  const estimate = useMemo(() => {
    if (multiplier == null || stakeSats <= 0n) return null
    const gross = predictPayout(stakeSats, multiplier)
    return gross > BEACON_READ_FEE ? gross - BEACON_READ_FEE : null
  }, [multiplier, stakeSats])

  const canReview = Boolean(lineCents && selectedExpiry && multiplier != null && !stakeError)

  const gapCents = market && lineCents ? market.priceCents - lineCents : null
  const opensAt = selectedExpiry ? windowOpen(selectedExpiry) : 0
  const status = !market
    ? t('predict.loadingMarket')
    : !lineOfficial
      ? t('predict.lineSetsAt', { time: formatClockTime(opensAt) })
      : gapCents == null || gapCents === 0
        ? t('predict.marketFlat')
        : gapCents > 0
          ? t('predict.marketAbove', { gap: formatGap(gapCents) })
          : t('predict.marketBelow', { gap: formatGap(gapCents) })

  const saveStake = (value: string, mode: KeyboardInputMode) => {
    const n = Number(value.replaceAll(',', ''))
    const sats = mode === 'fiat' ? fromFiat(n) : mode === 'btc' ? toSatoshis(n) : Math.floor(n)
    setStakeSats(BigInt(Math.max(0, Math.round(sats))))
    setStakeOpen(false)
  }

  if (view.name === 'positions') {
    return (
      <PositionsList
        positions={positions}
        priceCents={market?.priceCents ?? null}
        nowSec={nowSec}
        onBack={() => setView({ name: 'market' })}
        onSelect={(pos) => setView({ name: 'position', id: pos.id })}
      />
    )
  }

  if (view.name === 'position') {
    const position = positions.find((p) => p.id === view.id)
    if (position) {
      return (
        <PositionDetail
          position={position}
          market={market}
          nowSec={nowSec}
          onBack={() => setView({ name: 'positions' })}
          onCancel={cancelPosition}
          onRefundVoid={refundVoidPosition}
        />
      )
    }
  }

  if (stakeOpen) {
    return (
      <div className='fixed inset-0 z-20 bg-[var(--bg)]'>
        <Keyboard
          back={() => setStakeOpen(false)}
          onSave={saveStake}
          saveLabel={t('common.save')}
          accessory={
            <div className='predict-presets' role='group' aria-label={t('predict.quickPicks')}>
              {presets.map((amount) => (
                <button
                  key={amount}
                  type='button'
                  className='predict-preset'
                  aria-pressed={stakeSats === BigInt(amount)}
                  data-testid={`predict-preset-${amount}`}
                  onClick={() => {
                    hapticSubtle()
                    setStakeSats(BigInt(amount))
                    setStakeOpen(false)
                  }}
                >
                  {prettyNumber(amount)}
                </button>
              ))}
              <p className='predict-presets__hint'>
                {t('predict.stakeRange', {
                  min: prettyNumber(Number(stakeMin)),
                  max: prettyNumber(Number(stakeMax)),
                })}
              </p>
            </div>
          }
        />
      </div>
    )
  }

  const positionsButton = (
    <span className='predict-positions-icon'>
      <Glyph name='lines' size={22} strokeWidth={2} />
      {activeCount > 0 ? <span className='predict-positions-icon__count'>{activeCount}</span> : null}
    </span>
  )

  return (
    <>
      <Header
        text={t('predict.title')}
        back
        auxIcon={positionsButton}
        auxAriaLabel={t('predict.positionsAria', { count: activeCount })}
        auxFunc={() => {
          hapticLight()
          setView({ name: 'positions' })
        }}
      />
      <Content>
        <Padded>
          <div className='predict-wrap'>
            <div className='predict-layout'>
              <section className='predict-market' aria-label={t('predict.marketLabel')}>
                <div className='flex items-end justify-between gap-4'>
                  <p className='predict-price' data-testid='predict-spot-price'>
                    {market ? <Figure value={usdFromCents(market.priceCents)} /> : '—'}
                  </p>
                  <p className='predict-countdown'>
                    <span data-testid='predict-countdown'>
                      {selectedExpiry ? formatCountdown(secondsToClose) : '–:––'}
                    </span>
                    <span className='predict-countdown__label'>{t('predict.toClose')}</span>
                  </p>
                </div>
                <p className='predict-status' aria-live='polite'>
                  {gapCents != null && gapCents !== 0 && lineOfficial ? (
                    <Glyph name={gapCents > 0 ? 'arrowUp' : 'arrowDown'} size={14} strokeWidth={2.25} />
                  ) : null}
                  {status}
                </p>
                <PredictChart
                  samples={market?.samples ?? []}
                  lineCents={lineCents}
                  expiry={selectedExpiry}
                  kind={kind}
                  nowSec={nowSec}
                />
              </section>

              <section className='predict-ticket' aria-labelledby='predict-ticket-title'>
                <h2 id='predict-ticket-title' className='home-section-label mb-2'>
                  {t('predict.makePrediction')}
                </h2>
                <div className='predict-calls' role='radiogroup' aria-labelledby='predict-ticket-title'>
                  {([2, 3] as const).map((side) => {
                    const on = kind === side
                    return (
                      <button
                        key={side}
                        type='button'
                        role='radio'
                        aria-checked={on}
                        className='predict-call'
                        data-testid={side === 2 ? 'predict-call-higher' : 'predict-call-lower'}
                        onClick={() => {
                          hapticLight()
                          setKind(side)
                        }}
                      >
                        <Glyph name={side === 2 ? 'trendUp' : 'trendDown'} size={18} strokeWidth={2} />
                        {side === 2 ? t('predict.higher') : t('predict.lower')}
                        <span className='predict-call__mult'>
                          {formatMultiplier(side === 2 ? higherMultiplier : lowerMultiplier)}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className='predict-fields'>
                  <div className='predict-field'>
                    <span className='predict-field__label'>{t('predict.priceToBeat')}</span>
                    <span className='predict-field__value' data-testid='predict-line-price'>
                      {lineCents && lineOfficial
                        ? usdFromCents(lineCents)
                        : t('predict.lineSetsAtShort', { time: formatClockTime(opensAt) })}
                    </span>
                  </div>
                  <button
                    type='button'
                    className='predict-field'
                    onClick={() => {
                      hapticLight()
                      setCloseOpen(true)
                    }}
                    data-testid='predict-close-field'
                  >
                    <span className='predict-field__label'>{t('predict.closes')}</span>
                    <span className='predict-field__value'>
                      {selectedExpiry ? formatClockTime(selectedExpiry) : '—'}
                      <Glyph name='chevronRight' size={18} strokeWidth={2} />
                    </span>
                  </button>
                  <button
                    type='button'
                    className='predict-field'
                    onClick={() => {
                      hapticLight()
                      setStakeOpen(true)
                    }}
                    data-testid='predict-stake-field'
                  >
                    <span className='predict-field__label'>{t('predict.stake')}</span>
                    <span className='predict-field__value'>
                      <span data-testid='predict-stake-value'>{formatSats(stakeSats)}</span>
                      <Glyph name='chevronRight' size={18} strokeWidth={2} />
                    </span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </Padded>
      </Content>

      <ButtonsOnBottom>
        {stakeError ? (
          <p className='predict-estimate predict-estimate--error' role='alert'>
            {stakeError}
          </p>
        ) : estimate != null ? (
          <p className='predict-estimate' data-testid='predict-est-payout'>
            {t('predict.estimate', { amount: formatSats(estimate), multiplier: formatMultiplier(multiplier) })}
          </p>
        ) : null}
        <Button
          onClick={() => {
            hapticLight()
            setReviewOpen(true)
          }}
          label={t('predict.reviewPrediction')}
          disabled={!canReview}
          testId='predict-review-btn'
        />
      </ButtonsOnBottom>

      <SheetModal isOpen={closeOpen} onClose={() => setCloseOpen(false)} labelledBy='predict-close-title'>
        <h2 id='predict-close-title' className='predict-sheet-title'>
          {t('predict.closeTitle')}
        </h2>
        <div role='radiogroup' aria-labelledby='predict-close-title' className='mt-2'>
          {windows.map((expiry) => (
            <button
              key={expiry}
              type='button'
              role='radio'
              aria-checked={expiry === selectedExpiry}
              className='predict-field'
              onClick={() => {
                hapticSubtle()
                setSelectedExpiry(expiry)
                setCloseOpen(false)
              }}
            >
              <span className='predict-field__value'>{formatClockTime(expiry)}</span>
              <span className='predict-field__label'>
                {t('predict.closesInShort', { time: formatCountdown(expiry - nowSec) })}
                {expiry === selectedExpiry ? <Glyph name='check' size={18} strokeWidth={2.25} /> : null}
              </span>
            </button>
          ))}
        </div>
      </SheetModal>

      <ReviewSheet
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        kind={kind}
        lineCents={lineCents}
        expiry={selectedExpiry}
        stakeSats={stakeSats}
        demoMode={config.demoMode}
        nowSec={nowSec}
        requestQuote={requestQuote}
        fundQuote={fundQuote}
        onPlaced={(pos) => {
          setReviewOpen(false)
          setView({ name: 'position', id: pos.id })
        }}
      />

      <IntroSheet isOpen={introOpen} onClose={() => setIntroOpen(false)} />
    </>
  )
}
