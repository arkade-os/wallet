import { useState } from 'react'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import SheetModal from '../../../components/SheetModal'
import Text from '../../../components/Text'
import Glyph from '../../../icons/Glyph'
import { prettyNumber } from '../../../lib/format'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import { BEACON_READ_FEE, PREDICT_VOID_AFTER } from '../../../lib/predict/constants'
import { usdFromCents } from '../../../lib/predict/pricing'
import type { PredictPosition } from '../../../lib/predict/storage'
import { useTranslation } from '../../../providers/language'

interface PositionDetailSheetProps {
  position: PredictPosition | null
  onClose: () => void
  onCancel: (pos: PredictPosition) => Promise<PredictPosition>
  onSettle: (pos: PredictPosition) => Promise<{ position: PredictPosition; result: string }>
  onRefundVoid: (pos: PredictPosition) => Promise<{ position: PredictPosition; result: string }>
  onReboard: (pos: PredictPosition) => Promise<{ result: 'reboarded' | 'missing'; commitmentTxid?: string }>
  onUpdated: (pos: PredictPosition) => void
}

function shortId(id?: string): string {
  if (!id) return ''
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-8)}` : id
}

export default function PositionDetailSheet({
  position,
  onClose,
  onCancel,
  onSettle,
  onRefundVoid,
  onReboard,
  onUpdated,
}: PositionDetailSheetProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  if (!position) {
    return <SheetModal isOpen={false} onClose={onClose} />
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const canCancel = position.phase === 'expired' && position.refundable
  const canSettle = position.phase === 'filled' && nowSec >= position.expiry + 60
  const voidAfter = position.voidAfter || Number(PREDICT_VOID_AFTER)
  const canVoidRefund = position.phase === 'filled' && nowSec >= position.expiry + voidAfter
  const canReboard = position.phase === 'filled' && position.mode === 'live' && nowSec < position.expiry + voidAfter

  const payout = BigInt(position.payoutSats)
  const netPayout = payout > BEACON_READ_FEE ? payout - BEACON_READ_FEE : 0n
  const dirLabel = position.kind === 2 ? t('predict.higher') : t('predict.lower')

  const runAction = async (fn: () => Promise<void>) => {
    hapticLight()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('predict.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetModal isOpen={Boolean(position)} onClose={onClose} labelledBy='predict-detail-title'>
      <FlexCol gap='1rem'>
        <div className='predict-sheet-head'>
          <div className='predict-sheet-title-row'>
            <span
              className={
                position.kind === 2
                  ? 'predict-dir-badge predict-dir-badge--up'
                  : 'predict-dir-badge predict-dir-badge--down'
              }
            >
              <Glyph name={position.kind === 2 ? 'trendUp' : 'trendDown'} size={15} strokeWidth={2.2} />
              {dirLabel}
            </span>
            {position.mode === 'demo' ? <span className='predict-mode-pill'>{t('predict.demoBadge')}</span> : null}
          </div>
          <h2 id='predict-detail-title' className='predict-sheet-title'>
            {dirLabel} {usdFromCents(BigInt(position.strikeCents))}
          </h2>
          <p className='predict-sheet-sub'>
            {t('predict.closesAt', {
              time: new Date(position.expiry * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })}{' '}
            · {position.deskName}
          </p>
        </div>

        <ErrorMessage error={Boolean(error)} text={error} />
        {notice ? (
          <Text color='neutral-500' small>
            {notice}
          </Text>
        ) : null}

        <div className='predict-rows'>
          <div className='predict-row'>
            <span className='predict-row__label'>{t('predict.status')}</span>
            <span className='predict-row__value'>{position.phase}</span>
          </div>
          <div className='predict-row'>
            <span className='predict-row__label'>{t('predict.stake')}</span>
            <span className='predict-row__value'>{prettyNumber(Number(position.stakeSats))} sats</span>
          </div>
          <div className='predict-row'>
            <span className='predict-row__label'>{t('predict.multiplier')}</span>
            <span className='predict-row__value'>{position.multiplier.toFixed(2)}×</span>
          </div>
          <div className='predict-row'>
            <span className='predict-row__label'>{t('predict.payoutIfRight')}</span>
            <span className='predict-row__value'>{prettyNumber(Number(netPayout))} sats</span>
          </div>
          {position.settleCents ? (
            <div className='predict-row'>
              <span className='predict-row__label'>{t('predict.fixingPrice')}</span>
              <span className='predict-row__value'>{usdFromCents(BigInt(position.settleCents))}</span>
            </div>
          ) : null}
          {position.userPayoutSats != null ? (
            <div className='predict-row predict-row--strong'>
              <span className='predict-row__label'>{t('predict.youReceived')}</span>
              <span className='predict-row__value'>{prettyNumber(Number(position.userPayoutSats))} sats</span>
            </div>
          ) : null}
          {position.fundingTxid ? (
            <div className='predict-row'>
              <span className='predict-row__label'>{t('predict.fundingTx')}</span>
              <span className='predict-row__value predict-mono'>{shortId(position.fundingTxid)}</span>
            </div>
          ) : null}
          {position.settleTxid ? (
            <div className='predict-row'>
              <span className='predict-row__label'>{t('predict.settleTx')}</span>
              <span className='predict-row__value predict-mono'>{shortId(position.settleTxid)}</span>
            </div>
          ) : null}
        </div>

        <FlexCol gap='0.5rem'>
          {canCancel ? (
            <Button
              onClick={() =>
                void runAction(async () => {
                  const next = await onCancel(position)
                  hapticSuccess()
                  onUpdated(next)
                  setNotice(t('predict.refundSent'))
                })
              }
              label={busy ? t('common.loading') : t('predict.cancelAndRefund')}
              disabled={busy}
              data-testid='predict-cancel-refund-btn'
            />
          ) : null}

          {canSettle ? (
            <Button
              onClick={() =>
                void runAction(async () => {
                  const res = await onSettle(position)
                  if (res.result === 'settled') {
                    hapticSuccess()
                    onUpdated(res.position)
                    setNotice(t('predict.settledNotice'))
                  } else {
                    setNotice(t('predict.fixingNotReady'))
                  }
                })
              }
              label={busy ? t('common.loading') : t('predict.settleNow')}
              disabled={busy}
              data-testid='predict-settle-now-btn'
            />
          ) : null}

          {canVoidRefund ? (
            <Button
              onClick={() =>
                void runAction(async () => {
                  const res = await onRefundVoid(position)
                  if (res.result === 'refunded') {
                    hapticSuccess()
                    onUpdated(res.position)
                    setNotice(t('predict.refundSent'))
                  } else {
                    setNotice(t('predict.voidRefundNotReady'))
                  }
                })
              }
              label={busy ? t('common.loading') : t('predict.claimVoidRefund')}
              disabled={busy}
              secondary
              data-testid='predict-void-refund-btn'
            />
          ) : null}

          {canReboard ? (
            <Button
              onClick={() =>
                void runAction(async () => {
                  const res = await onReboard(position)
                  setNotice(res.result === 'reboarded' ? t('predict.reboardedNotice') : t('predict.reboardNotNeeded'))
                })
              }
              label={busy ? t('common.loading') : t('predict.reboardVault')}
              disabled={busy}
              secondary
            />
          ) : null}

          <Button onClick={onClose} label={t('common.close')} secondary disabled={busy} />
        </FlexCol>
      </FlexCol>
    </SheetModal>
  )
}
