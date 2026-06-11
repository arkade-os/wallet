import { ReactNode } from 'react'

interface ShadowProps {
  border?: boolean
  borderPurple?: boolean
  children: ReactNode
  dangerBorder?: boolean
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
  dangerBorder,
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
            ? 'var(--neutral-50)'
            : inverted
              ? 'var(--magenta)'
              : 'var(--neutral-100)',
    border: dangerBorder
      ? '1px solid var(--danger)'
      : border
        ? `1px solid var(--${borderPurple ? 'purple' : 'neutral-100'})`
        : undefined,
    borderRadius: squared ? undefined : '0.5rem',
    boxShadow: dangerBorder ? '0 0 0 1px color-mix(in srgb, var(--danger) 20%, transparent)' : undefined,
    color: purple || darkPurple ? 'white' : '',
    cursor: onClick ? 'pointer' : undefined,
    overflow: 'hidden',
    padding: slim ? '0.25rem' : fat ? '1rem' : '0.5rem',
    transition: dangerBorder ? 'border-color 150ms ease, box-shadow 150ms ease' : undefined,
    width: flex ? undefined : '100%',
  }

  return (
    <div data-testid={testId} onClick={onClick} style={style}>
      {children}
    </div>
  )
}
