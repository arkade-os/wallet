import { hapticLight } from '../lib/haptics'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

interface SheetModalProps {
  children?: React.ReactNode
  isOpen: boolean
  onClose: () => void
  /** Names the dialog for assistive tech when its heading is not a DrawerTitle. */
  ariaLabel?: string
}

export default function SheetModal({ ariaLabel, children, isOpen, onClose }: SheetModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      hapticLight()
      onClose()
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent aria-label={ariaLabel} className='mx-auto max-w-[640px]'>
        <div className='w-full px-5 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]'>{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
