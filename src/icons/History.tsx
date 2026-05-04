interface HistoryIconProps {
  size?: number
}

export default function HistoryIcon({ size = 24 }: HistoryIconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path d='M12 8v4l2.5 2.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
      <path
        d='M3.05 11a9 9 0 1 1 .5 4m-.5-4H6m-2.95 0V7'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
