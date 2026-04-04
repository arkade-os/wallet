import { IonRefresher, IonRefresherContent } from '@ionic/react'
import { WalletContext } from '../providers/wallet'
import { useContext } from 'react'
import { consoleError } from '../lib/logs'

export default function Refresher() {
  const { reloadWallet, svcWallet } = useContext(WalletContext)

  const handleRefresh = async (event: { detail: { complete(): void } }) => {
    try {
      await svcWallet?.reload()
      await reloadWallet()
    } catch (err) {
      consoleError(err, 'Failed to reload wallet')
    } finally {
      event.detail.complete()
    }
  }

  return (
    <IonRefresher slot='fixed' onIonRefresh={handleRefresh}>
      <IonRefresherContent />
    </IonRefresher>
  )
}
