import { Share } from 'lucide-react'

export default function ShareIcon({ reversed }: { reversed?: boolean }) {
  return <Share size={24} strokeWidth={1.75} color={reversed ? 'var(--ion-background-color)' : 'currentColor'} />
}
