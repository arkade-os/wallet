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
      <DrawerContent className='mx-auto max-w-[640px]'>
        <div className='w-full px-4 pt-3 pb-5'>{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
