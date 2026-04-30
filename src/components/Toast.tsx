import { Toaster, toast } from 'sonner'

// Re-export toast for direct usage
export { toast }

// Backward-compat hook - consumers can migrate to importing toast directly
export const useToast = () => ({ toast })

// Styled Toaster component - replaces ToastProvider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            background: 'var(--toast-bg, #1a1a1a)',
            color: 'var(--toast-color, #fafafa)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 20px',
            fontSize: '15px',
            fontWeight: 500,
            textAlign: 'center' as const,
            letterSpacing: '-0.01em',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.12)',
          },
          duration: 2000,
        }}
      />
    </>
  )
}
