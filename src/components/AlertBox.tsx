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
}

function AlertBox({ children, icon, onClick }: AlertBoxProps) {
  const style: { alert: React.CSSProperties; icon: React.CSSProperties } = {
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
      <div style={style.alert} onClick={onClick}>
        <FlexRow between gap='0.5rem'>
          <FlexRow gap='0.5rem'>
            <div style={style.icon}>{icon}</div>
            {children}
          </FlexRow>
          {onClick ? <GoIcon /> : null}
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

export function CreatePasswordWarning({ onClick }: { onClick: () => void }) {
  return (
    <AlertBox icon={<LogoIconAnimated />} onClick={onClick}>
      <FlexCol>
        <AlertText>
          You have a considerable amount of sats.
          <br />
          Protect your wallet with a password.
        </AlertText>
      </FlexCol>
    </AlertBox>
  )
}

function GoIcon() {
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M6.9987 0.730469C3.53539 0.730469 0.727863 3.53802 0.727863 7.0013C0.727863 10.4646 3.53539 13.2721 6.9987 13.2721C10.462 13.2721 13.2695 10.4646 13.2695 7.0013C13.2695 3.53802 10.462 0.730469 6.9987 0.730469ZM6.82096 4.61385C7.01194 4.35456 7.37676 4.29883 7.63616 4.48967C7.69409 4.53341 7.86979 4.66633 7.96826 4.74317C8.16455 4.89635 8.42806 5.10804 8.69344 5.33846C8.95594 5.56637 9.23346 5.82432 9.44995 6.06931C9.55758 6.19117 9.66276 6.32329 9.74389 6.45787C9.80647 6.56164 9.89071 6.7241 9.91081 6.91701L9.91536 7.0013C9.91536 7.23102 9.8154 7.42614 9.74389 7.54474C9.66276 7.67931 9.55758 7.81144 9.44995 7.93329C9.23346 8.17829 8.95594 8.43624 8.69344 8.66415C8.42806 8.89457 8.16455 9.10626 7.96826 9.25944C7.86979 9.33627 7.69409 9.46921 7.63616 9.51296C7.37676 9.70377 7.01141 9.64806 6.82037 9.38877C6.64146 9.14558 6.67932 8.80958 6.89842 8.61119C6.95215 8.57059 7.1576 8.4125 7.25046 8.33999C7.43701 8.19445 7.68394 7.99618 7.92894 7.78344C8.00506 7.71734 8.07932 7.65044 8.15113 7.58464H4.66536C4.34319 7.58464 4.08203 7.32348 4.08203 7.0013C4.08203 6.67913 4.34319 6.41797 4.66536 6.41797H8.15113C8.07932 6.35217 8.00506 6.28526 7.92894 6.21917C7.68394 6.00643 7.43701 5.80816 7.25046 5.6626C7.1576 5.59011 6.95215 5.43201 6.89842 5.39144C6.67926 5.19296 6.64181 4.85707 6.82096 4.61385Z'
        fill='var(--black)'
      />
    </svg>
  )
}
