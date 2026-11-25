import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import Glyph from '../../icons/Glyph'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { prettyFiatAmount, prettyNumber } from '../../lib/format'
import { hapticLight } from '../../lib/haptics'
import { BEACON_READ_FEE, getPredictConfig, type PredictKind } from '../../lib/predict/constants'
import { fetchPredictMarket, resolveWindowLineCents, type PredictMarketSnapshot } from '../../lib/predict/marketFeed'
import { formatCountdown, predictMultiplier, predictPayout, upcomingWindows } from '../../lib/predict/pricing'
import { Currencies } from '../../lib/types'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { NavigationContext, Pages } from '../../providers/navigation'
import { useTranslation } from '../../providers/language'

const ROTATE_MS = 3_500
const POLL_MS = 15_000
const SAMPLE_SATS = 100_000

function clock(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Home's way into Predict: the next close you can still call, what a call pays, and a countdown. */
export default function PredictSection() {
  const { aspInfo } = useContext(AspContext)
  const { config } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)
  const { navigate } = useContext(NavigationContext)
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))
  const [market, setMarket] = useState<PredictMarketSnapshot | null>(null)
  const [side, setSide] = useState<PredictKind>(2)
  const samples = useRef<PredictMarketSnapshot['samples']>([])

  const oraclePricesUrl = getPredictConfig(aspInfo.network, aspInfo.url || undefined).oraclePricesUrl

  useEffect(() => {
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const poll = async () => {
      const next = await fetchPredictMarket(oraclePricesUrl, samples.current, controller.signal).catch(() => null)
      if (!active || !next) return
      samples.current = next.samples
      setMarket(next)
    }
    void poll()
    const id = setInterval(() => void poll(), POLL_MS)
    return () => {
      active = false
      controller.abort()
      clearInterval(id)
    }
  }, [oraclePricesUrl])

  useEffect(() => {
    const id = setInterval(() => setSide((s) => (s === 2 ? 3 : 2)), ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const next = upcomingWindows(nowSec, 1)[0] ?? 0

  // What a sample stake comes back as on each side, after the price check fee.
  const payouts = useMemo(() => {
    if (!market || !next) return null
    const { lineCents } = resolveWindowLineCents(market.samples, next, market.priceCents)
    if (!lineCents) return null
    const years = Math.max(60, next - nowSec) / (365.25 * 86_400)
    const fiat = config.currency !== Currencies.BTC && toFiat(100_000_000) > 0
    const stakeSats = BigInt(Math.max(1, Math.round(fiat ? fromFiat(100) : SAMPLE_SATS)))
    const label = (sats: bigint) =>
      fiat
        ? prettyFiatAmount(toFiat(Number(sats)), config.currency, { maximumFractionDigits: 0 })
        : `${prettyNumber(Number(sats))} sats`
    const pays = (kind: PredictKind) => {
      const multiplier = predictMultiplier({ kind, spotCents: market.priceCents, lineCents, years, vol: market.vol })
      if (multiplier == null) return null
      const gross = predictPayout(stakeSats, multiplier)
      return label(gross > BEACON_READ_FEE ? gross - BEACON_READ_FEE : 0n)
    }
    return { stake: label(stakeSats), 2: pays(2), 3: pays(3) }
    // nowSec only matters per window, so recompute when the close or the market moves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, next, config.currency, toFiat, fromFiat])

  const open = () => {
    hapticLight()
    navigate(Pages.Predict)
  }

  // A side the desk would not quote (its odds are off the scale) drops out of the rotation.
  const shown: PredictKind | null = payouts
    ? payouts[side]
      ? side
      : payouts[side === 2 ? 3 : 2]
        ? side === 2
          ? 3
          : 2
        : null
    : null
  const line =
    payouts && shown
      ? t(shown === 2 ? 'predict.homeIfHigher' : 'predict.homeIfLower', {
          stake: payouts.stake,
          payout: payouts[shown]!,
        })
      : t('predict.homeNext', { time: next ? clock(next) : '—' })

  return (
    <section className='home-section'>
      <div className='home-section__header'>
        <button type='button' className='predict-home__heading' onClick={open}>
          <h2 className='home-section-label'>{t('predict.homeTitle')}</h2>
          <Glyph name='chevronRight' size={18} strokeWidth={2} />
        </button>
      </div>
      <button type='button' className='predict-home focusable' onClick={open} data-testid='home-action-predict'>
        <span className='predict-home__coin' aria-hidden='true'>
          ₿
        </span>
        <span className='flex min-w-0 flex-1 flex-col gap-0.5 text-left'>
          <span className='predict-home__title'>{t('predict.homeMarket')}</span>
          <span
            key={shown ?? 'next'}
            className={reduceMotion ? 'predict-note' : 'predict-note predict-home__rotate'}
            data-testid='home-predict-line'
          >
            {line}
          </span>
        </span>
        <span className='predict-home__count'>{next ? formatCountdown(next - nowSec) : ''}</span>
      </button>
    </section>
  )
}
