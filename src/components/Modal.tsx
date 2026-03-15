import { useEffect } from 'react'

export default function Modal({ children }: { children: React.ReactNode }) {
  const overlayStyle = {
    top: '0',
    left: '0',
    zIndex: 21,
    opacity: 0.5,
    width: '100%',
    height: '100%',
    position: 'absolute' as 'absolute',
    backgroundColor: 'var(--ion-background-color)',
  }

  const containerStyle = {
    top: '0',
    left: '0',
    zIndex: 22, // Higher than overlay
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute' as 'absolute',
    pointerEvents: 'none' as 'none', // Allow clicks to pass through to children
  }

  const innerStyle = {
    opacity: 1,
    padding: '1rem',
    maxWidth: 'min(22rem, 90%)',
    borderRadius: '0.5rem',
    border: '1px solid var(--dark10)',
    backgroundColor: 'var(--ion-background-color)',
    pointerEvents: 'auto' as 'auto', // Enable clicks on the modal content
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

  return (
    <>
      <div style={overlayStyle} />
      <div style={containerStyle}>
        <div style={innerStyle}>{children}</div>
      </div>
    </>
  )
}
