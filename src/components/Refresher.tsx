import { IonRefresher, IonRefresherContent } from '@ionic/react'
import { WalletContext } from '../providers/wallet'
import { useContext } from 'react'

export default function Refresher() {
  const { reloadWallet, walletInstance } = useContext(WalletContext)

  const handleRefresh = async (event: { detail: { complete(): void } }) => {
    // Only ServiceWorkerWallet has a reload() method
    if (walletInstance?.type === 'service-worker') {
      await walletInstance.wallet.reload()
    }
    await reloadWallet()
    event.detail.complete()
  }

  return (
    <IonRefresher slot='fixed' onIonRefresh={handleRefresh}>
      <IonRefresherContent />
    </IonRefresher>
  )
}
