import { useEffect, useRef, useState } from 'react'
import type { ScannerProps } from './Scanner'
import { registerNativeBack } from '../lib/nativeBack'
import { isNativeIOS } from '../lib/nativePlatform'
import Button from './Button'

let cameraReleased = Promise.resolve()
let cameraOwner: symbol | undefined

export default function NativeScanner({ close, label, onData, onError }: ScannerProps) {
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const callbacks = useRef({ close, onData, onError })
  const cancelled = useRef(false)
  const cancelRef = useRef<() => void>(() => {})
  callbacks.current = { close, onData, onError }

  useEffect(
    () =>
      registerNativeBack(() => {
        cancelRef.current()
      }),
    [],
  )

  useEffect(() => {
    if (cancelled.current) return
    let stopped = false
    let suspended = false
    let waitingForPermission = false
    let continuePermission: (() => void) | undefined
    const owner = Symbol('camera')
    let cancel: (() => Promise<void>) | undefined
    let cancellation: Promise<void> | undefined
    const hideCamera = () => {
      if (cameraOwner !== owner) return
      document.documentElement.classList.remove('native-qr-active')
      cameraOwner = undefined
    }
    const stopCamera = () => {
      if (!cancel || cameraOwner !== owner || cancellation) return
      hideCamera()
      cancellation = cancel().catch(() => undefined)
      cameraReleased = cancellation
    }
    cancelRef.current = () => {
      if (cancelled.current) return
      cancelled.current = true
      stopped = true
      continuePermission?.()
      continuePermission = undefined
      stopCamera()
      callbacks.current.close()
    }
    const start = async () => {
      await cameraReleased
      const scanner = await import('@tauri-apps/plugin-barcode-scanner')
      if (stopped || suspended) return
      let permission = await scanner.checkPermissions()
      if (stopped || suspended) return
      if (permission !== 'granted') {
        waitingForPermission = true
        try {
          permission = await scanner.requestPermissions()
          if (stopped) return
          if (suspended)
            await new Promise<void>((resolve) => {
              continuePermission = resolve
            })
        } finally {
          waitingForPermission = false
        }
      }
      if (stopped || suspended) return
      if (permission !== 'granted')
        throw new Error(
          `Camera access is off. Enable it in ${isNativeIOS() ? 'iOS' : 'Android'} app settings to scan a QR code.`,
        )
      await cameraReleased
      if (stopped || suspended) return
      if (cameraOwner) throw new Error('Another camera scan is still open. Close it and try again.')
      cancel = scanner.cancel
      cameraOwner = owner
      document.documentElement.classList.add('native-qr-active')
      const result = await scanner.scan({ windowed: true, formats: [scanner.Format.QRCode], cameraDirection: 'back' })
      if (stopped || suspended) return
      hideCamera()
      callbacks.current.onData(result.content)
    }
    void start().catch((cause) => {
      if (stopped || suspended) return
      stopCamera()
      const message =
        cause instanceof Error ? cause.message : 'The camera could not start. Try again or paste the payment request.'
      setError(message)
      callbacks.current.onError(message)
    })
    const onPause = () => {
      if (stopped) return
      suspended = true
      stopCamera()
      setError('Scanner paused. Tap Try again when you are ready.')
    }
    const onResume = () => {
      if (stopped || !waitingForPermission) return
      suspended = false
      setError('')
      continuePermission?.()
      continuePermission = undefined
    }
    window.addEventListener('arkade-native-paused', onPause)
    window.addEventListener('arkade-native-resumed', onResume)
    return () => {
      stopped = true
      continuePermission?.()
      stopCamera()
      window.removeEventListener('arkade-native-paused', onPause)
      window.removeEventListener('arkade-native-resumed', onResume)
    }
  }, [attempt])

  return (
    <section className='native-qr-overlay' aria-label={label}>
      <div className='native-qr-heading'>
        <h1>{label}</h1>
        <p>Place the QR code inside the frame</p>
      </div>
      <div className='native-qr-frame' aria-hidden='true' />
      <div className='native-qr-controls'>
        {error ? (
          <div role='alert' className='native-qr-error'>
            {error}
          </div>
        ) : null}
        {error ? (
          <>
            <Button
              label='Try again'
              onClick={() => {
                if (cancelled.current) return
                callbacks.current.onError('')
                setError('')
                setAttempt((value) => value + 1)
              }}
            />
            <Button
              label='App settings'
              secondary
              onClick={async () => {
                if (cancelled.current) return
                try {
                  const scanner = await import('@tauri-apps/plugin-barcode-scanner')
                  if (cancelled.current) return
                  await scanner.openAppSettings()
                } catch {
                  if (cancelled.current) return
                  setError(
                    `Unable to open app settings. Open Arkade's camera permissions in ${isNativeIOS() ? 'iOS' : 'Android'} Settings, then tap Try again.`,
                  )
                }
              }}
            />
          </>
        ) : null}
        <Button
          label='Cancel'
          secondary
          onClick={() => {
            cancelRef.current()
          }}
        />
      </div>
    </section>
  )
}
