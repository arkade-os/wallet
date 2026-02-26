import { Megaphone } from 'lucide-react'

interface MegaphoneProps {
  animated?: boolean
}

export default function MegaphoneIcon({ animated }: MegaphoneProps) {
  const style: React.CSSProperties = {
    animation: animated ? 'var(--animation-pulse)' : 'none',
  }
  return (
    <span style={style}>
      <Megaphone size={14} strokeWidth={1.75} color='white' />
    </span>
  )
}
