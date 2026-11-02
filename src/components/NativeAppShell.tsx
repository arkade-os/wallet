import { useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { isNativeHost } from '../lib/nativeBridge'
import {
  invokeWalletHost,
  isNativeAndroid,
  isNativeMobile,
  listenWalletHost,
  nativeAppIntent,
} from '../lib/nativePlatform'
import { configureNativeBackground } from '../lib/nativeBackground'
import { getNativeBackCount, subscribeNativeBack } from '../lib/nativeBack'
import { useNativeHostEvents } from '../hooks/useNativeHostEvents'
import type { AppIntentState } from '../lib/appIntent'
import { consoleError } from '../lib/logs'
import { NavigationContext, Pages } from '../providers/navigation'
import { FlowContext } from '../providers/flow'
import { WalletContext } from '../providers/wallet'
import { ConfigContext } from '../providers/config'
import Button from './Button'
import NativeSigningPin from './NativeSigningPin'

const ROOT_SCREENS = new Set([Pages.Wallet, Pages.Init, Pages.Unlock, Pages.Loading, Pages.Unavailable])

export default function NativeAppShell({ children }: { children: ReactNode }) {
  const { screen, goBack } = useContext(NavigationContext)
  const { appIntent, setAppIntent } = useContext(FlowContext)
  const { reloadWallet, wallet, authState, dataReady } = useContext(WalletContext)
  const { config, configLoaded } = useContext(ConfigContext)
  const [incoming, setIncoming] = useState<AppIntentState>()
  const [resumeCount, setResumeCount] = useState(0)
  const overlayCount = useSyncExternalStore(subscribeNativeBack, getNativeBackCount)
  const canOpenRequest = !appIntent && ROOT_SCREENS.has(screen) && overlayCount === 0
  const seen = useRef<{ url: string; at: number }>()
  const current = useRef({ appIntent, setAppIntent, canOpenRequest })
  current.current = { appIntent, setAppIntent, canOpenRequest }
  useNativeHostEvents({
    backEnabled: overlayCount > 0 || !ROOT_SCREENS.has(screen) || Boolean(appIntent),
    onBack: () => {
      if (current.current.appIntent) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      else goBack()
    },
    onResume: () => {
      setResumeCount((count) => count + 1)
      void reloadWallet().catch(consoleError)
    },
  })

  useEffect(() => {
    if (!isNativeHost()) return
    const mobile = isNativeMobile()
    let stopped = false
    const disposers: (() => void)[] = []
    const listen = async (name: string, callback: (value: any) => void) => {
      const dispose = await listenWalletHost(name, callback)
      if (stopped) dispose()
      else disposers.push(dispose)
    }
    const receive = (url: unknown) => {
      if (stopped || typeof url !== 'string' || (url === seen.current?.url && Date.now() - seen.current.at < 1500))
        return
      const intent = nativeAppIntent(url)
      if (!intent) return
      seen.current = { url, at: Date.now() }
      if (current.current.canOpenRequest && !current.current.appIntent) {
        current.current.appIntent = intent
        current.current.setAppIntent(intent)
      } else setIncoming(intent)
    }
    let reads = Promise.resolve()
    const readPending = () => {
      reads = reads
        .then(async () => {
          if (stopped) return
          const value = await invokeWalletHost(mobile ? 'initial_intent' : 'pending_intents')
          if (mobile) receive(value)
          else if (Array.isArray(value)) value.forEach(receive)
        })
        .catch(consoleError)
      return reads
    }
    void listen('intent', (value) => {
      if (mobile) receive(value?.url)
      else void readPending()
    })
      .then(readPending)
      .catch(consoleError)
    return () => {
      stopped = true
      disposers.forEach((dispose) => dispose())
    }
  }, [])

  useEffect(() => {
    if (!isNativeAndroid() || !configLoaded || (config.notifications && !dataReady)) return
    void configureNativeBackground(config.notifications, wallet.nextRollover).catch(consoleError)
  }, [config.notifications, configLoaded, wallet.nextRollover, dataReady, resumeCount])

  if (!isNativeHost()) return <>{children}</>
  return (
    <div className='native-app-shell'>
      {incoming ? (
        <div role='status' className='native-incoming-link flex-wrap'>
          <div className='w-full min-w-0'>
            <p>A new wallet request is waiting.</p>
            {!canOpenRequest ? <p className='text-xs'>Finish the current task or return to your wallet.</p> : null}
          </div>
          <Button className='flex-1' secondary label='Dismiss' onClick={() => setIncoming(undefined)} />
          <Button
            className='flex-1'
            label='Open request'
            disabled={!canOpenRequest}
            onClick={() => {
              if (!current.current.canOpenRequest || current.current.appIntent) return
              current.current.appIntent = incoming
              current.current.setAppIntent(incoming)
              setIncoming(undefined)
            }}
          />
        </div>
      ) : null}
      <div className='native-app-content' data-wallet-locked={authState === 'locked'}>
        {children}
      </div>
      <NativeSigningPin unlocked={authState === 'authenticated' || authState === 'passwordless'} />
    </div>
  )
}
