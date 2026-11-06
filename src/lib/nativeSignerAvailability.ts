import { getNativeCardState } from './nativeBridge'
import { isNativeIOS } from './nativePlatform'

export function canRequestNativeSigning(publicKey?: string): boolean {
  if (isNativeIOS()) return true
  const card = getNativeCardState()
  return card.status === 'connected' && (publicKey === undefined || card.publicKey === publicKey)
}

export function nativeSigningInterrupted(): boolean {
  const card = getNativeCardState()
  return isNativeIOS() ? Boolean(card.error) : card.status !== 'connected'
}
