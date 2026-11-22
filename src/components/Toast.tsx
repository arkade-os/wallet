import { Toaster, toast } from 'sonner'
import './Toast.css'

export { toast }

export const useToast = () => ({ toast })

const OFFSET = { top: 'max(24px, calc(env(safe-area-inset-top, 0px) + 8px))' }
const MOBILE_OFFSET = { top: 'max(16px, calc(env(safe-area-inset-top, 0px) + 8px))' }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        visibleToasts={1}
        className='arkade-toast-toaster'
        position='top-center'
        offset={OFFSET}
        mobileOffset={MOBILE_OFFSET}
        richColors
        toastOptions={{
          classNames: {
            content: 'arkade-toast-content',
          },
          style: {
            background: 'var(--toast-bg, #1a1a1a)',
            color: 'var(--toast-color, #fafafa)',
            border: 'none',
            borderRadius: '999px',
            padding: '14px 20px',
            fontSize: '15px',
            fontWeight: 500,
            textAlign: 'center' as const,
            letterSpacing: '-0.01em',
            boxShadow: 'none',
          },
          duration: 2000,
        }}
      />
    </>
  )
}
