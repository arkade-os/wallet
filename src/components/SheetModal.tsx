import { IonModal } from '@ionic/react'
import CloseIcon from '../icons/Close'

interface SheetModalProps {
  children?: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

export default function SheetModal({ children, isOpen, onClose }: SheetModalProps) {
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
  }

  const closeButtonStyle: React.CSSProperties = {
    cursor: 'pointer',
    position: 'absolute',
    right: '1rem',
    top: '1rem',
  }

  return (
    <IonModal initialBreakpoint={1} isOpen={isOpen} onDidDismiss={onClose}>
      <div style={outerStyle}>
        <div style={innerStyle}>
          <button
            type="button"
            style={{ ...closeButtonStyle, background: 'none', border: 'none', padding: 0 }}
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
          {children}
        </div>
      </div>
    </IonModal>
  )
}
