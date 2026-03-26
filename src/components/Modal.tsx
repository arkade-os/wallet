import { Dialog, DialogContent } from './ui/dialog'

interface ModalProps {
  children: React.ReactNode
  onClose?: () => void
}

export default function Modal({ children, onClose }: ModalProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent showCloseButton={false} className='max-w-[min(22rem,90%)] p-4 rounded-lg border border-dark-10'>
        {children}
      </DialogContent>
    </Dialog>
  )
}
