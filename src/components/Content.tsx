import { IonContent } from '@ionic/react'
import { ReactNode } from 'react'
import Refresher from './Refresher'

interface ContentProps {
  children: ReactNode
  noFade?: boolean
}

export default function Content({ children, noFade }: ContentProps) {
  return (
    <IonContent className={noFade ? 'no-content-fade' : undefined}>
      <Refresher />
      <div className='content-shell'>{children}</div>
    </IonContent>
  )
}
