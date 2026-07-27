import ErrorMessage from './Error'
import { QRCanvas, frameLoop, frontalCamera } from 'qr/dom.js'
import { useRef, useEffect, useState } from 'react'
import { extractError } from '../lib/error'
import QrScanner from 'qr-scanner'

const videoStyle: React.CSSProperties = {
  borderRadius: '0.5rem',
  margin: '0 auto',
}

export type ScannerImplementation = 'qr' | 'qrmini' | 'mills'

export const scannerImplementationLabel: Record<ScannerImplementation, string> = {
  qr: 'Q',
  qrmini: 'q',
  mills: 'M',
}

export const nextScannerImplementation = (implementation: ScannerImplementation): ScannerImplementation =>
  implementation === 'qr' ? 'qrmini' : implementation === 'qrmini' ? 'mills' : 'qr'

interface ScannerProps {
  implementation?: ScannerImplementation
  onData: (arg0: string) => void
  onError: (arg0: string) => void
}

interface ScannerViewProps {
  onData: (arg0: string) => void
  onError: (arg0: string) => void
  calculateScanRegion?: (v: HTMLVideoElement) => QrScanner.ScanRegion
}

// Make scan region smaller to match better small qr codes
const calculateMiniScanRegion = (v: HTMLVideoElement): QrScanner.ScanRegion => {
  const smallestDimension = Math.min(v.videoWidth, v.videoHeight)
  const scanRegionSize = Math.round((1 / 4) * smallestDimension)
  return {
    x: Math.round((v.videoWidth - scanRegionSize) / 2),
    y: Math.round((v.videoHeight - scanRegionSize) / 2),
    width: scanRegionSize,
    height: scanRegionSize,
  }
}

// Camera view only: renders the video feed and reports scanned data upwards.
// Chrome (modal, buttons, dismissal) is owned by the invoking component.
export default function Scanner({ implementation = 'qr', onData, onError }: ScannerProps) {
  return implementation === 'mills' ? (
    <ScannerMills key={implementation} onData={onData} onError={onError} />
  ) : (
    <ScannerQr
      key={implementation}
      onData={onData}
      onError={onError}
      calculateScanRegion={implementation === 'qrmini' ? calculateMiniScanRegion : undefined}
    />
  )
}

function ScannerMills({ onData, onError }: ScannerViewProps) {
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let camera: any
    let canvas: QRCanvas | undefined
    let cancel: (() => void) | undefined
    let cancelled = false

    const stopScan = () => {
      if (cancel) cancel()
      if (camera) camera.stop()
      if (canvas) canvas.clear()
    }

    const startCameraCapture = async () => {
      if (!videoRef.current) return
      try {
        canvas = new QRCanvas()
        camera = await frontalCamera(videoRef.current)
        if (cancelled) return stopScan()
        const devices = await camera.listDevices()
        await camera.setDevice(devices[devices.length - 1].deviceId)
        cancel = frameLoop(() => {
          const res = camera.readFrame(canvas)
          if (res) {
            stopScan()
            onData(res)
          }
        })
      } catch (e) {
        onError(extractError(e))
        setError(true)
      }
    }
    startCameraCapture()

    return () => {
      cancelled = true
      stopScan()
    }
  }, [videoRef])

  return (
    <>
      <ErrorMessage error={error} text='Camera not available' />
      <video style={videoStyle} ref={videoRef} />
    </>
  )
}

function ScannerQr({ calculateScanRegion, onData, onError }: ScannerViewProps) {
  const [error, setError] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScanner = useRef<QrScanner | null>(null)

  useEffect(() => {
    QrScanner.hasCamera().then(setHasCamera)
  }, [])

  useEffect(() => {
    if (!hasCamera) return
    if (!videoRef.current) return
    const stopScan = () => {
      qrScanner.current?.destroy()
      qrScanner.current = null
    }
    if (!qrScanner.current) {
      qrScanner.current = new QrScanner(
        videoRef.current,
        (result) => {
          stopScan()
          onData(result.data)
        },
        {
          maxScansPerSecond: 100,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          onDecodeError: () => {},
          calculateScanRegion,
        },
      )
    }
    qrScanner.current.start().catch((err) => {
      onError(extractError(err))
      setError(true)
    })
    return () => stopScan()
  }, [hasCamera])

  return (
    <>
      <ErrorMessage error={error} text='Camera not available' />
      <div id='video-wrapper'>
        <video id='qr-scanner' ref={videoRef} style={videoStyle} />
      </div>
    </>
  )
}
