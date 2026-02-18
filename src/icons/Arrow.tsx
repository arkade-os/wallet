export default function ArrowIcon({ small }: { small?: boolean }) {
  const size = small ? 8 : 12
  return (
    <svg height={size} width={size} viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
      <path fill='none' stroke='currentColor' strokeWidth='2' d='m7 2l10 10L7 22' />
    </svg>
  )
}
