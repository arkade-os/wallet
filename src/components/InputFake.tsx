import { TextSecondary } from './Text'

export default function InputFake({ text }: { text: string }) {
  const style = {
    backgroundColor: 'var(--dark10)',
    borderRadius: '0.5rem',
    color: 'var(--dark50)',
    alignItems: 'center',
    padding: '0.5rem',
    minHeight: '40px',
    display: 'flex',
    width: '100%',
  }

  return (
    <div style={style}>
      <TextSecondary wrap>{text}</TextSecondary>
    </div>
  )
}
