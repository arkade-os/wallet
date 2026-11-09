import { useEffect, useRef } from 'react'
import { handleNativeBack } from '../lib/nativeBack'
import { invokeWalletHost, isNativeAndroid, isNativeMobile, listenWalletHost } from '../lib/nativePlatform'
import { consoleError } from '../lib/logs'

type Options = { backEnabled: boolean; onBack?: () => void; onResume?: () => void }

export function useNativeHostEvents({ backEnabled, onBack, onResume }: Options): void {
  const current = useRef({ onBack, onResume })
  current.current = { onBack, onResume }
  useEffect(() => {
    if (!isNativeMobile()) return
    let stopped = false
    const disposers: (() => void)[] = []
    const listen = async (name: string, callback: (value: any) => void) => {
      const dispose = await listenWalletHost(name, (value) => {
        if (!stopped) callback(value)
      })
      if (stopped) dispose()
      else disposers.push(dispose)
    }
    void Promise.all([
      ...(isNativeAndroid()
        ? [
            listen('back', () => {
              if (!handleNativeBack()) current.current.onBack?.()
            }),
          ]
        : []),
      listen('lifecycle', (value) => {
        if (value?.state === 'paused') window.dispatchEvent(new Event('arkade-native-paused'))
        if (value?.state === 'resumed') {
          window.dispatchEvent(new Event('arkade-native-resumed'))
          current.current.onResume?.()
        }
      }),
    ]).catch(consoleError)
    return () => {
      stopped = true
      disposers.forEach((dispose) => dispose())
    }
  }, [])

  useEffect(() => {
    if (!isNativeAndroid()) return
    void invokeWalletHost('set_back_handler', { enabled: backEnabled }).catch(consoleError)
    return () => {
      void invokeWalletHost('set_back_handler', { enabled: false }).catch(consoleError)
    }
  }, [backEnabled])
}
