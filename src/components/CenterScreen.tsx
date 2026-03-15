import { ReactNode } from 'react'

interface CenterScreenProps {
  children: ReactNode
  gap?: string
  onClick?: () => void
}

export default function CenterScreen({ children, gap, onClick }: CenterScreenProps) {
  const style: any = {
    alignItems: 'center',
    cursor: onClick ? 'pointer' : 'default',
    display: 'flex',
    flexDirection: 'column',
    gap: gap ?? '1rem',
    height: '100%',
    justifyContent: 'center',
    margin: 'auto',
    maxWidth: '18rem',
    paddingBottom: '5rem',
  }

  return (
    <div onClick={onClick} style={style}>
      {children}
    </div>
  )
}
