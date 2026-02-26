import { Plus } from 'lucide-react'

export default function AddIcon({ reversed }: { reversed?: boolean }) {
  return <Plus size={24} strokeWidth={1.75} color={reversed ? 'var(--ion-background-color)' : 'currentColor'} />
}
