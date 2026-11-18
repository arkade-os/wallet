import { useContext } from 'react'
import { NavigationContext } from '../providers/navigation'
import BackIcon from '../icons/Back'
import Glyph from '../icons/Glyph'
import { hapticLight } from '../lib/haptics'
import { useTranslation } from '../providers/language'

interface HeaderProps {
  auxAriaLabel?: string
  auxFunc?: () => void
  auxText?: string
  auxIcon?: JSX.Element
  back?: (() => void) | boolean
  /** Show a close mark instead of the back arrow, for covers and sheets. */
  close?: boolean
  heading?: boolean
  text: string
}

export default function Header({ auxAriaLabel, auxFunc, auxText, back, close, text, auxIcon }: HeaderProps) {
  const { t } = useTranslation()
  const { goBack } = useContext(NavigationContext)

  const testId = 'header-title-' + text.toLowerCase().replace(/\s/g, '-')

  const handleBack = back
    ? () => {
        hapticLight()
        if (typeof back === 'function') back()
        else goBack()
      }
    : undefined

  return (
    <header className='header'>
      <div className='header__side'>
        {handleBack ? (
          <button
            type='button'
            className='icon-button'
            onClick={handleBack}
            aria-label={close ? t('components.close') : t('common.back')}
            data-testid='header-back-btn'
          >
            {close ? <Glyph name='close' size={22} strokeWidth={2} /> : <BackIcon />}
          </button>
        ) : null}
      </div>
      <h1 className='title' data-testid={testId}>
        {text}
      </h1>
      <div className='header__side header__side--end'>
        {auxText || auxIcon ? (
          <button
            type='button'
            className={auxText ? 'header__aux' : 'icon-button'}
            onClick={auxFunc}
            aria-label={auxAriaLabel ?? auxText}
            data-testid='header-aux-btn'
          >
            {auxText ?? auxIcon}
          </button>
        ) : null}
      </div>
    </header>
  )
}
