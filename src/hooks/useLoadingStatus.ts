import { useSyncExternalStore } from 'react'
import { getLoadingStatus, subscribeLoadingStatus } from '../lib/loadingStatus'

export function useLoadingStatus() {
  return useSyncExternalStore(subscribeLoadingStatus, getLoadingStatus)
}
