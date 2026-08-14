import Button from './Button'
import ButtonsOnBottom from './ButtonsOnBottom'
import Content from './Content'
import ErrorMessage from './Error'
import Header from './Header'
import Padded from './Padded'
import { QRCanvas, frameLoop, frontalCamera } from 'qr/dom.js'
import { useRef, useEffect, useState } from 'react'
import { extractError } from '../lib/error'
import { cameraErrorText, queryCameraPermission } from '../lib/camera'
import QrScanner from 'qr-scanner'

const videoStyle: React.CSSProperties = {
  borderRadius: '0.5rem',
  margin: '0 auto',
}

interface ScannerProps {
  close: () => void
  label: string
  onData: (arg0: string) => void
  onError: (arg0: string) => void
  onSwitch?: () => void
  calculateScanRegion?: (v: HTMLVideoElement) => QrScanner.ScanRegion
}

export default function Scanner({ close, label, onData, onError }: ScannerProps) {
  const [currentImplementation, setCurrentImplementation] = useState<'qr' | 'qrmini' | 'mills'>('qr')

  const handleSwitch = () => {
    setCurrentImplementation(
      currentImplementation === 'qr' ? 'qrmini' : currentImplementation === 'qrmini' ? 'mills' : 'qr',
    )
  }

  return currentImplementation === 'qr' ? (
    <ScannerQr close={close} label={label} onData={onData} onError={onError} onSwitch={handleSwitch} />
  ) : currentImplementation === 'qrmini' ? (
    <ScannerQrMini close={close} label={label} onData={onData} onError={onError} onSwitch={handleSwitch} />
  ) : (
    <ScannerMills close={close} label={label} onData={onData} onError={onError} onSwitch={handleSwitch} />
  )
}

function ScannerMills({ close, label, onData, onError, onSwitch }: ScannerProps) {
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  let camera: any
  let canvas: QRCanvas
  let cancel: () => void

  useEffect(() => {
    const startCameraCapture = async () => {
      if (!videoRef.current) return
      try {
        if (canvas) canvas.clear()
        canvas = new QRCanvas()
        camera = await frontalCamera(videoRef.current)
        const devices = await camera.listDevices()
        await camera.setDevice(devices[devices.length - 1].deviceId)
        cancel = frameLoop(() => {
          const res = camera.readFrame(canvas)
          if (res) {
            onData(res)
            handleClose()
          }
        })
      } catch (e) {
        onError(extractError(e))
        setError(true)
      }
    }
    startCameraCapture()
  }, [videoRef])

  const stopScan = () => {
    if (cancel) cancel()
    if (camera) camera.stop()
  }

  const handleClose = () => {
    stopScan()
    close()
  }

  const handleSwitch = () => {
    stopScan()
    if (onSwitch) onSwitch()
  }

  return (
    <>
      <Header auxFunc={handleSwitch} auxText='M' text={label} back={handleClose} />
      <Content>
        <Padded>
          <ErrorMessage error={error} text='Camera not available' />
          <video style={videoStyle} ref={videoRef} />
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleClose} label='Cancel' />
      </ButtonsOnBottom>
    </>
  )
}

function ScannerQr({ calculateScanRegion, close, label, onData, onError, onSwitch }: ScannerProps) {
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScanner = useRef<QrScanner | null>(null)

  useEffect(() => {
    if (!videoRef.current) return
    qrScanner.current = new QrScanner(
      videoRef.current,
      (result) => {
        onData(result.data)
        handleClose()
      },
      {
        maxScansPerSecond: 100,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        onDecodeError: () => {},
        calculateScanRegion,
      },
    )
    let cancelled = false
    qrScanner.current.start().catch(async () => {
      // qr-scanner throws the same 'Camera not found.' whatever went wrong,
      // so the permission is what tells us if the user blocked the camera
      const text = cameraErrorText(await queryCameraPermission())
      if (cancelled) return
      onError(text)
      setError(text)
    })
    return () => {
      cancelled = true
      stopScan()
    }
  }, [attempt])

  const stopScan = () => {
    qrScanner.current?.destroy()
    qrScanner.current = null
  }

  const handleClose = () => {
    stopScan()
    close()
  }

  // re-prompts if the prompt was only dismissed, and picks up a permission
  // the user has just unblocked in the browser settings
  const handleRetry = () => {
    onError('')
    setError('')
    setAttempt((n) => n + 1)
  }

  const handleSwitch = () => {
    stopScan()
    if (onSwitch) onSwitch()
  }

  return (
    <>
      <Header auxFunc={handleSwitch} auxText={calculateScanRegion ? 'q' : 'Q'} text={label} back={handleClose} />
      <Content>
        <Padded>
          <ErrorMessage error={Boolean(error)} text={error} />
          <div id='video-wrapper'>{error ? null : <video id='qr-scanner' ref={videoRef} style={videoStyle} />}</div>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {error ? <Button onClick={handleRetry} label='Try again' /> : null}
        <Button onClick={handleClose} label='Cancel' secondary={Boolean(error)} />
      </ButtonsOnBottom>
    </>
  )
}

function ScannerQrMini({ close, label, onData, onError, onSwitch }: ScannerProps) {
  // Make scan region smaller to match better small qr codes
  const calculateScanRegion = (v: HTMLVideoElement): QrScanner.ScanRegion => {
    const smallestDimension = Math.min(v.videoWidth, v.videoHeight)
    const scanRegionSize = Math.round((1 / 4) * smallestDimension)
    let region: QrScanner.ScanRegion = {
      x: Math.round((v.videoWidth - scanRegionSize) / 2),
      y: Math.round((v.videoHeight - scanRegionSize) / 2),
      width: scanRegionSize,
      height: scanRegionSize,
    }
    return region
  }

  return (
    <ScannerQr
      close={close}
      label={label}
      onData={onData}
      onError={onError}
      onSwitch={onSwitch}
      calculateScanRegion={calculateScanRegion}
    />
  )
}
