import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hapticLight } from '../lib/haptics'
import { holdBackLayer } from '../providers/navigation'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

interface SheetModalProps {
  children?: React.ReactNode
  isOpen: boolean
  onClose: () => void
  /** Id of the heading inside the sheet that names it for assistive technology. */
  labelledBy?: string
  /**
   * Something on the screen underneath that should stay in view while the sheet is up, such as the
   * code on Receive. The sheet stops just under it, and its content scrolls when it does not fit.
   */
  below?: React.RefObject<HTMLElement | null>
}

/** Space left between the element kept in view and the sheet's top edge. */
const GAP_BELOW_PX = 12

export default function SheetModal({ children, isOpen, onClose, labelledBy, below }: SheetModalProps) {
  const close = useRef(onClose)
  close.current = onClose
  const [top, setTop] = useState<number>()

  // Measured before the sheet paints, so it rises to the right height rather than resizing after.
  useLayoutEffect(() => {
    if (!isOpen || !below) return
    const measure = () => {
      const edge = below.current?.getBoundingClientRect().bottom
      setTop(edge === undefined ? undefined : Math.round(edge + GAP_BELOW_PX))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isOpen, below])

  // Back closes the sheet instead of leaving the screen underneath it.
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
      <DrawerContent
        className='mx-auto max-w-[640px]'
        aria-labelledby={labelledBy}
        style={below && top !== undefined ? ({ '--sheet-top': `${top}px` } as React.CSSProperties) : undefined}
      >
        <div className='sheet-modal__body w-full px-4 pt-3 pb-5'>{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
