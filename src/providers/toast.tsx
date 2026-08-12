import { Toaster } from 'sonner'

function getNotchSize() {
  const el = document.createElement('div')
  // Assign safe area insets to temporary element
  el.style.paddingTop = 'env(safe-area-inset-top)'
  el.style.paddingRight = 'env(safe-area-inset-right)'
  el.style.position = 'fixed'
  el.style.visibility = 'hidden'
  document.body.appendChild(el)

  const style = window.getComputedStyle(el)
  const topInset = parseInt(style.paddingTop, 10) || 0
  const rightInset = parseInt(style.paddingRight, 10) || 0 // Landscape orientation cutout

  document.body.removeChild(el)

  // Typical devices without a notch return 0px (or status bar height handled by system frame)
  // Devices with a notch/dynamic island return a non-zero inset (e.g., 44px, 47px, 59px)
  return topInset + rightInset
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const notchSize = getNotchSize()
  return (
    <>
      {children}
      <Toaster
        visibleToasts={1}
        className='arkade-toast-toaster'
        position='top-center'
        offset={notchSize}
        richColors
        toastOptions={{
          classNames: {
            content: 'arkade-toast-content',
          },
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
