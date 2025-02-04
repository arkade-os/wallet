import { ReactNode } from 'react'

interface FlexColProps {
  between?: boolean
  centered?: boolean
  children: ReactNode
  end?: boolean
  gap?: string
  margin?: string
  strech?: boolean
}

export default function FlexCol({ between, centered, children, end, gap, margin, strech }: FlexColProps) {
  const style: any = {
    alignItems: centered ? 'center' : end ? 'end' : strech ? 'strech' : 'start',
    display: 'flex',
    flexDirection: 'column',
    gap: gap ?? '1rem',
    height: between ? '100%' : undefined,
    justifyContent: between ? 'space-between' : undefined,
    margin,
    width: '100%',
  }

  return <div style={style}>{children}</div>
}
