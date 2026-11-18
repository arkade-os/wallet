import { Toaster, toast } from 'sonner'
import './Toast.css'

export { toast }

export const useToast = () => ({ toast })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        visibleToasts={1}
        className='arkade-toast-toaster'
        position='top-center'
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
