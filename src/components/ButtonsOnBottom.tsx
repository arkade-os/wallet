import { IonFooter } from '@ionic/react'
import { ReactNode } from 'react'
import FlexCol from './FlexCol'

interface ButtonsOnBottomProps {
  bordered?: boolean
  children: ReactNode
}

export default function ButtonsOnBottom({ bordered, children }: ButtonsOnBottomProps) {
  const borderStyle = {
    backgroundColor: 'var(--dark10)',
    marginTop: '1rem',
    width: '100%',
  }
  return (
    <>
      {bordered ? <hr style={borderStyle} /> : null}
      <IonFooter className='ion-padding ion-no-border'>
        <FlexCol gap='0' strech>
          {children}
        </FlexCol>
      </IonFooter>
    </>
  )
}
