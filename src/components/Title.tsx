import type { CSSProperties } from 'react'

interface TitleProps {
  text: string
}

export default function Title({ text }: TitleProps) {
  const style: CSSProperties = {
    margin: '0',
    fontFamily: 'var(--heading-font)',
    fontSize: '24px',
    fontWeight: 500,
    letterSpacing: '-0.5px',
    lineHeight: '1.2',
  }
  return <h1 style={style}>{text}</h1>
}
