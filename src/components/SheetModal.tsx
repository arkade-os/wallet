import { IonModal } from '@ionic/react'
import { hapticLight } from '../lib/haptics'

interface SheetModalProps {
  children?: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

export default function SheetModal({ children, isOpen, onClose }: SheetModalProps) {
<<<<<<< HEAD
  const outerStyle: React.CSSProperties = {
    maxWidth: '640px',
    margin: '0 auto',
    width: '100%',
  }

  const innerStyle: React.CSSProperties = {
    backgroundColor: 'var(--ion-background-color)',
    borderTop: '1px solid var(--dark50)',
    borderRadius: '1rem',
    height: '100%',
    padding: '1rem',
    paddingBottom: '2rem',
    width: '100%',
    position: 'relative',
    overflowY: 'auto',
    wordBreak: 'break-word',
  }

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--ion-text-color)',
    cursor: 'pointer',
    padding: 0,
    position: 'absolute',
    right: '1rem',
    top: '1rem',
=======
  const handleClose = () => {
    hapticLight()
    onClose()
>>>>>>> a3fc66c2 (Receive v2 (#512))
  }

  return (
    <IonModal initialBreakpoint={1} backdropBreakpoint={0} isOpen={isOpen} onDidDismiss={handleClose}>
      <div style={outerStyle}>
        <div
          style={{
            ...innerStyle,
            paddingBottom: '2rem',
          }}
        >
          <div style={handleAreaStyle} onClick={handleClose}>
            <div style={handleStyle} />
          </div>
          {children}
        </div>
      </div>
    </IonModal>
  )
}

const outerStyle: React.CSSProperties = {
  maxWidth: '640px',
  margin: '0 auto',
  width: '100%',
}

const innerStyle: React.CSSProperties = {
  padding: '0 1.25rem',
  width: '100%',
}

const handleAreaStyle: React.CSSProperties = {
  padding: '12px 0 20px',
  cursor: 'grab',
}

const handleStyle: React.CSSProperties = {
  backgroundColor: 'var(--dark20)',
  borderRadius: '100px',
  height: '5px',
  margin: '0 auto',
  width: '40px',
}
