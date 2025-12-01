export default function RedDotIcon() {
  const style = {
    marginLeft: '-0.5rem',
  }
  return (
    <svg
      fill='none'
      width='1rem'
      height='1rem'
      style={style}
      viewBox='0 0 21 21'
      data-testid='red-dot-icon'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle cx='10' cy='10' r='3' fill='var(--red)' />
    </svg>
  )
}

export function RedDotIconAnimated() {
  const style = {
    animation: 'var(--animation-pulse)',
  }
  return (
    <svg width='14' height='14' viewBox='0 0 35 35' fill='none' style={style} xmlns='http://www.w3.org/2000/svg'>
      <circle cx='17.5' cy='17.5' r='17.5' fill='var(--red)' />
    </svg>
  )
}
