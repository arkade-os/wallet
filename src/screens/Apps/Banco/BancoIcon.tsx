import { ArrowLeftRight } from 'lucide-react'

export default function BancoIcon({ big = false }: { big?: boolean }) {
  const size = big ? 40 : 28
  return <ArrowLeftRight size={size} strokeWidth={1.5} />
}
