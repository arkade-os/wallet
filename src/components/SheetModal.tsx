import { useEffect, useRef } from 'react'
import { hapticLight } from '../lib/haptics'
import { isNativeHost } from '../lib/nativeBridge'
import { registerNativeBack } from '../lib/nativeBack'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

interface SheetModalProps {
  children?: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

export default function SheetModal({ children, isOpen, onClose }: SheetModalProps) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!isOpen || !isNativeHost()) return
    return registerNativeBack(() => close.current())
  }, [isOpen])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      hapticLight()
      onClose()
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className='mx-auto max-w-[640px]'>
        <div className='w-full px-5 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]'>{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
