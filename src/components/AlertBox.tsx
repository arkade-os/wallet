import React from 'react'
import FlexRow from './FlexRow'
import DOMPurify from 'dompurify'
import MegaphoneIcon from '../icons/Megaphone'
import { CloseIconMini } from '../icons/Close'

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
          {onDismiss ? <CloseIconMini onClick={onDismiss} /> : null}
        </FlexRow>
      </div>
    </div>
  )
}

export function InfoBox({ html }: { html: string }) {
  const sanitizedHtml = DOMPurify.sanitize(html)
  const style: React.CSSProperties = {
    color: 'var(--black)',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1.5,
  }
  return (
    <AlertBox icon={<MegaphoneIcon animated />}>
      <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} style={style} />
    </AlertBox>
  )
}
