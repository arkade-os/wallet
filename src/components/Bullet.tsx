export default function Bullet({ number }: { number: number }) {
  const style = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '1.5rem',
    height: '1.5rem',
    background: 'var(--magenta)',
    borderRadius: '999px',
  } as React.CSSProperties
  return <div style={style}>{number}</div>
}
