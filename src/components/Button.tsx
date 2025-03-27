import { IonButton } from '@ionic/react'
import { ReactElement } from 'react'
import FlexRow from './FlexRow'

interface ButtonProps {
  clear?: boolean
  disabled?: boolean
  fancy?: boolean
  icon?: ReactElement
  label: string
  onClick: (event: any) => void
  red?: boolean
  secondary?: boolean
  short?: boolean
  small?: boolean
}

export default function Button({
  clear,
  disabled,
  fancy,
  icon,
  label,
  onClick,
  red,
  secondary,
  short,
  small,
}: ButtonProps) {
  return (
    <IonButton
      className={red ? 'red' : secondary ? 'secondary' : clear ? 'clear' : 'dark'}
      disabled={disabled}
      expand={short ? undefined : 'block'}
      fill={clear ? 'clear' : 'solid'}
      onClick={onClick}
      size={small ? 'small' : 'default'}
    >
      {fancy ? (
        <FlexRow between>
          <div>
            {icon}
            {label}
          </div>
          <p>&gt;</p>
        </FlexRow>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </IonButton>
  )
}
