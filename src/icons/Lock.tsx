export default function LockIcon({ big }: { big?: boolean }) {
  const size = big ? '40' : '20'
  return (
    <svg width={size} height={size} viewBox='0 0 49 49' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M30.5 4.5H18.5V8.5H14.5V16.5H8.5V44.5H40.5V16.5H34.5V8.5H30.5V4.5ZM30.5 8.5V16.5H18.5V8.5H30.5ZM18.5 20.5H36.5V40.5H12.5V20.5H18.5ZM26.5 26.5H22.5V34.5H26.5V26.5Z'
        fill='currentColor'
      />
    </svg>
  )
}
