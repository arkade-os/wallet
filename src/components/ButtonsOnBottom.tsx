import { IonFooter } from '@ionic/react'
import { ReactNode, useContext } from 'react'
import FlexCol from './FlexCol'
import { NavigationContext, Tabs } from '../providers/navigation'

interface ButtonsOnBottomProps {
  bordered?: boolean
  children: ReactNode
}

export default function ButtonsOnBottom({ bordered, children }: ButtonsOnBottomProps) {
  const { tab } = useContext(NavigationContext)

  const borderStyle = {
    backgroundColor: 'var(--dark10)',
    marginTop: '1rem',
    width: '100%',
  }

  const paddingBottom = [Tabs.Wallet, Tabs.Apps, Tabs.Settings].includes(tab) ? '4rem' : '0'

  return (
    <div style={{ paddingBottom }}>
      {bordered ? <hr style={borderStyle} /> : null}
      <IonFooter className='buttons-on-bottom ion-padding ion-no-border'>
        <FlexCol gap='0' strech>
          {children}
        </FlexCol>
      </IonFooter>
    </div>
  )
}
