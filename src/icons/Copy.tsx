import Glyph from './Glyph'

export default function CopyIcon({ small }: { small?: boolean }) {
  return <Glyph name='copy' size={small ? 16 : 20} />
}
