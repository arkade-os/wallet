import Glyph from '../../../icons/Glyph'
import { prettyNumber } from '../../../lib/format'
import { BEACON_READ_FEE } from '../../../lib/predict/constants'
import { usdFromCents } from '../../../lib/predict/pricing'
import type { PredictPosition } from '../../../lib/predict/storage'
import { useTranslation } from '../../../providers/language'

interface PositionsListProps {
  positions: PredictPosition[]
  onSelect: (position: PredictPosition) => void
}

function statusMeta(
  pos: PredictPosition,
  t: (key: string) => string,
): { label: string; tone: 'neutral' | 'active' | 'win' | 'loss' | 'warn' } {
  if (pos.phase === 'settled') {
    const userGot = BigInt(pos.userPayoutSats ?? '0')
    if (userGot > 0n) return { label: t('predict.statusWon'), tone: 'win' }
    if (pos.userPayoutSats != null) return { label: t('predict.statusLost'), tone: 'loss' }
    return { label: t('predict.statusSettled'), tone: 'neutral' }
  }
  if (pos.phase === 'filled') return { label: t('predict.statusActive'), tone: 'active' }
  if (pos.phase === 'funded') return { label: t('predict.statusWaitingDesk'), tone: 'warn' }
  if (pos.phase === 'refunded') return { label: t('predict.statusRefunded'), tone: 'neutral' }
  if (pos.phase === 'expired' && pos.refundable) return { label: t('predict.statusRefundable'), tone: 'warn' }
  if (pos.phase === 'expired') return { label: t('predict.statusExpired'), tone: 'neutral' }
  return { label: t('predict.statusOpen'), tone: 'neutral' }
}

function formatClose(expirySec: number): string {
  return new Date(expirySec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function PositionsList({ positions, onSelect }: PositionsListProps) {
  const { t } = useTranslation()

  if (positions.length === 0) {
    return (
      <div className='predict-empty' data-testid='predict-positions-empty'>
        <p className='predict-empty__title'>{t('predict.noPositionsTitle')}</p>
        <p className='predict-empty__copy'>{t('predict.noPositionsCopy')}</p>
      </div>
    )
  }

  return (
    <div className='predict-positions' data-testid='predict-positions-list'>
      {positions.map((pos) => {
        const status = statusMeta(pos, t)
        const dirLabel = pos.kind === 2 ? t('predict.higher') : t('predict.lower')
        const payout = BigInt(pos.payoutSats)
        const netPayout = payout > BEACON_READ_FEE ? payout - BEACON_READ_FEE : 0n
        const wonAmount = pos.phase === 'settled' && pos.userPayoutSats != null ? BigInt(pos.userPayoutSats) : null

        return (
          <button
            key={pos.id}
            type='button'
            className='predict-pos-row focusable'
            onClick={() => onSelect(pos)}
            data-testid={`predict-pos-${pos.id}`}
          >
            <div className='predict-pos-row__left'>
              <span
                className={
                  pos.kind === 2 ? 'predict-pos-icon predict-pos-icon--up' : 'predict-pos-icon predict-pos-icon--down'
                }
              >
                <Glyph name={pos.kind === 2 ? 'trendUp' : 'trendDown'} size={16} strokeWidth={2.1} />
              </span>
              <div className='predict-pos-row__meta'>
                <div className='predict-pos-row__title'>
                  <span>
                    {dirLabel} {usdFromCents(BigInt(pos.strikeCents))}
                  </span>
                  {pos.mode === 'demo' ? <span className='predict-mode-pill'>{t('predict.demoBadge')}</span> : null}
                </div>
                <span className='predict-pos-row__sub'>
                  {t('predict.closesAt', { time: formatClose(pos.expiry) })} · {pos.multiplier.toFixed(2)}×
                </span>
              </div>
            </div>
            <div className='predict-pos-row__right'>
              <span className={`predict-status predict-status--${status.tone}`}>{status.label}</span>
              <span className='predict-pos-row__amount'>
                {wonAmount != null
                  ? `${prettyNumber(Number(wonAmount))} sats`
                  : `${prettyNumber(Number(pos.stakeSats))} → ${prettyNumber(Number(netPayout))} sats`}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
