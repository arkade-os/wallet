import { IonHeader, IonTitle } from '@ionic/react'
import BackIcon from '../icons/Back'
import Shadow from './Shadow'
import Text from './Text'
import FlexRow from './FlexRow'
import React from 'react'

interface HeaderProps {
  auxFunc?: () => void
  auxText?: string
  auxIcon?: JSX.Element
  back?: () => void
  text: string
}

export default function Header({ auxFunc, auxText, back, text, auxIcon }: HeaderProps) {
  const SideButton = (text: string, onClick = () => {}) => (
    <Shadow onClick={onClick}>
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
        <div style={{ minWidth: '4rem' }}>
          {back ? (
            <div onClick={back} style={{ cursor: 'pointer', marginLeft: '0.5rem' }}>
              <BackIcon />
            </div>
          ) : (
            <p>&nbsp;</p>
          )}
        </div>
        <IonTitle class='ion-text-center'>{text}</IonTitle>
        <div style={style} onClick={auxFunc}>
          {auxText ? SideButton(auxText) : auxIcon ? auxIcon : <p>&nbsp;</p>}
        </div>
      </FlexRow>
    </IonHeader>
  )
}
