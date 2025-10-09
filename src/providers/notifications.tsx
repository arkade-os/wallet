import { ReactNode, createContext, useContext, useEffect, useRef } from 'react'
import { ConfigContext } from './config'
import { sendNotification } from '../lib/notifications'
import { prettyNumber } from '../lib/format'
import { Relay } from 'nostr-tools'

interface NotificationsContextProps {
  notifyPaymentReceived: (s: number) => void
  notifyPaymentSent: (s: number) => void
  notifyVtxosRollover: () => void
  notifyTxSettled: () => void
}

export const NotificationsContext = createContext<NotificationsContextProps>({
  notifyPaymentReceived: () => {},
  notifyPaymentSent: () => {},
  notifyVtxosRollover: () => {},
  notifyTxSettled: () => {},
})

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { config } = useContext(ConfigContext)
  const relay = useRef<Relay>()

  const connectRelay = async (): Promise<void> => {
    relay.current = await Relay.connect('wss://relay.primal.net')
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

  return (
    <NotificationsContext.Provider
      value={{
        notifyPaymentReceived,
        notifyPaymentSent,
        notifyVtxosRollover,
        notifyTxSettled,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}
