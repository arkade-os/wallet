import { useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import SheetModal from '../../../components/SheetModal'
import Text from '../../../components/Text'
import Glyph from '../../../icons/Glyph'
import { BEACON_READ_FEE, type PredictKind } from '../../../lib/predict/constants'
import type { PredictQuote } from '../../../lib/predict/engine'
import { formatCountdown, usdFromCents } from '../../../lib/predict/pricing'
import { prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import { useTranslation } from '../../../providers/language'
import type { PredictPosition } from '../../../lib/predict/storage'

interface ReviewSheetProps {
  isOpen: boolean
  onClose: () => void
  kind: PredictKind
  lineCents: number | null
  expiry: number
  stakeSats: bigint
  demoMode: boolean
  requestQuote: (kind: PredictKind, stakeSats: bigint) => Promise<{ quotes: PredictQuote[]; note: string }>
  fundQuote: (quote: PredictQuote) => Promise<PredictPosition>
  onPlaced: (position: PredictPosition) => void
}

function formatCloseTime(expirySec: number): string {
  return new Date(expirySec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ReviewSheet({
  isOpen,
  onClose,
  kind,
  lineCents,
  expiry,
  stakeSats,
  demoMode,
  requestQuote,
  fundQuote,
  onPlaced,
}: ReviewSheetProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [funding, setFunding] = useState(false)
  const [quote, setQuote] = useState<PredictQuote | null>(null)
  const [error, setError] = useState('')
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))

  const fetchQuote = async () => {
    setLoading(true)
    setError('')
    setQuote(null)
    try {
      const res = await requestQuote(kind, stakeSats)
      if (res.quotes.length > 0) {
        setQuote(res.quotes[0]!)
      } else {
        setError(
          res.note === 'no_answer'
            ? t('predict.deskNoAnswer')
            : t('predict.deskRefused', { reason: res.note || t('common.unknown') }),
        )
      }
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
      return
    }
    void fetchQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, kind, expiry, stakeSats])

  useEffect(() => {
    if (!isOpen) return
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1_000)
    return () => clearInterval(id)
  }, [isOpen])

  const ttlLeft = quote ? Math.max(0, quote.validUntil - nowSec) : 0
  const quoteExpired = Boolean(quote && ttlLeft <= 0)
  const netWinSats = quote ? (quote.payoutSats > BEACON_READ_FEE ? quote.payoutSats - BEACON_READ_FEE : 0n) : 0n

  const handleConfirm = async () => {
    if (!quote || quoteExpired || funding) return
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

  const directionLabel = kind === 2 ? t('predict.higher') : t('predict.lower')

  return (
    <SheetModal isOpen={isOpen} onClose={onClose} labelledBy='predict-review-title'>
      <FlexCol gap='1rem'>
        <div className='predict-sheet-head'>
          <div className='predict-sheet-title-row'>
            <span
              className={
                kind === 2 ? 'predict-dir-badge predict-dir-badge--up' : 'predict-dir-badge predict-dir-badge--down'
              }
            >
              <Glyph name={kind === 2 ? 'trendUp' : 'trendDown'} size={15} strokeWidth={2.2} />
              {directionLabel}
            </span>
            {demoMode ? <span className='predict-mode-pill'>{t('predict.demoBadge')}</span> : null}
          </div>
          <h2 id='predict-review-title' className='predict-sheet-title'>
            {t('predict.reviewTitle')}
          </h2>
          {lineCents ? (
            <p className='predict-sheet-sub'>
              {t('predict.reviewSummaryLine', {
                direction: directionLabel.toLowerCase(),
                line: usdFromCents(lineCents),
                close: formatCloseTime(expiry),
              })}
            </p>
          ) : null}
        </div>

        <ErrorMessage error={Boolean(error)} text={error} />

        {loading ? (
          <div className='predict-quote-loading' data-testid='predict-quote-loading'>
            <Text color='neutral-500' small>
              {t('predict.fetchingQuote')}
            </Text>
          </div>
        ) : quote ? (
          <div className='predict-rows' data-testid='predict-quote-rows'>
            <div className='predict-row'>
              <span className='predict-row__label'>{t('predict.desk')}</span>
              <span className='predict-row__value'>{quote.deskName}</span>
            </div>
            <div className='predict-row'>
              <span className='predict-row__label'>{t('predict.stake')}</span>
              <span className='predict-row__value'>{prettyNumber(Number(quote.stakeSats))} sats</span>
            </div>
            <div className='predict-row'>
              <span className='predict-row__label'>{t('predict.multiplier')}</span>
              <span className='predict-row__value'>{quote.multiplier.toFixed(2)}×</span>
            </div>
            <div className='predict-row'>
              <span className='predict-row__label'>{t('predict.readFee')}</span>
              <span className='predict-row__value'>−{prettyNumber(Number(BEACON_READ_FEE))} sats</span>
            </div>
            <div className='predict-row predict-row--strong'>
              <span className='predict-row__label'>{t('predict.payoutIfRight')}</span>
              <span className='predict-row__value predict-row__value--win'>
                {prettyNumber(Number(netWinSats))} sats
              </span>
            </div>
            <div className='predict-row'>
              <span className='predict-row__label'>{t('predict.payoutIfWrong')}</span>
              <span className='predict-row__value'>0 sats</span>
            </div>
          </div>
        ) : null}

        {quote ? (
          <p className='predict-ttl' data-testid='predict-quote-ttl'>
            {quoteExpired ? t('predict.quoteExpired') : t('predict.quoteValidFor', { time: formatCountdown(ttlLeft) })}
          </p>
        ) : null}

        <FlexCol gap='0.5rem'>
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
              disabled={funding}
              data-testid='predict-confirm-btn'
            />
          ) : (
            <Button
              onClick={() => void fetchQuote()}
              label={loading ? t('predict.fetchingQuote') : t('predict.refreshQuote')}
              disabled={loading}
              data-testid='predict-refresh-quote-btn'
            />
          )}
          <Button onClick={onClose} label={t('common.cancel')} secondary disabled={funding} />
        </FlexCol>
      </FlexCol>
    </SheetModal>
  )
}
