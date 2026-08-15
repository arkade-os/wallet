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
        {/* DrawerContent is a flex column capped at 80vh. A flex child will not
            shrink below its own content unless min-h-0 says it may, so without
            this the overflow is simply clipped and unreachable — on a short
            viewport, or with the keyboard up, that silently ate the price field
            and the submit button. overscroll-contain keeps a scroll at the end
            of the list from turning into a drag-dismiss of the whole sheet. */}
        <div className='w-full min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]'>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
