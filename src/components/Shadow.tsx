import { ReactNode } from 'react'

interface ShadowProps {
  children: ReactNode
  flex?: boolean
  inverted?: boolean
  lighter?: boolean
  onClick?: () => void
  purple?: boolean
  red?: boolean
  slim?: boolean
  squared?: boolean
}

export default function Shadow({
  children,
  flex,
  inverted,
  lighter,
  onClick,
  purple,
  red,
  slim,
  squared,
}: ShadowProps) {
  const style = {
    backgroundColor: purple
      ? 'var(--purplebg)'
      : red
      ? 'var(--red)'
      : lighter
      ? 'var(--dark05)'
      : inverted
      ? 'var(--tatiana)'
      : 'var(--dark10)',
    borderRadius: squared ? undefined : '0.5rem',
    color: purple ? 'white' : '',
    cursor: onClick ? 'pointer' : undefined,
    padding: slim ? '0.25rem' : '0.5rem',
    width: flex ? undefined : '100%',
  }

  return (
    <div style={style} onClick={onClick}>
      {children}
    </div>
  )
}
