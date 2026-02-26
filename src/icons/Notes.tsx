import { Ticket } from 'lucide-react'

export default function NotesIcon({ small = false }: { small?: boolean }) {
  return <Ticket size={small ? 18 : 20} strokeWidth={1.75} />
}
