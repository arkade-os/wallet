import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ children }: { children: React.ReactNode }) {
  const overlayStyle = {
    top: '0',
    left: '0',
    zIndex: 80,
    opacity: 0.5,
    width: '100%',
    height: '100%',
    position: 'fixed' as 'fixed',
    backgroundColor: 'var(--ion-background-color)',
  }

  const containerStyle = {
    top: '0',
    left: '0',
    zIndex: 90,   
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'fixed' as 'fixed',
    pointerEvents: 'none' as 'none', 
  }

  const innerStyle = {
    opacity: 1,
    padding: '1rem',
    maxWidth: 'min(22rem, 90%)',
    maxHeight: 'calc(100vh - 4rem)', 
    position: 'relative' as 'relative', 
    display: 'flex' as 'flex',
    flexDirection: 'column' as 'column',
    overflowY: 'auto' as 'auto', 
    borderRadius: '0.5rem',
    border: '1px solid var(--dark10)',
    backgroundColor: 'var(--ion-background-color)',
    pointerEvents: 'auto' as 'auto', 
    zIndex: 95,
  }

  useEffect(() => {
    const rolesToBlur = ['banner', 'main', 'tablist']
    for (const role of rolesToBlur) {
      const element = document.querySelector(`[role="${role}"]`) as HTMLElement
      if (element) element.style.filter = 'blur(10px)'
    }
    return () => {
      for (const role of rolesToBlur) {
        const element = document.querySelector(`[role="${role}"]`) as HTMLElement
        if (element) element.style.filter = 'none'
      }
    }
  }, [])

  return createPortal(
    <>
      <div style={overlayStyle} />
      <div style={containerStyle}>
        <div style={innerStyle} className='modal-inner'>
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
