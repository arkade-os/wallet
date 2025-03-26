import { IonButton } from '@ionic/react'
import { ReactElement } from 'react'

interface ButtonProps {
  clear?: boolean
  disabled?: boolean
  icon?: ReactElement
  label: string
  onClick: (event: any) => void
  purple?: boolean
  red?: boolean
  secondary?: boolean
  short?: boolean
  small?: boolean
}

export default function Button({
  clear,
  disabled,
  icon,
  label,
  onClick,
  purple,
  red,
  secondary,
  short,
  small,
}: ButtonProps) {
  return (
    <IonButton
      className={red ? 'red' : purple ? 'purple' : secondary ? 'secondary' : clear ? 'clear' : 'dark'}
      disabled={disabled}
      expand={short ? undefined : 'block'}
      fill={secondary ? 'outline' : clear ? 'clear' : 'solid'}
      onClick={onClick}
      size={small ? 'small' : 'default'}
    >
      {icon}
      {label}
    </IonButton>
  )
}
