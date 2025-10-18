import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { WalletContext } from './wallet'
import { FlowContext } from './flow'
import { NavigationContext, Pages } from './navigation'

interface IframeContextProps {
  iframeUrl: string
  sendMessage: (message: string) => void
}

export const IframeContext = createContext<IframeContextProps>({
  iframeUrl: '',
  sendMessage: () => {},
})

export const IframeProvider = ({ children }: { children: ReactNode }) => {
  const { setSendInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { wallet, walletLoaded, isLocked } = useContext(WalletContext)

  const [iframeUrl, setIframeUrl] = useState('')

  const sendMessage = (message: string) => {
    const iframe = document.querySelector('iframe')
    if (!iframe || !iframe.contentWindow) return
    iframe.contentWindow.postMessage(message, '*')
  }

  const sendStatus = async (w = wallet) => {
    sendMessage(
      JSON.stringify({
        action: 'status',
        status: !w.network ? 'uninitialized' : (await isLocked()) ? 'locked' : 'unlocked',
      }),
    )
  }

  const sendError = (message: string) => {
    sendMessage(
      JSON.stringify({
        action: 'error',
        message,
      }),
    )
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  useEffect(() => {
    const hash = window.location.hash
    const possibleUrl = hash.startsWith('#') ? hash.slice(1) : hash
    setIframeUrl(isValidUrl(possibleUrl) ? possibleUrl : '')
  }, [])

  useEffect(() => {
    window.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data)
        const { action, arkAddress, satoshis, text } = data
        switch (action) {
          case 'status':
            sendStatus()
            break
          case 'send':
            if (!arkAddress) return sendError('missing arkAddress')
            if (!satoshis) return sendError('missing satoshis')
            setSendInfo({ arkAddress, satoshis, text })
            navigate(Pages.SendDetails)
            break
          default:
            break
        }
      } catch {}
    })
  }, [])

  useEffect(() => {
    if (walletLoaded) sendStatus(walletLoaded)
  }, [walletLoaded, wallet])

  return <IframeContext.Provider value={{ iframeUrl, sendMessage }}>{children}</IframeContext.Provider>
}
