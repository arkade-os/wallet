export default function ReceivedIcon({ dotted }: { dotted?: boolean }) {
  const strokeDasharray = dotted ? '3' : '0'
  return (
    <svg width='40' height='41' viewBox='0 0 40 41' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect y='0.5' width='40' height='40' rx='20' fill='var(--green)' fillOpacity='0.1' />
      <g
        stroke='var(--green)'
        strokeDasharray={strokeDasharray}
        strokeWidth='2'
        fill='none'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        {/* Vertical line */}
        <line x1='20' y1='13' x2='20' y2='27' />
        {/* Arrow head */}
        <line x1='14' y1='21' x2='20' y2='27' />
        <line x1='26' y1='21' x2='20' y2='27' />
      </g>
    </svg>
  )
}
