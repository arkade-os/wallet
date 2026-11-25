import { useEffect, useRef } from 'react'
import { hapticLight } from '../lib/haptics'
import { holdBackLayer } from '../providers/navigation'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

interface SheetModalProps {
  ariaLabel?: string
  children?: React.ReactNode
  isOpen: boolean
  labelledBy?: string
  onClose: () => void
}

export default function SheetModal({ ariaLabel, children, isOpen, labelledBy, onClose }: SheetModalProps) {
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
      <DrawerContent aria-label={ariaLabel} aria-labelledby={labelledBy} className='mx-auto max-w-[640px]'>
        <div className='w-full px-5 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]'>{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
