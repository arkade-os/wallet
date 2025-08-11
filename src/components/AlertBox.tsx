import React from 'react'
import { LogoIconAnimated } from '../icons/Logo'
import MegaphoneIcon from '../icons/Megaphone'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import Text from './Text'

interface AlertBoxProps {
  children: React.ReactNode
  icon: React.ReactNode
  onClick?: () => void
  onClose?: () => void
}

function AlertBox({ children, icon, onClick, onClose }: AlertBoxProps) {
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
    close: {
      padding: '2px',
      borderRadius: '10px',
      backgroundColor: 'var(--dark20)',
      fontSize: '12px',
      height: '20px',
      width: '20px',
      textAlign: 'center',
      alignItems: 'center',
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
          {onClick ? (
            <div style={style.close} onClick={onClose}>
              x
            </div>
          ) : null}
        </FlexRow>
      </div>
    </div>
  )
}

function AlertText({ children }: { children: React.ReactNode }) {
  return (
    <Text color='black' bold smaller wrap>
      {children}
    </Text>
  )
}

export function InfoBox({ text }: { text: string }) {
  return (
    <AlertBox icon={<MegaphoneIcon animated />}>
      <AlertText>{text}</AlertText>
    </AlertBox>
  )
}

export function WaitBox({ text }: { text: string }) {
  return (
    <div style={{ width: '304px' }}>
      <AlertBox icon={<LogoIconAnimated />}>
        <AlertText>{text}</AlertText>
      </AlertBox>
    </div>
  )
}

export function CreatePasswordWarning({ onClick, onClose }: { onClick: () => void; onClose: () => void }) {
  return (
    <AlertBox icon={<LogoIconAnimated />} onClick={onClick} onClose={onClose}>
      <FlexCol>
        <AlertText>Protect your wallet with a password</AlertText>
      </FlexCol>
    </AlertBox>
  )
}
