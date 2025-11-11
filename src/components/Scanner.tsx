import Button from './Button'
import ButtonsOnBottom from './ButtonsOnBottom'
import Content from './Content'
import ErrorMessage from './Error'
import Header from './Header'
import Padded from './Padded'
import { QRCanvas, frameLoop, frontalCamera } from 'qr/dom.js'
import { useRef, useEffect, useState } from 'react'
import { extractError } from '../lib/error'
import QrScanner from 'qr-scanner'

const videoStyle: React.CSSProperties = {
  border: '1px solid var(--dark)',
  borderRadius: '0.5rem',
  margin: '0 auto',
}

interface ScannerProps {
  close: () => void
  label: string
  onData: (arg0: string) => void
  onError: (arg0: string) => void
  onSwitch?: () => void
}

export default function Scanner({ close, label, onData, onError }: ScannerProps) {
  const [currentImplementation, setCurrentImplementation] = useState<'qrscanner' | 'mills'>('qrscanner')

  const handleSwitch = () => {
    setCurrentImplementation(currentImplementation === 'qrscanner' ? 'mills' : 'qrscanner')
  }

  return currentImplementation === 'mills' ? (
    <ScannerMills close={close} label={label} onData={onData} onError={onError} onSwitch={handleSwitch} />
  ) : (
    <ScannerQr close={close} label={label} onData={onData} onError={onError} onSwitch={handleSwitch} />
  )
}

function ScannerQr({ close, label, onData, onError, onSwitch }: ScannerProps) {
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
    if (!qrScanner.current) {
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
          calculateScanRegion: (v) => {
            const smallestDimension = Math.min(v.videoWidth, v.videoHeight)
            // Make scan region smaller to match better small qr codes
            const scanRegionSize = Math.round((1 / 4) * smallestDimension)
            let region: QrScanner.ScanRegion = {
              x: Math.round((v.videoWidth - scanRegionSize) / 2),
              y: Math.round((v.videoHeight - scanRegionSize) / 2),
              width: scanRegionSize,
              height: scanRegionSize,
            }
            return region
          },
        },
      )
    }
    qrScanner.current.start().catch((err) => {
      onError(extractError(err))
      setError(true)
    })
    return () => stopScan()
  }, [hasCamera])

  const stopScan = () => {
    qrScanner.current?.destroy()
    qrScanner.current = null
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
      <Header auxFunc={handleSwitch} auxText='Q' text={label} back={handleClose} />
      <Content>
        <Padded>
          <ErrorMessage error={error} text='Camera not available' />
          <div id='video-wrapper'>
            <video id='qr-scanner' ref={videoRef} style={videoStyle} />
          </div>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleClose} label='Cancel' />
      </ButtonsOnBottom>
    </>
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
