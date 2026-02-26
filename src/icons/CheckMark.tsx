import { Check } from 'lucide-react'

export default function CheckMarkIcon({ small = false }: { small?: boolean }) {
  return <Check size={small ? 20 : 24} strokeWidth={1.75} />
}
