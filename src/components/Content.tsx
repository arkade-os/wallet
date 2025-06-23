import { ReactNode } from 'react'
import Refresher from './Refresher'
import { IonContent } from '@ionic/react'

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
