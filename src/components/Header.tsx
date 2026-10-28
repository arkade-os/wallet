import React, { useContext } from 'react'
import { NavigationContext } from '../providers/navigation'
import BackIcon from '../icons/Back'
import Shadow from './Shadow'
import Text from './Text'
import FlexRow from './FlexRow'
import { hapticLight } from '../lib/haptics'
import { useTranslation } from '../providers/language'

interface HeaderProps {
  auxAriaLabel?: string
  auxFunc?: () => void
  auxText?: string
  auxIcon?: JSX.Element
  back?: (() => void) | boolean
  heading?: boolean
  text: string
}

export default function Header({ auxAriaLabel, auxFunc, auxText, back, text, auxIcon }: HeaderProps) {
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

  const SideButton = (text: string) => (
    <Shadow>
      <Text color='neutral-800' centered tiny wrap>
        {text}
      </Text>
    </Shadow>
  )

  const style: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    minWidth: '4rem',
    paddingRight: '1rem',
  }

  return (
    <div className='header'>
      <FlexRow between>
        <div style={{ minWidth: '4rem', marginLeft: '0.5rem' }}>
          {handleBack ? (
            <button type='button' onClick={handleBack} aria-label={t('common.back')}>
              <BackIcon />
            </button>
          ) : (
            '\u00A0'
          )}
        </div>
        <p className='title' data-testid={testId}>
          {text}
        </p>
        <button type='button' style={style} onClick={auxFunc} aria-label={auxAriaLabel} data-testid='header-aux-btn'>
          {auxText || auxIcon ? (
            auxText ? (
              SideButton(auxText)
            ) : (
              <div style={{ padding: '0.5rem' }}>{auxIcon}</div>
            )
          ) : (
            '\u00A0'
          )}
        </button>
      </FlexRow>
    </div>
  )
}
