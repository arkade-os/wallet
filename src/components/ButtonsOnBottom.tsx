import { IonFooter } from '@ionic/react'
import { ReactNode } from 'react'
import FlexCol from './FlexCol'

interface ButtonsOnBottomProps {
  bordered?: boolean
  children: ReactNode
}

export default function ButtonsOnBottom({ bordered, children }: ButtonsOnBottomProps) {
  const gap = '0.5rem'
  const borderStyle = {
    backgroundColor: 'var(--dark10)',
    marginTop: gap,
    width: '100%',
  }
  return (
    <>
      {bordered ? <hr style={borderStyle} /> : null}
      <IonFooter class='ion-padding ion-no-border'>
        <FlexCol gap={gap} strech>
          {children}
        </FlexCol>
      </IonFooter>
    </>
  )
}
