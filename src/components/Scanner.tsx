import Button from './Button'
import ButtonsOnBottom from './ButtonsOnBottom'
import Content from './Content'
import ErrorMessage from './Error'
import Header from './Header'
import Padded from './Padded'
import { QRCanvas, frameLoop, frontalCamera } from 'qr/dom.js'
import { useRef, useEffect, useState } from 'react'
import { extractError } from '../lib/error'
import { QrReader } from 'react-qr-reader'

interface ScannerProps {
  close: () => void
  label: string
  onData: (arg0: string) => void
  onError: (arg0: string) => void
  onSwitch?: () => void
}

export default function Scanner({ close, label, onData, onError }: ScannerProps) {
  const [currentImplementation, setCurrentImplementation] = useState<'mills' | 'react'>('react')

  const handleSwitch = () => {
    setCurrentImplementation(currentImplementation === 'mills' ? 'react' : 'mills')
  }

  return currentImplementation === 'mills' ? (
    <ScannerMills close={close} label={label} onData={onData} onError={onError} onSwitch={handleSwitch} />
  ) : (
    <ScannerReact close={close} label={label} onData={onData} onError={onError} onSwitch={handleSwitch} />
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

    return () => handleClose()
  }, [videoRef])

  const handleClose = () => {
    if (!cancel && !error) return
    if (cancel) cancel()
    camera?.stop()
    close()
  }

  const videoStyle: React.CSSProperties = {
    border: '1px solid var(--purple)',
    borderRadius: '0.5rem',
    margin: '0 auto',
  }

  return (
    <>
      <Header auxFunc={onSwitch} auxText='M' text={label} back={handleClose} />
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

function ScannerReact({ label, close, onData, onError, onSwitch }: ScannerProps) {
  return (
    <>
      <Header auxFunc={onSwitch} auxText='R' text={label} back={close} />
      <Content>
        <Padded>
          <QrReader
            onResult={(result, error) => {
              if (result) onData(result.getText())
              if (error) onError(error.message)
            }}
            constraints={{ facingMode: 'environment' }}
          />
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={close} label='Cancel' />
      </ButtonsOnBottom>
    </>
  )
}
