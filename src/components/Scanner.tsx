import Button from './Button'
import ButtonsOnBottom from './ButtonsOnBottom'
import Content from './Content'
import ErrorMessage from './Error'
import Header from './Header'
import Padded from './Padded'
import { QRCanvas, frameLoop, frontalCamera } from 'qr/dom.js'
import { useCallback, useRef, useEffect, useState } from 'react'
import { extractError } from '../lib/error'
import { bytesToLatin1 } from '../lib/seedQr'
import QrScanner from 'qr-scanner'

const videoStyle: React.CSSProperties = {
  borderRadius: '0.5rem',
  margin: '0 auto',
}

interface ScannerProps {
  /**
   * Decode byte-mode payloads losslessly instead of as UTF-8, and pass them up
   * latin1-encoded (one character per byte). Needed by CompactSeedQR, which is
   * raw entropy: a UTF-8 decoder replaces invalid sequences with U+FFFD and
   * destroys the seed. Binary mode pins the engine, so there is nothing to
   * switch between and the aux button disappears.
   */
  binary?: boolean
  close: () => void
  label: string
  onData: (arg0: string) => void
  onError: (arg0: string) => void
  onSwitch?: () => void
  calculateScanRegion?: (v: HTMLVideoElement) => QrScanner.ScanRegion
}

export default function Scanner({ binary, close, label, onData, onError }: ScannerProps) {
  const [currentImplementation, setCurrentImplementation] = useState<'qr' | 'qrmini' | 'mills'>('qr')

  const handleSwitch = () => {
    setCurrentImplementation(
      currentImplementation === 'qr' ? 'qrmini' : currentImplementation === 'qrmini' ? 'mills' : 'qr',
    )
  }

  if (binary) return <ScannerMills binary close={close} label={label} onData={onData} onError={onError} />

  return currentImplementation === 'qr' ? (
    <ScannerQr close={close} label={label} onData={onData} onError={onError} onSwitch={handleSwitch} />
  ) : currentImplementation === 'qrmini' ? (
    <ScannerQrMini close={close} label={label} onData={onData} onError={onError} onSwitch={handleSwitch} />
  ) : (
    <ScannerMills close={close} label={label} onData={onData} onError={onError} onSwitch={handleSwitch} />
  )
}

function ScannerMills({ binary, close, label, onData, onError, onSwitch }: ScannerProps) {
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Held in refs, not locals: the camera is started once inside an effect, but
  // every later render rebuilt plain locals as undefined, so closing the scanner
  // from a re-rendered tree left the stream running.
  const cameraRef = useRef<Awaited<ReturnType<typeof frontalCamera>> | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  // Callers pass inline closures, so read them through a ref: in the deps array
  // they would tear down and restart the camera on every parent render.
  const handlers = useRef({ close, onData, onError })
  handlers.current = { close, onData, onError }

  const stopScan = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
    cameraRef.current?.stop()
    cameraRef.current = null
  }, [])

  useEffect(() => {
    let unmounted = false

    const startCameraCapture = async () => {
      if (!videoRef.current) return
      try {
        // Byte segments come back latin1-encoded so raw payloads survive intact;
        // ASCII (mnemonics, UR Bytewords, SeedQR digits) is unaffected by it.
        const canvas = new QRCanvas(undefined, binary ? { textDecoder: bytesToLatin1 } : undefined)
        const camera = await frontalCamera(videoRef.current)
        if (unmounted) return camera.stop()
        cameraRef.current = camera
        cancelRef.current = frameLoop(() => {
          const res = camera.readFrame(canvas)
          if (res) {
            stopScan()
            handlers.current.onData(res)
            handlers.current.close()
          }
        })
      } catch (e) {
        if (unmounted) return
        handlers.current.onError(extractError(e))
        setError(true)
      }
    }

    startCameraCapture()
    return () => {
      unmounted = true
      stopScan()
    }
  }, [binary, stopScan])

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
      <Header
        auxFunc={onSwitch ? handleSwitch : undefined}
        auxText={onSwitch ? 'M' : undefined}
        text={label}
        back={handleClose}
      />
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
      <Header auxFunc={handleSwitch} auxText={calculateScanRegion ? 'q' : 'Q'} text={label} back={handleClose} />
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
