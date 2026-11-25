import { useContext, useEffect, useState } from 'react'
import Glyph from '../../icons/Glyph'
import { hapticLight } from '../../lib/haptics'
import { formatCountdown, upcomingWindows } from '../../lib/predict/pricing'
import { NavigationContext, Pages } from '../../providers/navigation'
import { useTranslation } from '../../providers/language'

function clock(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Home's way into Predict: the next close you can still call, counting down. */
export default function PredictSection() {
  const { navigate } = useContext(NavigationContext)
  const { t } = useTranslation()
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1_000)
    return () => clearInterval(id)
  }, [])

  const next = upcomingWindows(nowSec, 1)[0] ?? 0
  const open = () => {
    hapticLight()
    navigate(Pages.Predict)
  }

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
          <span className='predict-note'>{t('predict.homeNext', { time: next ? clock(next) : '—' })}</span>
        </span>
        <span className='predict-home__count'>{next ? formatCountdown(next - nowSec) : ''}</span>
      </button>
    </section>
  )
}
