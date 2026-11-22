import { useEffect, useRef } from 'react'
import { hapticLight } from '../lib/haptics'
import { holdBackLayer } from '../providers/navigation'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

interface SheetModalProps {
  children?: React.ReactNode
  isOpen: boolean
  onClose: () => void
  labelledBy?: string
}

export default function SheetModal({ children, isOpen, onClose, labelledBy }: SheetModalProps) {
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!isOpen) return
    return holdBackLayer(() => close.current())
  }, [isOpen])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      hapticLight()
      onClose()
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className='mx-auto max-w-[640px]' aria-labelledby={labelledBy}>
        <div className='w-full px-4 pt-3 pb-5'>{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
