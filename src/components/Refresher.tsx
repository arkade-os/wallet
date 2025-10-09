import { IonRefresher, IonRefresherContent } from '@ionic/react'
import { WalletContext } from '../providers/wallet'
import { useContext } from 'react'

export default function Refresher() {
  const { reloadWallet, svcWallet } = useContext(WalletContext)

  const handleRefresh = async (event: { detail: { complete(): void } }) => {
    await svcWallet?.reload()
    await reloadWallet()
    event.detail.complete()
  }

  return (
    <IonRefresher slot='fixed' onIonRefresh={handleRefresh}>
      <IonRefresherContent />
    </IonRefresher>
  )
}
