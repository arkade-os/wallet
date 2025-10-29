import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { ConfigContext } from './config'
import {
  sendNotification,
  isPushSupported,
  getPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '../lib/notifications'
import { prettyNumber } from '../lib/format'
import { Relay } from 'nostr-tools'

interface NotificationsContextProps {
  notifyPaymentReceived: (s: number) => void
  notifyPaymentSent: (s: number) => void
  notifyVtxosRollover: () => void
  notifyTxSettled: () => void
  pushSupported: boolean
  pushSubscribed: boolean
  subscribeToPush: (walletAddress: string) => Promise<boolean>
  unsubscribeFromPush: (walletAddress: string) => Promise<boolean>
  checkPushSubscription: () => Promise<void>
}

export const NotificationsContext = createContext<NotificationsContextProps>({
  notifyPaymentReceived: () => {},
  notifyPaymentSent: () => {},
  notifyVtxosRollover: () => {},
  notifyTxSettled: () => {},
  pushSupported: false,
  pushSubscribed: false,
  subscribeToPush: async () => false,
  unsubscribeFromPush: async () => false,
  checkPushSubscription: async () => {},
})

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { config } = useContext(ConfigContext)
  const relay = useRef<Relay>()
  const [pushSupported] = useState<boolean>(isPushSupported())
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false)

  const connectRelay = async (): Promise<void> => {
    relay.current = await Relay.connect('wss://relay.primal.net')
  }

  const checkPushSubscription = async (): Promise<void> => {
    if (!pushSupported) {
      setPushSubscribed(false)
      return
    }

    try {
      const subscription = await getPushSubscription()
      setPushSubscribed(!!subscription)
    } catch (error) {
      console.error('Failed to check push subscription:', error)
      setPushSubscribed(false)
    }
  }

  const subscribeToPush = async (walletAddress: string): Promise<boolean> => {
    if (!pushSupported) {
      console.error('Push notifications not supported')
      return false
    }

    try {
      const success = await subscribeToPushNotifications(walletAddress)
      if (success) {
        setPushSubscribed(true)
      }
      return success
    } catch (error) {
      console.error('Failed to subscribe to push:', error)
      return false
    }
  }

  const unsubscribeFromPush = async (walletAddress: string): Promise<boolean> => {
    if (!pushSupported) {
      return false
    }

    try {
      const success = await unsubscribeFromPushNotifications(walletAddress)
      if (success) {
        setPushSubscribed(false)
      }
      return success
    } catch (error) {
      console.error('Failed to unsubscribe from push:', error)
      return false
    }
  }

  const sendSystemNotification = (title: string, body: string) => {
    if (!config.notifications) return
    sendNotification(title, body)
  }

  const notifyPaymentReceived = (sats: number) => {
    const body = `You received ${prettyNumber(sats)} sats`
    const title = 'Payment received'
    sendSystemNotification(title, body)
  }

  const notifyPaymentSent = (sats: number) => {
    const body = `You sent ${prettyNumber(sats)} sats`
    const title = 'Payment sent'
    sendSystemNotification(title, body)
  }

  const notifyTxSettled = () => {
    const body = `All preconfirmed transactions were settled`
    const title = 'Transactions settled'
    sendSystemNotification(title, body)
  }

  const notifyVtxosRollover = () => {
    const body = 'All VTXOs were rolled over'
    const title = 'Vtxos rolled over'
    sendSystemNotification(title, body)
  }

  useEffect(() => {
    if (!config.nostr) {
      if (relay.current) {
        if (relay.current.connected) relay.current.close()
        relay.current = undefined
      }
      return
    }
    connectRelay()
  }, [config.nostr])

  // Check push subscription status on mount
  useEffect(() => {
    if (pushSupported) {
      checkPushSubscription()
    }
  }, [pushSupported])

  return (
    <NotificationsContext.Provider
      value={{
        notifyPaymentReceived,
        notifyPaymentSent,
        notifyVtxosRollover,
        notifyTxSettled,
        pushSupported,
        pushSubscribed,
        subscribeToPush,
        unsubscribeFromPush,
        checkPushSubscription,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}
