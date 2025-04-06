import encodeQR from '@paulmillr/qr'
import FlexCol from './FlexCol'

interface QrCodeProps {
  value: string
}

export default function QrCode({ value }: QrCodeProps) {
  // encode value to a gif
  const qrGifDataUrl = (text: string) => {
    const gifBytes = encodeQR(text, 'gif', { scale: 7 })
    const blob = new Blob([gifBytes], { type: 'image/gif' })
    return URL.createObjectURL(blob)
  }

  return (
    <FlexCol centered>
      {value ? (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1rem',
            maxWidth: '100%',
            width: '420px',
          }}
        >
          <img src={qrGifDataUrl(value)} alt='QR Code' style={{ margin: '0 auto', width: '100%' }} />
        </div>
      ) : null}
    </FlexCol>
  )
}
