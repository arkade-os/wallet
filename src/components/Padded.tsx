import { ReactNode } from 'react'

interface PaddedProps {
  children: ReactNode
}

export default function Padded({ children }: PaddedProps) {
  const style: React.CSSProperties = {
    boxSizing: 'border-box',
    padding: '0 1rem',
    height: '100%',
    width: '100%',
  }
  return <div style={style}>{children}</div>
}
