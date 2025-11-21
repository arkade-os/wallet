import { IonButton } from '@ionic/react'
import { ReactElement } from 'react'
import FlexRow from './FlexRow'
import ArrowIcon from '../icons/Arrow'

interface ButtonProps {
  clear?: boolean
  disabled?: boolean
  fancy?: boolean
  icon?: ReactElement
  label: string
  loading?: boolean
  main?: boolean
  onClick: (event: any) => void
  outline?: boolean
  red?: boolean
  secondary?: boolean
  small?: boolean
}

export default function Button({
  clear,
  disabled,
  fancy,
  icon,
  label,
  loading,
  main,
  onClick,
  outline,
  red,
  secondary,
  small,
}: ButtonProps) {
  return (
    <IonButton
      className={red ? 'red' : secondary ? 'secondary' : clear ? 'clear' : outline ? 'outline' : 'dark'}
      disabled={disabled}
      fill={clear ? 'clear' : outline ? 'outline' : 'solid'}
      onClick={onClick}
      size={small ? 'small' : 'default'}
    >
      {loading ? (
        <FlexRow centered>
          <div className='spinner' />
        </FlexRow>
      ) : fancy ? (
        <FlexRow between>
          <FlexRow>
            {icon}
            {label}
          </FlexRow>
          <ArrowIcon />
        </FlexRow>
      ) : (
        <FlexRow main={main} centered>
          {icon}
          {label}
        </FlexRow>
      )}
    </IonButton>
  )
}
