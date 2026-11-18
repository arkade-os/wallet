import { GlyphWell } from './Glyph'

export default function ReceivedIcon({ dotted }: { dotted?: boolean }) {
  return <GlyphWell name='arrowDown' dashed={dotted} />
}
