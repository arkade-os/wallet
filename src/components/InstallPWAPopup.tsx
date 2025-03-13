import React, { useEffect, useState, useRef } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import ArkadeOnGrid from '../icons/ArkadeOnGrid'
import { add, close, shareOutline } from 'ionicons/icons'

interface InstallPWAPopupProps {
  onClose: () => void
}

export default function InstallPWAPopup({ onClose }: InstallPWAPopupProps) {
  const [isVisible, setIsVisible] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Handle keyboard navigation and accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Focus trap inside the popup
    if (popupRef.current) {
      popupRef.current.focus()
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    // Animate in after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    // Animate out
    setIsVisible(false)

    // Wait for animation to complete before calling onClose
    setTimeout(onClose, 300)
  }

  return (
    <div
      style={{
        position: 'absolute',
        width: '358px',
        bottom: '65px',
        left: 'calc(50% - 179px)',
        background: '#010101',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        padding: '22px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 1000,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
      role='dialog'
      aria-modal='true'
      aria-labelledby='pwa-install-title'
      ref={popupRef}
      tabIndex={-1}
    >
      <IonButton
        style={
          {
            position: 'absolute',
            right: '16px',
            top: '16px',
            '--background': 'transparent',
            '--padding-start': '0',
            '--padding-end': '0',
          } as React.CSSProperties
        }
        fill='clear'
        onClick={handleClose}
        aria-label='Close popup'
      >
        <IonIcon icon={close} style={{ color: 'rgba(251, 251, 251, 0.5)' }} />
      </IonButton>

      <div style={{ marginBottom: '16px' }}>
        <ArkadeOnGrid />
      </div>

      <h2
        id='pwa-install-title'
        style={{
          fontSize: '16px',
          fontWeight: 590,
          color: '#FBFBFB',
          margin: '0 0 8px 0',
        }}
      >
        Install Arkade
      </h2>

      <p
        style={{
          fontSize: '14px',
          color: 'rgba(251, 251, 251, 0.7)',
          textAlign: 'center',
          margin: '0 0 16px 0',
        }}
      >
        Adding Arkade to Home enable push notifications and better user experience.
      </p>

      <div
        style={{
          fontSize: '14px',
          color: 'rgba(251, 251, 251, 0.7)',
          margin: '0 0 16px 0',
        }}
      >
        ↓ See how
      </div>

      <div
        style={{
          background: 'linear-gradient(180deg, rgba(251, 251, 251, 0.1) 0%, rgba(251, 251, 251, 0.07) 100%)',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '24px',
              height: '24px',
              background: 'rgba(251, 251, 251, 0.2)',
              borderRadius: '999px',
              marginRight: '12px',
            }}
          >
            1
          </div>
          <div style={{ color: '#FBFBFB', marginRight: '8px' }}>Tap</div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '8px',
              background: '#F6F6F6',
              borderRadius: '4px',
            }}
          >
            <IonIcon icon={shareOutline} style={{ color: '#000' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '24px',
              height: '24px',
              background: 'rgba(251, 251, 251, 0.2)',
              borderRadius: '999px',
              marginRight: '12px',
            }}
          >
            2
          </div>
          <div style={{ color: '#FBFBFB', marginRight: '8px' }}>Then</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px',
              background: '#F6F6F6',
              borderRadius: '8px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#000000', marginRight: '8px' }}>Add to Home Screen</span>
            <IonIcon icon={add} style={{ color: '#000' }} />
          </div>
        </div>
      </div>

      <div
        style={{
          width: '20px',
          height: '20px',
          background: '#010101',
          transform: 'rotate(45deg)',
          position: 'absolute',
          bottom: '-10px',
          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        }}
        aria-hidden='true'
      />
    </div>
  )
}
