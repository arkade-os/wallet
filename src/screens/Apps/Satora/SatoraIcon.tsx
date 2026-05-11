export default function SatoraIcon({ big }: { big?: boolean }) {
  const size = big ? 78 : 55
  return (
    <svg width={size} height={size} viewBox='0 0 139 139' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <circle cx='69.5' cy='69.5' r='69.5' className='fill-[#A3E635] dark:fill-[#C2E821]' />
    </svg>
  )
}
