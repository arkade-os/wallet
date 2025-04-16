import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/react'
import { ReactNode, useContext, useRef } from 'react'
import { WalletContext } from '../providers/wallet'
interface ContentProps {
  children: ReactNode
}

export default function Content({ children }: ContentProps) {
  const { reloadWallet } = useContext(WalletContext)

  const refresher = useRef<HTMLIonRefresherElement>(null)

  const handleRefresh = () => {
    setTimeout(() => {
      reloadWallet().then(() => refresher.current?.complete())
    }, 1000)
  }

  return (
    <IonContent>
      <IonRefresher onIonRefresh={handleRefresh} ref={refresher} slot='fixed'>
        <IonRefresherContent />
      </IonRefresher>
      <div style={{ height: '100%', paddingTop: '2rem' }}>{children}</div>
    </IonContent>
  )
}
