import Button from './Button'
import ButtonsOnBottom from './ButtonsOnBottom'
import Content from './Content'
import Error from './Error'
import Header from './Header'
import Padded from './Padded'
import { QRCanvas, frameLoop, frontalCamera } from 'qr/dom.js'
import { useRef, useEffect, useState } from 'react'

interface ScannerProps {
  close: () => void
  label: string
  setData: (arg0: string) => void
  setError: (arg0: string) => void
}

export default function Scanner({ close, label, setData }: ScannerProps) {
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
            setData(res)
            handleClose()
          }
        })
      } catch (e) {
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

  return (
    <>
      <Header text={label} back={handleClose} />
      <Content>
        <Padded>
          <Error error={error} text='Camera not available' />
          <video style={{ borderRadius: '0.5rem', margin: '0 auto' }} ref={videoRef} />
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleClose} label='Cancel' />
      </ButtonsOnBottom>
    </>
  )
}
