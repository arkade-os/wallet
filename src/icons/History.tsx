import Glyph from './Glyph'

interface HistoryIconProps {
  size?: number
  strokeWidth?: number
}

export default function HistoryIcon({ size = 24, strokeWidth = 1.75 }: HistoryIconProps) {
  return <Glyph name='clock' size={size} strokeWidth={strokeWidth} />
}
