import { ReactNode, useEffect } from 'react'
import { hapticSuccess } from '../lib/haptics'
import { useTranslation } from '../providers/language'
import SheetPage from './SheetPage'
import Button from './Button'

interface WalletSuccessSplashProps {
  show?: boolean
  headline: string
  text?: string
  backdrop?: ReactNode
  onDone: () => void
}

export default function WalletSuccessSplash({
  show = true,
  headline,
  text,
  backdrop,
  onDone,
}: WalletSuccessSplashProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (show) hapticSuccess()
  }, [show])

  if (!show) return null

  return (
    <SheetPage label={headline} backdrop={backdrop} testId='success-sheet'>
      <div className='success-sheet' aria-live='polite'>
        <span className='success-sheet__mark' role='img' aria-label={t('transaction.success')}>
          <svg width='30' height='30' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
            <path d='m5 12.5 4.5 4.500L19 7.500' pathLength='1' />
          </svg>
        </span>
        <h1 className='success-sheet__headline'>{headline}</h1>
        {text ? <p className='success-sheet__text'>{text}</p> : null}
      </div>
      <div className='review__actions'>
        <Button onClick={onDone} label={t('transaction.soundsGood')} />
      </div>
    </SheetPage>
  )
}
