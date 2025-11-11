import { ReactNode } from 'react'

interface ShadowProps {
  border?: boolean
  borderPurple?: boolean
  children: ReactNode
  fat?: boolean
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
  border,
  borderPurple,
  children,
  fat,
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
            ? 'var(--magenta)'
            : 'var(--dark05)',
    border: border ? `1px solid var(--${borderPurple ? 'purple' : 'dark10'})` : undefined,
    borderRadius: squared ? undefined : '0.5rem',
    color: purple ? 'white' : '',
    cursor: onClick ? 'pointer' : undefined,
    padding: slim ? '0.25rem' : fat ? '1rem' : '0.5rem',
    width: flex ? undefined : '100%',
  }

  return (
    <div style={style} onClick={onClick}>
      {children}
    </div>
  )
}
