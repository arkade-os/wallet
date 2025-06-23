import { IonContent } from '@ionic/react'
import { ReactNode } from 'react'
import Refresher from './Refresher'

interface ContentProps {
  children: ReactNode
}

export default function Content({ children }: ContentProps) {
  return (
    <IonContent>
      <Refresher />
      <div style={{ height: '100%', paddingTop: '2rem' }}>{children}</div>
    </IonContent>
  )
}
