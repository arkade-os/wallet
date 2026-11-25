import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import SheetModal from '../../../components/SheetModal'
import Glyph from '../../../icons/Glyph'
import { prettyFiatAmount, prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import { BEACON_READ_FEE, type PredictKind } from '../../../lib/predict/constants'
import type { PredictQuote } from '../../../lib/predict/engine'
import { formatCountdown, usdFromCents } from '../../../lib/predict/pricing'
import type { PredictPosition } from '../../../lib/predict/storage'
import { Currencies } from '../../../lib/types'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { useTranslation } from '../../../providers/language'
import { formatClockTime, formatMultiplier, formatSats, netPayout } from './format'

interface ReviewSheetProps {
  isOpen: boolean
  onClose: () => void
  kind: PredictKind
  lineCents: number | null
  expiry: number
  stakeSats: bigint
  demoMode: boolean
  nowSec: number
  requestQuote: (kind: PredictKind, stakeSats: bigint) => Promise<{ quotes: PredictQuote[]; note: string }>
  fundQuote: (quote: PredictQuote) => Promise<PredictPosition>
  onPlaced: (position: PredictPosition) => void
}

export default function ReviewSheet({
  isOpen,
  onClose,
  kind,
  lineCents,
  expiry,
  stakeSats,
  demoMode,
  nowSec,
  requestQuote,
  fundQuote,
  onPlaced,
}: ReviewSheetProps) {
  const { t } = useTranslation()
  const { config } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const [loading, setLoading] = useState(false)
  const [funding, setFunding] = useState(false)
  const [quote, setQuote] = useState<PredictQuote | null>(null)
  const [error, setError] = useState('')
  const [understood, setUnderstood] = useState(false)

  const fetchQuote = async () => {
    setLoading(true)
    setError('')
    setQuote(null)
    try {
      const res = await requestQuote(kind, stakeSats)
      if (res.quotes.length > 0) setQuote(res.quotes[0]!)
      else
        setError(
          res.note === 'no_answer'
            ? t('predict.deskNoAnswer')
            : t('predict.deskRefused', { reason: res.note || t('common.unknown') }),
        )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('predict.quoteFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setQuote(null)
      setError('')
      setFunding(false)
      setUnderstood(false)
      return
    }
    void fetchQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, kind, expiry, stakeSats])

  const ttlLeft = quote ? Math.max(0, quote.validUntil - nowSec) : 0
  const quoteExpired = Boolean(quote && ttlLeft <= 0)
  const winSats = quote ? netPayout(quote.payoutSats) : 0n
  const showFiat = config.currency !== Currencies.BTC && toFiat(100_000_000) > 0
  const line = lineCents ? usdFromCents(lineCents) : '—'
  const closeTime = formatClockTime(expiry)

  const handleConfirm = async () => {
    if (!quote || quoteExpired || funding || !understood) return
    hapticLight()
    setFunding(true)
    setError('')
    try {
      const pos = await fundQuote(quote)
      hapticSuccess()
      onPlaced(pos)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('predict.placeFailed'))
      setFunding(false)
    }
  }

  return (
    <SheetModal isOpen={isOpen} onClose={onClose} labelledBy='predict-review-title'>
      <div className='review'>
        <div className='review__who'>
          <span className='predict-well predict-well--lg'>
            <Glyph name={kind === 2 ? 'trendUp' : 'trendDown'} size={26} strokeWidth={2} />
          </span>
          <h2 id='predict-review-title' className='review__destination'>
            {t(kind === 2 ? 'predict.callHigher' : 'predict.callLower', { line, time: closeTime })}
          </h2>
          {demoMode ? <span className='predict-tag'>{t('predict.demoBadge')}</span> : null}
        </div>

        <section className='transaction-amount-summary' aria-label={t('predict.youGetIfRight')}>
          <span className='transaction-amount-summary__label'>{t('predict.youGetIfRight')}</span>
          <span className='transaction-amount-summary__value' data-testid='predict-quote-payout'>
            {quote ? formatSats(winSats) : loading ? '…' : '—'}
          </span>
          {quote ? (
            <span className='transaction-amount-summary__label'>
              {showFiat
                ? t('predict.aboutFiat', {
                    amount: prettyFiatAmount(toFiat(Number(winSats)), config.currency, { bitcoinUnit: config.unit }),
                    time: formatCountdown(expiry - nowSec),
                  })
                : t('predict.closesInShort', { time: formatCountdown(expiry - nowSec) })}
            </span>
          ) : null}
        </section>

        <ErrorMessage error={Boolean(error)} text={error} />

        {quote ? (
          <div className='predict-rows' data-testid='predict-quote-rows'>
            <div className='predict-field'>
              <span className='predict-field__label'>{t('predict.stake')}</span>
              <span className='predict-field__value'>{formatSats(quote.stakeSats)}</span>
            </div>
            <div className='predict-field'>
              <span className='predict-field__label'>{t('predict.pays')}</span>
              <span className='predict-field__value'>{formatMultiplier(quote.multiplier)}</span>
            </div>
            <div className='predict-field'>
              <span className='predict-field__label'>{t('predict.fee')}</span>
              <span className='predict-field__value'>{formatSats(BEACON_READ_FEE)}</span>
            </div>
            <div className='predict-field'>
              <span className='predict-field__label'>{t('predict.quoteHolds')}</span>
              <span className='predict-field__value' data-testid='predict-quote-ttl'>
                {quoteExpired ? t('predict.quoteExpired') : formatCountdown(ttlLeft)}
              </span>
            </div>
          </div>
        ) : loading ? (
          <p className='predict-note' data-testid='predict-quote-loading'>
            {t('predict.fetchingQuote')}
          </p>
        ) : null}

        {quote && !quoteExpired ? (
          <label className='predict-ack'>
            <input
              type='checkbox'
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              data-testid='predict-ack'
            />
            <span>
              {t(kind === 2 ? 'predict.ackHigher' : 'predict.ackLower', {
                line,
                time: closeTime,
                stake: `${prettyNumber(Number(quote.stakeSats))} sats`,
              })}
            </span>
          </label>
        ) : null}

        <div className='review__actions'>
          {quote && !quoteExpired ? (
            <Button
              onClick={handleConfirm}
              label={
                funding
                  ? t('predict.placing')
                  : demoMode
                    ? t('predict.placeDemoPrediction')
                    : t('predict.placePrediction')
              }
              disabled={funding || !understood}
              testId='predict-confirm-btn'
            />
          ) : (
            <Button
              onClick={() => void fetchQuote()}
              label={loading ? t('predict.fetchingQuote') : t('predict.refreshQuote')}
              disabled={loading}
              testId='predict-refresh-quote-btn'
            />
          )}
          <Button onClick={onClose} label={t('common.cancel')} clear disabled={funding} />
        </div>
      </div>
    </SheetModal>
  )
}
