import Glyph from './Glyph'

export default function ArrowIcon({ small }: { small?: boolean }) {
  return <Glyph name='chevronRight' size={small ? 14 : 16} strokeWidth={2.25} />
}
