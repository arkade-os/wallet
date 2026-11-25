import Content from '../../../components/Content'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Glyph from '../../../icons/Glyph'
import { hapticLight } from '../../../lib/haptics'
import { prettyNumber } from '../../../lib/format'
import { formatCountdown, usdFromCents } from '../../../lib/predict/pricing'
import { isActivePosition, type PredictPosition } from '../../../lib/predict/storage'
import { useTranslation } from '../../../providers/language'
import { formatClockTime, formatGap, formatSats, netPayout } from './format'

interface PositionsListProps {
  positions: PredictPosition[]
  priceCents: number | null
  nowSec: number
  onBack: () => void
  onSelect: (position: PredictPosition) => void
}

type Translate = (key: string, vars?: Record<string, string | number>) => string

export function callTitle(pos: PredictPosition, t: Translate): string {
  return t(pos.kind === 2 ? 'predict.rowAbove' : 'predict.rowBelow', {
    line: usdFromCents(BigInt(pos.strikeCents)),
    time: formatClockTime(pos.expiry),
  })
}

/** Where the price sits against this position's line, and who that favours. */
export function standing(pos: PredictPosition, priceCents: number | null, t: Translate): string {
  if (priceCents == null) return ''
  const gap = priceCents - Number(pos.strikeCents)
  const winning = pos.kind === 2 ? gap > 0 : gap < 0
  const vars = { gap: formatGap(gap) }
  if (gap >= 0) return winning ? t('predict.aboveWinning', vars) : t('predict.aboveLosing', vars)
  return winning ? t('predict.belowWinning', vars) : t('predict.belowLosing', vars)
}

function outcome(pos: PredictPosition, t: Translate) {
  if (pos.phase === 'settled') {
    const got = BigInt(pos.userPayoutSats ?? '0')
    return got > 0n
      ? { tag: t('predict.statusWon'), tone: 'won', amount: `+${formatSats(got)}` }
      : { tag: t('predict.statusLost'), tone: 'lost', amount: `−${formatSats(pos.stakeSats)}` }
  }
  if (pos.phase === 'refunded') {
    return {
      tag: t('predict.statusRefunded'),
      tone: 'plain',
      amount: t('predict.stakeBack', { amount: formatSats(pos.stakeSats) }),
    }
  }
  if (pos.refundable) {
    return { tag: t('predict.statusRefundable'), tone: 'won', amount: formatSats(pos.stakeSats) }
  }
  return { tag: t('predict.statusExpired'), tone: 'plain', amount: formatSats(pos.stakeSats) }
}

export default function PositionsList({ positions, priceCents, nowSec, onBack, onSelect }: PositionsListProps) {
  const { t } = useTranslation()
  const live = positions.filter(isActivePosition)
  const earlier = positions.filter((p) => !isActivePosition(p))
  const staked = live.reduce((sum, p) => sum + BigInt(p.stakeSats), 0n)

  const open = (pos: PredictPosition) => {
    hapticLight()
    onSelect(pos)
  }

  return (
    <>
      <Header text={t('predict.positions')} back={onBack} />
      <Content>
        <Padded>
          {positions.length === 0 ? (
            <div className='predict-empty' data-testid='predict-positions-empty'>
              <p className='predict-empty__title'>{t('predict.noPositionsTitle')}</p>
              <p className='predict-note'>{t('predict.noPositionsCopy')}</p>
            </div>
          ) : (
            <div data-testid='predict-positions-list'>
              {live.length > 0 ? (
                <>
                  <h2 className='predict-summary'>
                    {live.length === 1 ? t('predict.inPlayOne') : t('predict.inPlay', { count: live.length })}
                  </h2>
                  <p className='predict-note'>
                    {priceCents != null
                      ? t('predict.inPlaySub', {
                          amount: formatSats(staked),
                          price: `$${prettyNumber(Math.round(priceCents / 100), 0)}`,
                        })
                      : formatSats(staked)}
                  </p>
                  <div className='mt-1'>
                    {live.map((pos) => {
                      const filled = pos.phase === 'filled'
                      const left = pos.expiry - nowSec
                      const elapsed = Math.min(1, Math.max(0, 1 - left / 300))
                      return (
                        <button
                          key={pos.id}
                          type='button'
                          className='predict-card'
                          onClick={() => open(pos)}
                          data-testid={`predict-pos-${pos.id}`}
                        >
                          <span className='flex items-start gap-3'>
                            <span className='predict-well predict-well--tint'>
                              <Glyph name={pos.kind === 2 ? 'trendUp' : 'trendDown'} size={20} strokeWidth={2} />
                            </span>
                            <span className='flex min-w-0 flex-1 flex-col gap-0.5 text-left'>
                              <span className='flex items-center justify-between gap-2'>
                                <span className='predict-card__title'>{callTitle(pos, t)}</span>
                                <span className='predict-tag'>
                                  {left > 0
                                    ? t('predict.leftTag', { time: formatCountdown(left) })
                                    : t('predict.settlingTag')}
                                </span>
                              </span>
                              <span className='predict-card__sub'>
                                {filled ? standing(pos, priceCents, t) : t('predict.waitingDesk')}
                              </span>
                            </span>
                          </span>
                          <span className='predict-progress' aria-hidden='true'>
                            <span style={{ width: `${(elapsed * 100).toFixed(1)}%` }} />
                          </span>
                          <span className='predict-card__foot'>
                            <span>{t('predict.stakeIn', { amount: prettyNumber(Number(pos.stakeSats)) })}</span>
                            <span>
                              {t('predict.ifRight', { amount: prettyNumber(Number(netPayout(pos.payoutSats))) })}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : null}

              {earlier.length > 0 ? (
                <>
                  <h2 className='home-section-label predict-earlier'>{t('predict.earlier')}</h2>
                  {earlier.map((pos) => {
                    const done = outcome(pos, t)
                    return (
                      <button
                        key={pos.id}
                        type='button'
                        className='activity-row activity-row--static predict-row'
                        onClick={() => open(pos)}
                        data-testid={`predict-pos-${pos.id}`}
                      >
                        <span className='activity-row__left'>
                          <span className='predict-well'>
                            <Glyph name={pos.kind === 2 ? 'trendUp' : 'trendDown'} size={20} strokeWidth={2} />
                          </span>
                          <span className='activity-row__copy text-left'>
                            <span className='activity-row__kind'>{callTitle(pos, t)}</span>
                            <span className='activity-row__meta'>
                              {pos.settleCents
                                ? t('predict.closedAt', { price: usdFromCents(BigInt(pos.settleCents)) })
                                : t('predict.notFilled')}
                            </span>
                          </span>
                        </span>
                        <span className='activity-row__right'>
                          <span className={`predict-tag predict-tag--${done.tone}`}>{done.tag}</span>
                          <span className='activity-row__meta'>{done.amount}</span>
                        </span>
                      </button>
                    )
                  })}
                </>
              ) : null}
            </div>
          )}
        </Padded>
      </Content>
    </>
  )
}
