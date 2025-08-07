import Header from './Header'
import Padded from './Padded'
import Button from './Button'
import Content from './Content'
import { useState } from 'react'
import ButtonsOnBottom from './ButtonsOnBottom'
import BarcodeScanner from 'react-qr-barcode-scanner'

interface ScannerProps {
  label: string
  close: () => void
  setData: (arg0: string) => void
  setError: (arg0: string) => void
}

export default function Scanner({ label, close, setData, setError }: ScannerProps) {
  const [stopStream, setStopStream] = useState(false)

  const handleClose = () => {
    setStopStream(true)
    close()
  }

  const handleError = (error: any) => {
    setError(error.message || 'An error occurred while scanning')
    handleClose()
  }

  const handleUpdate = (err: any, result: any) => {
    if (result) {
      setData(result.getText())
      handleClose()
      setError('')
    }
  }

  return (
    <>
      <Header text={label} back={handleClose} />
      <Content>
        <Padded>
          <BarcodeScanner
            delay={300}
            width={500}
            height={500}
            onError={handleError}
            onUpdate={handleUpdate}
            stopStream={stopStream}
          />
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleClose} label='Cancel' />
      </ButtonsOnBottom>
    </>
  )
}
