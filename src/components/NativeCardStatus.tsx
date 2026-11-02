import { useContext, useSyncExternalStore } from 'react'
import { WalletContext } from '../providers/wallet'
import { getNativeCardState, isNativeHost, subscribeNativeCardState } from '../lib/nativeBridge'
import { isNativeWallet } from '../lib/nativeWallet'

export default function NativeCardStatus() {
  const { wallet, authState } = useContext(WalletContext)
  const state = useSyncExternalStore(subscribeNativeCardState, getNativeCardState)
  if (!isNativeHost() || !isNativeWallet(wallet) || authState !== 'authenticated') return null
  const connected = state.status === 'connected' && state.publicKey === wallet.pubkey
  const connecting = state.status === 'connecting'
  const label = connected ? 'Satochip connected' : connecting ? 'Connecting your Satochip' : 'Satochip disconnected'
  return (
    <span
      role='status'
      aria-live='polite'
      aria-label={label}
      title={label}
      className='inline-block size-2 shrink-0 rounded-full'
      style={{ backgroundColor: connected ? 'var(--success)' : connecting ? 'var(--warning)' : 'var(--neutral-500)' }}
    />
  )
}
