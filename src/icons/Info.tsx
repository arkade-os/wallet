import { Info } from 'lucide-react'

export default function InfoIcon({ color }: { color?: string }) {
  const stroke = color ? `var(--${color})` : 'currentColor'
  return <Info size={20} strokeWidth={1.75} color={stroke} />
}

export function InfoIconDark({ color }: { color?: string }) {
  return (
    <div style={{ color: color ? `var(--${color})` : 'currentColor' }}>
      <Info size={20} strokeWidth={2.5} />
    </div>
  )
}
