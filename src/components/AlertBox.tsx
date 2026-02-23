import React from 'react'
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

function AlertBox({ children, icon, onClick, onDismiss }: AlertBoxProps) {
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
    <Text color='black' bold smaller wrap heading>
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
    <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 512 512' onClick={onClick}>
      <path
        fill='currentColor'
        d='M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48Zm75.31 260.69a16 16 0 1 1-22.62 22.62L256 278.63l-52.69 52.68a16 16 0 0 1-22.62-22.62L233.37 256l-52.68-52.69a16 16 0 0 1 22.62-22.62L256 233.37l52.69-52.68a16 16 0 0 1 22.62 22.62L278.63 256Z'
      />
    </svg>
  )
}
