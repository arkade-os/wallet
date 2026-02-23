import { IonHeader, IonTitle } from '@ionic/react'
import BackIcon from '../icons/Back'
import Shadow from './Shadow'
import Text from './Text'
import FlexRow from './FlexRow'
import React from 'react'
import Focusable from './Focusable'
import { hapticLight } from '../lib/haptics'

interface HeaderProps {
  auxAriaLabel?: string
  auxFunc?: () => void
  auxText?: string
  auxIcon?: JSX.Element
  back?: () => void
  text: string
}

export default function Header({ auxAriaLabel, auxFunc, auxText, back, text, auxIcon }: HeaderProps) {
  const handleBack = back ? () => { hapticLight(); if (typeof back === 'function') back() } : undefined
  const SideButton = (text: string) => (
    <Shadow>
      <Text color='dark80' centered tiny wrap>
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
    <IonHeader style={{ boxShadow: 'none' }}>
      <FlexRow between>
        <div style={{ minWidth: '4rem', marginLeft: '0.5rem' }}>
          {back ? (
            <Focusable onEnter={handleBack} fit round>
              <div onClick={handleBack} style={{ cursor: 'pointer' }} aria-label='Go back'>
                <BackIcon />
              </div>
            </Focusable>
          ) : (
            '\u00A0'
          )}
        </div>
        <IonTitle className='ion-text-center'>{text}</IonTitle>
        <div style={style} onClick={auxFunc} aria-label={auxAriaLabel}>
          {auxText || auxIcon ? (
            <Focusable onEnter={auxFunc} fit round>
              {auxText ? SideButton(auxText) : <div style={{ padding: '0.5rem' }}>{auxIcon}</div>}
            </Focusable>
          ) : (
            '\u00A0'
          )}
        </div>
      </FlexRow>
    </IonHeader>
  )
}
