import Glyph from './Glyph'

export default function CheckMarkIcon({ small = false }: { small?: boolean }) {
  return <Glyph name='check' size={small ? 16 : 20} strokeWidth={2.25} />
}
