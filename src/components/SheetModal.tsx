import { hapticLight } from '../lib/haptics'
import { BottomSheet } from 'react-spring-bottom-sheet'
import 'react-spring-bottom-sheet/dist/style.css'

interface SheetModalProps {
  children?: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

export default function SheetModal({ children, isOpen, onClose }: SheetModalProps) {
  const handleClose = () => {
    hapticLight()
    onClose()
  }

  return (
    <BottomSheet open={isOpen} onDismiss={handleClose} header={null}>
      <div style={outerStyle}>
        <div style={innerStyleWithSafeArea}>{children}</div>
      </div>
    </BottomSheet>
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

const innerStyleWithSafeArea: React.CSSProperties = {
  ...innerStyle,
  paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
}
