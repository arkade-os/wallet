import { useContext, useState } from 'react'
import NativeCardConnectSheet from '../components/NativeCardConnectSheet'
import { WalletContext } from '../providers/wallet'
import { isNativeWallet } from '../lib/nativeWallet'
import { canRequestNativeSigning } from '../lib/nativeSignerAvailability'

export function useNativeSigningConnection(actionLabel: string, onConnected: () => void) {
  const { wallet } = useContext(WalletContext)
  const [isOpen, setIsOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const requireConnection = () => {
    setNotice('')
    if (!isNativeWallet(wallet) || canRequestNativeSigning(wallet.pubkey)) return false
    setIsOpen(true)
    return true
  }

  const connectionSheet = (
    <NativeCardConnectSheet
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConnected={() => {
        setIsOpen(false)
        setNotice(`Card connected. Review the details, then press ${actionLabel} again.`)
        onConnected()
      }}
    />
  )

  return { requireConnection, connectionSheet, notice }
}
