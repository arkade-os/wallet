import React, { useContext } from 'react'
import { NavigationContext } from '../providers/navigation'
import BackIcon from '../icons/Back'
import Shadow from './Shadow'
import Text from './Text'
import FlexRow from './FlexRow'
import Focusable from './Focusable'
import { hapticLight } from '../lib/haptics'

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
  const { goBack } = useContext(NavigationContext)

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
    cursor: 'pointer',
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
            <Focusable onEnter={handleBack} fit round>
              <div onClick={handleBack} style={{ cursor: 'pointer' }} aria-label='Go back'>
                <BackIcon />
              </div>
            </Focusable>
          ) : (
            '\u00A0'
          )}
        </div>
        <p className='title'>{text}</p>
        <div style={style} onClick={auxFunc} aria-label={auxAriaLabel} data-testid='header-aux-btn'>
          {auxText || auxIcon ? (
            <Focusable onEnter={auxFunc} fit round>
              {auxText ? SideButton(auxText) : <div style={{ padding: '0.5rem' }}>{auxIcon}</div>}
            </Focusable>
          ) : (
            '\u00A0'
          )}
        </div>
      </FlexRow>
    </div>
  )
}
