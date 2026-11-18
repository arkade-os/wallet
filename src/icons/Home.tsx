import Glyph from './Glyph'

interface HomeIconProps {
  size?: number
  strokeWidth?: number
}

export default function HomeIcon({ size = 24, strokeWidth = 1.75 }: HomeIconProps) {
  return <Glyph name='home' size={size} strokeWidth={strokeWidth} />
}
