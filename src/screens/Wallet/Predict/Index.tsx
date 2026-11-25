import { Liveline } from 'liveline'
import { useContext, useMemo, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import { PrivacyAmount } from '../../../components/PrivacyAmount'
import SegmentedControl from '../../../components/SegmentedControl'
import Glyph from '../../../icons/Glyph'
import { usePredict } from '../../../hooks/usePredict'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSubtle } from '../../../lib/haptics'
import { BEACON_READ_FEE, type PredictKind } from '../../../lib/predict/constants'
import { formatCountdown, predictPayout, usdFromCents } from '../../../lib/predict/pricing'
import type { PredictPosition } from '../../../lib/predict/storage'
import { Themes } from '../../../lib/types'
import { ConfigContext } from '../../../providers/config'
import { useTranslation } from '../../../providers/language'
import { WalletContext } from '../../../providers/wallet'
import PositionDetailSheet from './PositionDetailSheet'
import PositionsList from './PositionsList'
import ReviewSheet from './ReviewSheet'

const MAINNET_PRESETS = [10_000, 25_000, 50_000, 100_000]
const TESTNET_PRESETS = [10_000, 50_000, 100_000, 250_000]

function formatWindowTime(expirySec: number): string {
  return new Date(expirySec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Predict() {
  const { effectiveTheme } = useContext(ConfigContext)
  const { availableBalance } = useContext(WalletContext)
  const { t } = useTranslation()
  const prefersReduced = useReducedMotion()

  const {
    config,
    market,
    chartPoints,
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
    settlePosition,
    refundVoidPosition,
    reboardPosition,
  } = usePredict()

  const [tab, setTab] = useState<'trade' | 'positions'>('trade')
  const [kind, setKind] = useState<PredictKind>(2)
  const [stakeInput, setStakeInput] = useState('10000')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<PredictPosition | null>(null)

  const presets = config.profile.isMainnet ? MAINNET_PRESETS : TESTNET_PRESETS
  const stakeNum = Number.parseInt(stakeInput.replace(/[^0-9]/g, ''), 10) || 0
  const stakeSats = BigInt(Math.max(0, stakeNum))

  const stakeMin = config.profile.stakeMin
  const stakeMax = config.profile.stakeMax
  const insufficientBalance = !config.demoMode && stakeSats > BigInt(availableBalance)
  const belowMin = stakeSats < stakeMin
  const aboveMax = stakeSats > stakeMax

  const activeMultiplier = kind === 2 ? higherMultiplier : lowerMultiplier
  const estGrossPayout = useMemo(
    () => (activeMultiplier && stakeSats > 0n ? predictPayout(stakeSats, activeMultiplier) : null),
    [activeMultiplier, stakeSats],
  )
  const estNetPayout = estGrossPayout && estGrossPayout > BEACON_READ_FEE ? estGrossPayout - BEACON_READ_FEE : null

  const canReview = Boolean(
    lineCents && selectedExpiry && !belowMin && !aboveMax && !insufficientBalance && activeMultiplier != null,
  )

  const stakeError = belowMin
    ? t('predict.stakeBelowMin', { min: prettyNumber(Number(stakeMin)) })
    : aboveMax
      ? t('predict.stakeAboveMax', { max: prettyNumber(Number(stakeMax)) })
      : insufficientBalance
        ? t('send.insufficientFunds')
        : ''

  const chartColor = kind === 2 ? '#16a34a' : '#dc2626'

  return (
    <div className='predict-screen'>
      <Header
        text={t('predict.title')}
        back
        auxText={config.demoMode ? t('predict.demoBadge') : undefined}
        auxFunc={config.demoMode ? () => {} : undefined}
      />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <SegmentedControl
              options={['trade', 'positions']}
              selected={tab}
              onChange={(val) => {
                hapticSubtle()
                setTab(val as 'trade' | 'positions')
              }}
              getLabel={(val) =>
                val === 'trade'
                  ? t('predict.tabTrade')
                  : activeCount > 0
                    ? `${t('predict.tabPositions')} (${activeCount})`
                    : t('predict.tabPositions')
              }
            />

            {tab === 'trade' ? (
              <FlexCol gap='1rem'>
                {/* Live Market + Window Line Card */}
                <section className='predict-card' aria-label={t('predict.marketCard')}>
                  <div className='predict-market-head'>
                    <div>
                      <p className='predict-eyebrow'>BTC/USD · {market?.source === 'dia' ? 'DIA' : 'Deribit'}</p>
                      <p className='predict-spot' data-testid='predict-spot-price'>
                        {market ? usdFromCents(market.priceCents) : '—'}
                      </p>
                      {lineCents ? (
                        <p className='predict-line-tag' data-testid='predict-line-price'>
                          {lineOfficial ? t('predict.windowLine') : t('predict.indicativeLine')}{' '}
                          <strong>{usdFromCents(lineCents)}</strong>
                        </p>
                      ) : null}
                    </div>
                    <div className='predict-clock'>
                      <p className='predict-eyebrow'>{t('predict.closesIn')}</p>
                      <p className='predict-countdown' data-testid='predict-countdown'>
                        {selectedExpiry ? formatCountdown(secondsToClose) : '–:––'}
                      </p>
                    </div>
                  </div>

                  <div className='predict-chart' data-testid='predict-chart'>
                    {chartPoints.length >= 2 ? (
                      <Liveline
                        data={chartPoints}
                        value={chartPoints[chartPoints.length - 1]!.value}
                        color={chartColor}
                        theme={effectiveTheme === Themes.Dark ? 'dark' : 'light'}
                        grid={false}
                        badge={false}
                        fill
                        pulse={!prefersReduced}
                        scrub={false}
                        window={300}
                        referenceLine={
                          lineCents
                            ? {
                                value: lineCents / 100,
                                label: usdFromCents(lineCents),
                              }
                            : undefined
                        }
                        formatValue={(v) =>
                          `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        }
                      />
                    ) : (
                      <div className='predict-chart-placeholder'>
                        <span>{t('predict.loadingChart')}</span>
                      </div>
                    )}
                  </div>

                  {/* Window Selector Pills */}
                  {windows.length > 0 ? (
                    <div className='predict-windows' role='radiogroup' aria-label={t('predict.closeWindow')}>
                      {windows.map((exp) => {
                        const selected = exp === selectedExpiry
                        return (
                          <button
                            key={exp}
                            type='button'
                            role='radio'
                            aria-checked={selected}
                            className={
                              selected ? 'predict-pill predict-pill--active focusable' : 'predict-pill focusable'
                            }
                            onClick={() => {
                              hapticSubtle()
                              setSelectedExpiry(exp)
                            }}
                          >
                            {formatWindowTime(exp)}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </section>

                {/* Higher / Lower Call Cards */}
                <div className='predict-calls' role='radiogroup' aria-label={t('predict.yourCall')}>
                  <button
                    type='button'
                    role='radio'
                    aria-checked={kind === 2}
                    className={
                      kind === 2
                        ? 'predict-call predict-call--up predict-call--selected focusable'
                        : 'predict-call predict-call--up focusable'
                    }
                    data-testid='predict-call-higher'
                    onClick={() => {
                      hapticLight()
                      setKind(2)
                    }}
                  >
                    <span className='predict-call__top'>
                      <Glyph name='trendUp' size={18} strokeWidth={2.1} />
                      <span>{t('predict.higher')}</span>
                    </span>
                    <span className='predict-call__mult'>
                      {higherMultiplier != null ? `${higherMultiplier.toFixed(2)}×` : '—'}
                    </span>
                  </button>
                  <button
                    type='button'
                    role='radio'
                    aria-checked={kind === 3}
                    className={
                      kind === 3
                        ? 'predict-call predict-call--down predict-call--selected focusable'
                        : 'predict-call predict-call--down focusable'
                    }
                    data-testid='predict-call-lower'
                    onClick={() => {
                      hapticLight()
                      setKind(3)
                    }}
                  >
                    <span className='predict-call__top'>
                      <Glyph name='trendDown' size={18} strokeWidth={2.1} />
                      <span>{t('predict.lower')}</span>
                    </span>
                    <span className='predict-call__mult'>
                      {lowerMultiplier != null ? `${lowerMultiplier.toFixed(2)}×` : '—'}
                    </span>
                  </button>
                </div>

                {/* Stake Picker */}
                <section className='predict-card predict-stake-card'>
                  <div className='predict-stake-head'>
                    <label htmlFor='predict-stake-input' className='predict-eyebrow'>
                      {t('predict.stake')}
                    </label>
                    <span className='predict-balance'>
                      {t('send.available', { amount: '' }).trim()}{' '}
                      <PrivacyAmount masked='•••••'>{prettyNumber(availableBalance)} sats</PrivacyAmount>
                    </span>
                  </div>

                  <div className='predict-stake-input-row'>
                    <input
                      id='predict-stake-input'
                      type='text'
                      inputMode='numeric'
                      pattern='[0-9]*'
                      className='predict-stake-input'
                      data-testid='predict-stake-input'
                      value={stakeInput}
                      onChange={(e) => setStakeInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={String(stakeMin)}
                    />
                    <span className='predict-stake-unit'>sats</span>
                  </div>

                  <div className='predict-presets'>
                    {presets.map((amt) => {
                      const active = stakeNum === amt
                      return (
                        <button
                          key={amt}
                          type='button'
                          className={active ? 'predict-pill predict-pill--active focusable' : 'predict-pill focusable'}
                          data-testid={`predict-preset-${amt}`}
                          onClick={() => {
                            hapticSubtle()
                            setStakeInput(String(amt))
                          }}
                        >
                          {amt >= 1_000 ? `${amt / 1_000}k` : String(amt)}
                        </button>
                      )
                    })}
                  </div>

                  {stakeError ? (
                    <p className='predict-stake-error' role='alert'>
                      {stakeError}
                    </p>
                  ) : estNetPayout != null ? (
                    <p className='predict-est-payout' data-testid='predict-est-payout'>
                      {t('predict.estPayout', { amount: `${prettyNumber(Number(estNetPayout))} sats` })}
                    </p>
                  ) : null}
                </section>
              </FlexCol>
            ) : (
              <PositionsList positions={positions} onSelect={(pos) => setSelectedPosition(pos)} />
            )}
          </FlexCol>
        </Padded>
      </Content>

      {tab === 'trade' ? (
        <ButtonsOnBottom>
          <Button
            onClick={() => {
              hapticLight()
              setReviewOpen(true)
            }}
            label={t('predict.reviewPrediction')}
            disabled={!canReview}
            data-testid='predict-review-btn'
          />
        </ButtonsOnBottom>
      ) : null}

      <ReviewSheet
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        kind={kind}
        lineCents={lineCents}
        expiry={selectedExpiry}
        stakeSats={stakeSats}
        demoMode={config.demoMode}
        requestQuote={requestQuote}
        fundQuote={fundQuote}
        onPlaced={(pos) => {
          setReviewOpen(false)
          setTab('positions')
          setSelectedPosition(pos)
        }}
      />

      <PositionDetailSheet
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
        onCancel={cancelPosition}
        onSettle={settlePosition}
        onRefundVoid={refundVoidPosition}
        onReboard={reboardPosition}
        onUpdated={(next) => setSelectedPosition(next)}
      />
    </div>
  )
}
