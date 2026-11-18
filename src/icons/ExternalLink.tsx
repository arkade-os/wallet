import Glyph from './Glyph'

export default function ExternalLinkIcon({ small }: { small?: boolean }) {
  return <Glyph name='external' size={small ? 16 : 20} />
}
