import { IonModal } from '@ionic/react'
import CloseIcon from '../icons/Close'

interface SheetModalProps {
  children?: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

export default function SheetModal({ children, isOpen, onClose }: SheetModalProps) {
  return (
    <IonModal initialBreakpoint={1} isOpen={isOpen} onDidDismiss={onClose}>
      <div
        style={{
          borderTop: '1px solid var(--dark50)',
          borderRadius: '1rem',
          height: '100%',
          padding: '1rem',
          paddingBottom: '2rem',
        }}
      >
        <div style={{ cursor: 'pointer', position: 'absolute', right: '1rem', top: '1rem' }} onClick={onClose}>
          <CloseIcon />
        </div>
        {children}
      </div>
    </IonModal>
  )
}
