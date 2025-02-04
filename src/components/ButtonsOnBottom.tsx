import { IonFooter } from '@ionic/react'
import { ReactNode } from 'react'
import FlexCol from './FlexCol'

interface ButtonsOnBottomProps {
  children: ReactNode
}

export default function ButtonsOnBottom({ children }: ButtonsOnBottomProps) {
  return (
    <IonFooter class='ion-padding ion-no-border'>
      <FlexCol gap='0.5rem' strech>
        {children}
      </FlexCol>
    </IonFooter>
  )
}
