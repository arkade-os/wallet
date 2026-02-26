import { Lock } from 'lucide-react'

export default function LockIcon({ big }: { big?: boolean }) {
  return <Lock size={big ? 40 : 20} strokeWidth={1.75} />
}
