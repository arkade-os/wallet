import { hapticLight } from '../lib/haptics'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

interface SheetModalProps {
  children?: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

export default function SheetModal({ children, isOpen, onClose }: SheetModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      hapticLight()
      onClose()
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className='mx-auto max-w-[640px] overflow-hidden'>
        <div className='max-h-[calc(80vh-1.25rem)] min-h-0 w-full overflow-y-auto overscroll-contain px-5 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]'>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
