import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/react'
import { ReactNode, useRef } from 'react'
interface ContentProps {
  children: ReactNode
}

export default function Content({ children }: ContentProps) {
  const refresher = useRef<HTMLIonRefresherElement>(null)

  return (
    <IonContent>
      <IonRefresher ref={refresher} slot='fixed'>
        <IonRefresherContent />
      </IonRefresher>
      <div style={{ height: '100%', paddingTop: '2rem' }}>{children}</div>
    </IonContent>
  )
}
