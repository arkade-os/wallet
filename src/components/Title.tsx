interface TitleProps {
  text: string
}

export default function Title({ text }: TitleProps) {
  const style: React.CSSProperties = { margin: '0' }
  return <h1 style={style}>{text}</h1>
}
