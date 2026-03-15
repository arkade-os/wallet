import { ReactNode } from 'react'

interface FlexColProps {
  between?: boolean
  border?: boolean
  centered?: boolean
  children: ReactNode
  end?: boolean
  gap?: string
  margin?: string
  padding?: string
  strech?: boolean
  testId?: string
}

export default function FlexCol({
  between,
  border,
  centered,
  children,
  end,
  gap,
  margin,
  padding,
  strech,
  testId,
}: FlexColProps) {
  const style: any = {
    alignItems: centered ? 'center' : end ? 'end' : strech ? 'strech' : 'start',
    borderBottom: border ? '1px solid var(--dark20)' : undefined,
    display: 'flex',
    flexDirection: 'column',
    gap: gap ?? '1rem',
    height: between ? '100%' : undefined,
    justifyContent: between ? 'space-between' : undefined,
    margin,
    padding,
    width: '100%',
  }

  return (
    <div data-testid={testId ?? ''} style={style}>
      {children}
    </div>
  )
}
