import { ReactNode } from 'react'

interface ShadowProps {
  children: ReactNode
  flex?: boolean
  inverted?: boolean
  lighter?: boolean
  onClick?: () => void
  red?: boolean
  slim?: boolean
  squared?: boolean
}

export default function Shadow({ children, flex, inverted, lighter, onClick, red, slim, squared }: ShadowProps) {
  const style = {
    backgroundColor: red ? 'var(--red)' : lighter ? 'var(--dark05)' : inverted ? 'currentColor' : 'var(--dark10)',
    borderRadius: squared ? undefined : '0.5rem',
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
