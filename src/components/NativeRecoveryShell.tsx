import { useSyncExternalStore, type ReactNode } from 'react'
import { useNativeHostEvents } from '../hooks/useNativeHostEvents'
import { getNativeBackCount, subscribeNativeBack } from '../lib/nativeBack'

export default function NativeRecoveryShell({ children }: { children: ReactNode }) {
  const overlayCount = useSyncExternalStore(subscribeNativeBack, getNativeBackCount)
  useNativeHostEvents({ backEnabled: overlayCount > 0 })
  return <>{children}</>
}
