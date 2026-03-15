import { ReactNode } from 'react'

interface ShadowProps {
  border?: boolean
  borderPurple?: boolean
  children: ReactNode
  darkPurple?: boolean
  fat?: boolean
  flex?: boolean
  inverted?: boolean
  lighter?: boolean
  onClick?: () => void
  purple?: boolean
  red?: boolean
  slim?: boolean
  squared?: boolean
  testId?: string
}

export default function Shadow({
  border,
  borderPurple,
  children,
  darkPurple,
  fat,
  flex,
  inverted,
  lighter,
  onClick,
  purple,
  red,
  slim,
  squared,
  testId,
}: ShadowProps) {
  const style: React.CSSProperties = {
    backgroundColor: darkPurple
      ? 'var(--purplebg)'
      : purple
        ? 'var(--purple)'
        : red
          ? 'var(--red)'
          : lighter
            ? 'var(--dark05)'
            : inverted
              ? 'var(--magenta)'
              : 'var(--dark10)',
    border: border ? `1px solid var(--${borderPurple ? 'purple' : 'dark10'})` : undefined,
    borderRadius: squared ? undefined : '0.5rem',
    color: purple || darkPurple ? 'white' : '',
    cursor: onClick ? 'pointer' : undefined,
    overflow: 'hidden',
    padding: slim ? '0.25rem' : fat ? '1rem' : '0.5rem',
    width: flex ? undefined : '100%',
  }

  return (
    <div data-testid={testId} onClick={onClick} style={style}>
      {children}
    </div>
  )
}
