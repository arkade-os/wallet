import { ReactNode } from 'react'

interface FlexRowProps {
  alignItems?: string
  between?: boolean
  children: ReactNode
  centered?: boolean
  color?: string
  end?: boolean
  gap?: string
  onClick?: () => void
}

export default function FlexRow({ alignItems, between, centered, children, color, end, gap, onClick }: FlexRowProps) {
  const justifyContent = between ? 'space-between' : centered ? 'center' : end ? 'end' : 'start'
  const style = {
    alignItems: alignItems ?? 'center',
    color: color ? `var(--${color})` : 'inherit',
    cursor: onClick ? 'pointer' : 'inherit',
    display: 'flex',
    gap: gap ?? '.5rem',
    justifyContent,
    width: end ? undefined : '100%',
  }
  return (
    <div style={style} onClick={onClick}>
      {children}
    </div>
  )
}
