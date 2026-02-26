import { IonButton } from '@ionic/react'
import { ReactElement, useCallback, useState } from 'react'
import FlexRow from './FlexRow'
import ArrowIcon from '../icons/Arrow'
import { hapticTap } from '../lib/haptics'

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
}: ButtonProps) {
  const [pressed, setPressed] = useState(false)

  const variant = red ? 'red' : secondary ? 'secondary' : clear ? 'clear' : outline ? 'outline' : 'dark'
  const className = `${variant}${pressed ? ' pressed' : ''}`

  const handlePressStart = useCallback(() => {
    if (disabled || loading) return
    setPressed(true)
  }, [disabled, loading])

  const handlePressEnd = useCallback(() => {
    setPressed(false)
  }, [])

  const handleClick = useCallback(
    (event: any) => {
      hapticTap()
      onClick(event)
    },
    [onClick],
  )

  return (
    <IonButton
      className={className}
      disabled={disabled}
      fill={clear ? 'clear' : outline ? 'outline' : 'solid'}
      onClick={handleClick}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      style={{ margin: '4px 0' }}
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
