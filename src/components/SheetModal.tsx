import { IonModal } from '@ionic/react'
import { useContext } from 'react'
import CloseIcon from '../icons/Close'
import { NavigationContext, Tabs } from '../providers/navigation'
import { hapticLight } from '../lib/haptics'

interface SheetModalProps {
  children?: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

export default function SheetModal({ children, isOpen, onClose }: SheetModalProps) {
  const { tab } = useContext(NavigationContext)
  const hasNavbar = [Tabs.Wallet, Tabs.Apps].includes(tab)

  const handleClose = () => {
    hapticLight()
    onClose()
  }

  const outerStyle: React.CSSProperties = {
    maxWidth: '640px',
    margin: '0 auto',
    width: '100%',
  }

  const innerStyle: React.CSSProperties = {
    backgroundColor: 'var(--ion-background-color)',
    borderRadius: '1.5rem 1.5rem 0 0',
    boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
    height: '100%',
    padding: '1.25rem',
    paddingTop: '0.75rem',
    paddingBottom: hasNavbar ? 'var(--pill-navbar-spacer)' : '2rem',
    width: '100%',
    position: 'relative',
  }

  const handleStyle: React.CSSProperties = {
    backgroundColor: 'var(--dark20)',
    borderRadius: '2px',
    height: '4px',
    margin: '0 auto 1rem',
    width: '36px',
  }

  const closeButtonStyle: React.CSSProperties = {
    alignItems: 'center',
    background: 'var(--dark05)',
    border: 'none',
    borderRadius: '50%',
    color: 'var(--ion-text-color)',
    cursor: 'pointer',
    display: 'flex',
    height: '32px',
    justifyContent: 'center',
    padding: 0,
    position: 'absolute',
    right: '1rem',
    top: '1rem',
    width: '32px',
  }

  return (
    <IonModal initialBreakpoint={1} backdropBreakpoint={0} isOpen={isOpen} onDidDismiss={handleClose}>
      <div style={outerStyle}>
        <div style={innerStyle}>
          <div style={handleStyle} />
          <button type='button' style={closeButtonStyle} onClick={handleClose} aria-label='Close'>
            <CloseIcon />
          </button>
          {children}
        </div>
      </div>
    </IonModal>
  )
}
