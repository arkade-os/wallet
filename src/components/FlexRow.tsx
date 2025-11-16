import { ReactNode } from 'react'

interface FlexRowProps {
  alignItems?: string
  between?: boolean
  border?: boolean
  children: ReactNode
  centered?: boolean
  color?: string
  end?: boolean
  gap?: string
  main?: boolean
  onClick?: () => void
  padding?: string
}

export default function FlexRow({
  alignItems,
  between,
  border,
  centered,
  children,
  color,
  end,
  gap,
  main,
  onClick,
  padding,
}: FlexRowProps) {
  const justifyContent = between ? 'space-between' : centered ? 'center' : end ? 'end' : 'start'
  const style = {
    alignItems: alignItems ?? 'center',
    borderBottom: border ? '1px solid var(--dark20)' : undefined,
    color: color ? `var(--${color})` : 'inherit',
    cursor: onClick ? 'pointer' : 'inherit',
    display: 'flex',
    gap: gap ?? '.5rem',
    justifyContent,
    minHeight: main ? '20px' : undefined,
    padding,
    width: end ? undefined : '100%',
  }
  return (
    <div style={style} onClick={onClick}>
      {children}
    </div>
  )
}
