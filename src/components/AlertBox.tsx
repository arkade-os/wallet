import React from 'react'
import { X } from 'lucide-react'
import { LogoIconAnimated } from '../icons/Logo'
import MegaphoneIcon from '../icons/Megaphone'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import Text from './Text'
import DOMPurify from 'dompurify'

interface AlertBoxProps {
  children: React.ReactNode
  icon: React.ReactNode
  onClick?: () => void
  onDismiss?: () => void
}

export default function AlertBox({ children, icon, onClick, onDismiss }: AlertBoxProps) {
  const style: Record<string, React.CSSProperties> = {
    alert: {
      backgroundColor: 'var(--purple20)',
      border: '1px solid var(--dark20)',
      borderRadius: '0.5rem',
      padding: '0.5rem',
      cursor: onClick ? 'pointer' : 'default',
      color: 'white',
      width: '100%',
    },
    icon: {
      backgroundColor: 'var(--purple)',
      borderRadius: '6px',
      padding: '5px',
    },
  }

  return (
    <div style={{ padding: '2px', width: '100%' }}>
      <div style={style.alert}>
        <FlexRow between gap='0.5rem'>
          <FlexRow gap='0.5rem' onClick={onClick}>
            <div style={style.icon}>{icon}</div>
            {children}
          </FlexRow>
          {onDismiss ? <CloseIcon onClick={onDismiss} /> : null}
        </FlexRow>
      </div>
    </div>
  )
}

function AlertText({ children }: { children: React.ReactNode }) {
  return (
    <Text color='black' medium smaller wrap heading>
      {children}
    </Text>
  )
}

export function InfoBox({ html }: { html: string }) {
  const sanitizedHtml = DOMPurify.sanitize(html)
  const style: React.CSSProperties = {
    color: 'var(--black)',
    fontSize: '13px',
    fontWeight: 600,
    lineHeight: 1.5,
  }
  return (
    <AlertBox icon={<MegaphoneIcon animated />}>
      <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} style={style} />
    </AlertBox>
  )
}

export function CreatePasswordWarning({ onClick, onDismiss }: { onClick: () => void; onDismiss: () => void }) {
  return (
    <AlertBox icon={<LogoIconAnimated />} onClick={onClick} onDismiss={onDismiss}>
      <FlexCol>
        <AlertText>Protect your wallet with a password</AlertText>
      </FlexCol>
    </AlertBox>
  )
}

function CloseIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      type='button'
      aria-label='Dismiss'
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '44px',
        minHeight: '44px',
        margin: '-0.5rem -0.25rem -0.5rem 0',
        cursor: 'pointer',
        flexShrink: 0,
        touchAction: 'manipulation',
        background: 'transparent',
        border: 0,
        padding: 0,
      }}
    >
      <X size={18} color='var(--black)' aria-hidden='true' />
    </button>
  )
}
