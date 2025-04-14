import { ReactNode, createContext, useContext, useEffect, useRef } from 'react'
import { ConfigContext } from './config'
import { sendNotification } from '../lib/notifications'
import { prettyNumber } from '../lib/format'
import { Relay } from 'nostr-tools'
import { consoleLog } from '../lib/logs'

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

  const sendNostrNotification = async (content: string) => {
    consoleLog('notImplemented: sendNostrNotification(', content, ')')
    // if (!wallet.privateKey) throw new Error('wallet is locked')
    // if (!config.nostr) return
    // if (!relay.current) return
    // if (!relay.current.connected) await connectRelay()
    // const pk = getPublicKey(wallet.privateKey)
    // relay.current.subscribe(
    //   [
    //     {
    //       kinds: [1],
    //       authors: [pk],
    //     },
    //   ],
    //   {
    //     onevent(event: any) {
    //       consoleLog('got event:', event)
    //     },
    //   },
    // )
    // const eventTemplate = {
    //   kind: 1,
    //   created_at: Math.floor(Date.now() / 1000),
    //   tags: [],
    //   content,
    // }
    // const signedEvent = finalizeEvent(eventTemplate, wallet.privateKey)
    // await relay.current.publish(signedEvent)
  }

  const sendSystemNotification = (title: string, body: string) => {
    if (!config.notifications) return
    sendNotification(title, body)
  }

  const notifyPaymentReceived = (sats: number) => {
    const body = `You received ${prettyNumber(sats)} sats`
    const title = 'Payment received'
    sendSystemNotification(title, body)
    sendNostrNotification(body)
  }

  const notifyPaymentSent = (sats: number) => {
    const body = `You sent ${prettyNumber(sats)} sats`
    const title = 'Payment sent'
    sendSystemNotification(title, body)
    sendNostrNotification(body)
  }

  const notifyTxSettled = () => {
    const body = `All pending transactions were settled`
    const title = 'Transactions settled'
    sendSystemNotification(title, body)
    sendNostrNotification(body)
  }

  const notifyVtxosRollover = () => {
    const body = 'All VTXOs were rolled over'
    const title = 'Vtxos rolled over'
    sendSystemNotification(title, body)
    sendNostrNotification(body)
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
