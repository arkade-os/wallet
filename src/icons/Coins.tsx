export default function CoinsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <circle cx='8' cy='8' r='6' stroke='currentColor' strokeWidth='1.75' />
      <path d='M18.09 10.37A6 6 0 1 1 10.34 18' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' />
      <path d='M7 6h2M8 8V6' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' />
    </svg>
  )
}
