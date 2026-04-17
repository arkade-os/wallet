import { Drawer, DrawerContent, DrawerClose } from './ui/drawer'
import CloseIcon from '../icons/Close'
import { hapticLight } from '../lib/haptics'

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
    <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DrawerContent className='max-w-[640px] mx-auto'>
        <div
          style={{
            padding: '1rem',
            paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
            position: 'relative',
          }}
        >
          <DrawerClose
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--fg)',
              cursor: 'pointer',
              padding: 0,
              position: 'absolute',
              right: '1rem',
              top: '0.5rem',
            }}
            aria-label='Close'
          >
            <CloseIcon />
          </DrawerClose>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
