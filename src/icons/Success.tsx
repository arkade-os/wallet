export default function SuccessIcon({ small }: { small?: boolean }) {
  const size = small ? 20 : 30
  return (
    <span className={`success-mark${small ? ' success-mark--small' : ''}`} aria-hidden='true'>
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
        <path d='m5 12.5 4.5 4.500L19 7.500' pathLength='1' />
      </svg>
    </span>
  )
}
