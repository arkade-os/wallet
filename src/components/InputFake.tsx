import { TextSecondary } from './Text'

export default function InputFake({ text, testId }: { text: string; testId: string }) {
  const style: React.CSSProperties = {
    backgroundColor: 'var(--neutral-100)',
    borderRadius: '0.5rem',
    color: 'var(--neutral-500)',
    alignItems: 'center',
    padding: '0.5rem',
    minHeight: '40px',
    display: 'flex',
    width: '100%',
  }

  return (
    <div style={style} data-testid={testId}>
      <TextSecondary wrap>{text}</TextSecondary>
    </div>
  )
}
