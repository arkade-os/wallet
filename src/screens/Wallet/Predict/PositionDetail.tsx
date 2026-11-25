import { useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Glyph from '../../../icons/Glyph'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import { PREDICT_VOID_AFTER } from '../../../lib/predict/constants'
import type { PredictMarketSnapshot } from '../../../lib/predict/marketFeed'
import { formatCountdown, usdFromCents } from '../../../lib/predict/pricing'
import type { PredictPosition } from '../../../lib/predict/storage'
import { useTranslation } from '../../../providers/language'
import PredictChart from './PredictChart'
import { formatClockTime, formatGap, formatSats, netPayout } from './format'

interface PositionDetailProps {
  position: PredictPosition
  market: PredictMarketSnapshot | null
  nowSec: number
  onBack: () => void
  onCancel: (pos: PredictPosition) => Promise<PredictPosition>
  onRefundVoid: (pos: PredictPosition) => Promise<{ position: PredictPosition; result: string }>
}

function shortId(id?: string): string {
  if (!id) return ''
  return id.length > 16 ? `${id.slice(0, 6)}…${id.slice(-6)}` : id
}

export default function PositionDetail({
  position,
  market,
  nowSec,
  onBack,
  onCancel,
  onRefundVoid,
}: PositionDetailProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const line = usdFromCents(BigInt(position.strikeCents))
  const left = position.expiry - nowSec
  const live = position.phase === 'filled' && left > 0
  const settling = position.phase === 'filled' && left <= 0
  const waiting = position.phase === 'open' || position.phase === 'funded'
  const won = position.phase === 'settled' && BigInt(position.userPayoutSats ?? '0') > 0n
  const voidAfter = position.voidAfter || Number(PREDICT_VOID_AFTER)
  const canCancel = position.phase === 'expired' && position.refundable
  const canVoid = position.phase === 'filled' && nowSec >= position.expiry + voidAfter
  const priceCents = market?.priceCents ?? null
  const above = priceCents != null && priceCents >= Number(position.strikeCents)
  const winning =
    priceCents != null &&
    (position.kind === 2 ? priceCents > Number(position.strikeCents) : priceCents < Number(position.strikeCents))

  const run = async (fn: () => Promise<string>) => {
    hapticLight()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      setNotice(await fn())
      hapticSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('predict.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  const hero = live
    ? formatCountdown(left)
    : settling
      ? t('predict.settling')
      : position.phase === 'settled'
        ? won
          ? `+${formatSats(position.userPayoutSats ?? '0')}`
          : t('predict.statusLost')
        : position.phase === 'refunded'
          ? t('predict.statusRefunded')
          : waiting
            ? t('predict.waitingDesk')
            : t('predict.notFilled')

  return (
    <>
      <Header text={t('predict.prediction')} back={onBack} />
      <Content>
        <Padded>
          <div className='flex items-center gap-3'>
            <span className='predict-well predict-well--tint'>
              <Glyph name={position.kind === 2 ? 'trendUp' : 'trendDown'} size={20} strokeWidth={2} />
            </span>
            <div className='min-w-0'>
              <h2 className='predict-card__title'>
                {t(position.kind === 2 ? 'predict.callHigherShort' : 'predict.callLowerShort', { line })}
              </h2>
              <p className='predict-note'>
                {t('predict.detailSub', {
                  time: formatClockTime(position.expiry),
                  stake: formatSats(position.stakeSats),
                })}
              </p>
            </div>
            {position.mode === 'demo' ? <span className='predict-tag ml-auto'>{t('predict.demoBadge')}</span> : null}
          </div>

          <div className='mt-6 flex items-end justify-between gap-4'>
            <div>
              <p
                className={
                  live ? 'predict-countdown predict-countdown--hero' : won ? 'predict-price' : 'predict-summary'
                }
                data-testid='predict-detail-hero'
              >
                {hero}
              </p>
              {live ? (
                <p className='predict-note predict-note--tight'>
                  {t('predict.leftUntil', { time: formatClockTime(position.expiry) })}
                </p>
              ) : null}
            </div>
            {live ? <span className='predict-tag predict-tag--won'>{t('predict.live')}</span> : null}
          </div>

          {live && priceCents != null ? (
            <p className='predict-bubble'>
              {t(above ? 'predict.bubbleAbove' : 'predict.bubbleBelow', {
                price: usdFromCents(priceCents),
                gap: formatGap(priceCents - Number(position.strikeCents)),
              })}{' '}
              <strong>{winning ? t('predict.winning') : t('predict.losing')}</strong>
            </p>
          ) : null}

          {live || settling ? (
            <div className='mt-4'>
              <PredictChart
                samples={market?.samples ?? []}
                lineCents={Number(position.strikeCents)}
                expiry={position.expiry}
                kind={position.kind}
                nowSec={nowSec}
              />
            </div>
          ) : null}

          <div className='predict-rows mt-2'>
            {position.settleCents ? (
              <div className='predict-field'>
                <span className='predict-field__label'>{t('predict.closingPrice')}</span>
                <span className='predict-field__value'>{usdFromCents(BigInt(position.settleCents))}</span>
              </div>
            ) : null}
            <div className='predict-field'>
              <span className='predict-field__label'>{t('predict.priceToBeat')}</span>
              <span className='predict-field__value'>{line}</span>
            </div>
            <div className='predict-field'>
              <span className='predict-field__label'>{t('predict.yourStake')}</span>
              <span className='predict-field__value'>{formatSats(position.stakeSats)}</span>
            </div>
            <div className='predict-field'>
              <span className='predict-field__label'>{t('predict.ifYoureRight')}</span>
              <span className='predict-field__value'>{formatSats(netPayout(position.payoutSats))}</span>
            </div>
            {position.fundingTxid ? (
              <div className='predict-field'>
                <span className='predict-field__label'>{t('predict.funding')}</span>
                <span className='predict-field__value font-mono'>{shortId(position.fundingTxid)}</span>
              </div>
            ) : null}
            {position.settleTxid ? (
              <div className='predict-field'>
                <span className='predict-field__label'>{t('predict.settlement')}</span>
                <span className='predict-field__value font-mono'>{shortId(position.settleTxid)}</span>
              </div>
            ) : null}
          </div>

          <ErrorMessage error={Boolean(error)} text={error} />
          {notice ? <p className='predict-note predict-note--after'>{notice}</p> : null}
          {live || settling ? (
            <p className='predict-note predict-note--after text-center'>{t('predict.settlesOnItsOwn')}</p>
          ) : null}
          {canVoid ? <p className='predict-note predict-note--after'>{t('predict.voidNote')}</p> : null}
        </Padded>
      </Content>

      {canCancel || canVoid ? (
        <ButtonsOnBottom>
          {canCancel ? (
            <Button
              onClick={() =>
                void run(async () => {
                  await onCancel(position)
                  return t('predict.refundSent')
                })
              }
              label={busy ? t('common.loading') : t('predict.takeBack')}
              disabled={busy}
              testId='predict-cancel-refund-btn'
            />
          ) : (
            <Button
              onClick={() =>
                void run(async () => {
                  const res = await onRefundVoid(position)
                  return res.result === 'refunded' ? t('predict.refundSent') : t('predict.voidRefundNotReady')
                })
              }
              label={busy ? t('common.loading') : t('predict.claimRefund')}
              disabled={busy}
              testId='predict-void-refund-btn'
            />
          )}
        </ButtonsOnBottom>
      ) : null}
    </>
  )
}
