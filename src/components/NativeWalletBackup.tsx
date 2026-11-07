import { useContext } from 'react'
import { WalletContext } from '../providers/wallet'
import { SwapsContext } from '../providers/swaps'
import NativeStateBackup from './NativeStateBackup'
import { toast } from './Toast'

export default function NativeWalletBackup() {
  const { wallet, lockWallet } = useContext(WalletContext)
  const { pauseForBackup } = useContext(SwapsContext)
  const prepare = async () => {
    if (wallet.lockedByBiometrics || wallet.passkeyId)
      throw new Error('Switch to a wallet password before creating this backup.')
    await pauseForBackup()
    await lockWallet()
  }
  return (
    <NativeStateBackup
      mode='export'
      beforeExport={prepare}
      onExported={() => toast.success('Encrypted wallet backup saved. You can open your wallet again.')}
      onError={(message) => toast.error(message)}
    />
  )
}
