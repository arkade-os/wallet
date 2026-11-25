import Button from '../../../components/Button'
import SheetModal from '../../../components/SheetModal'
import Glyph from '../../../icons/Glyph'
import { hapticLight } from '../../../lib/haptics'
import { useTranslation } from '../../../providers/language'

const INTRO_KEY = 'arkade-predict-intro-v1'

export function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === '1'
  } catch {
    return true
  }
}

function markSeen() {
  try {
    localStorage.setItem(INTRO_KEY, '1')
  } catch {
    // storage unavailable: the intro shows again next time, which is harmless
  }
}

/** First visit only: what Predict is, in three steps. */
export default function IntroSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const close = () => {
    markSeen()
    onClose()
  }
  const steps = [
    { icon: 'trendUp' as const, title: t('predict.introPickTitle'), body: t('predict.introPick') },
    { icon: 'layers' as const, title: t('predict.introStakeTitle'), body: t('predict.introStake') },
    { icon: 'clock' as const, title: t('predict.introPaidTitle'), body: t('predict.introPaid') },
  ]
  return (
    <SheetModal isOpen={isOpen} onClose={close} labelledBy='predict-intro-title'>
      <div className='predict-intro' data-testid='predict-intro'>
        <svg className='predict-intro__art' viewBox='0 0 320 112' aria-hidden='true'>
          <rect className='predict-chart__win' x='0' y='0' width='320' height='58' />
          <rect className='predict-chart__ahead' x='226' y='0' width='94' height='112' />
          <line className='predict-chart__line' x1='0' x2='320' y1='58' y2='58' />
          <line className='predict-chart__close' x1='319.5' x2='319.5' y1='0' y2='112' />
          <path
            className='predict-chart__price'
            d='M0,74 L18,68 L34,80 L52,71 L70,76 L88,60 L106,66 L124,52 L142,58 L160,47 L178,55 L196,41 L214,46 L226,38'
          />
          <circle className='predict-chart__halo' cx='226' cy='38' r='9' />
          <circle className='predict-chart__dot' cx='226' cy='38' r='4.5' />
        </svg>
        <h2 id='predict-intro-title' className='predict-intro__title'>
          {t('predict.introTitle')}
        </h2>
        <p className='predict-intro__body'>{t('predict.introBody')}</p>
        <div className='mt-2'>
          {steps.map((step) => (
            <div key={step.title} className='predict-step'>
              <span className='predict-well predict-well--tint'>
                <Glyph name={step.icon} size={20} strokeWidth={2} />
              </span>
              <span className='flex flex-col gap-0.5'>
                <span className='predict-step__title'>{step.title}</span>
                <span className='predict-note'>{step.body}</span>
              </span>
            </div>
          ))}
        </div>
        <div className='mt-4'>
          <Button
            label={t('predict.introStart')}
            onClick={() => {
              hapticLight()
              close()
            }}
            testId='predict-intro-start'
          />
        </div>
      </div>
    </SheetModal>
  )
}
