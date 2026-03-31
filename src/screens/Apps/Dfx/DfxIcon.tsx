export default function DfxIcon({ big }: { big?: boolean }) {
  const size = big ? 78 : 55
  return (
    <svg width={size} height={size} viewBox='0 0 116 95' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M69.19 0H34.25V19.21H63.51C78.98 19.21 91.63 31.86 91.63 47.33C91.63 62.8 78.98 75.45 63.51 75.45H34.25V94.67H68.1C94.54 94.67 115.98 73.24 115.98 46.79C115.98 20.34 95.03 0 69.19 0Z'
        fill='var(--black)'
      />
      <path
        d='M47.98 70.3101C61.1575 70.3101 71.84 59.6276 71.84 46.4501C71.84 33.2726 61.1575 22.5901 47.98 22.5901C34.8025 22.5901 24.12 33.2726 24.12 46.4501C24.12 59.6276 34.8025 70.3101 47.98 70.3101Z'
        fill='url(#dfx-grad1)'
      />
      <path
        d='M26.25 73.5801C40.7475 73.5801 52.5 61.8276 52.5 47.3301C52.5 32.8326 40.7475 21.0801 26.25 21.0801C11.7525 21.0801 0 32.8326 0 47.3301C0 61.8276 11.7525 73.5801 26.25 73.5801Z'
        fill='url(#dfx-grad2)'
      />
      <defs>
        <linearGradient id='dfx-grad1' x1='68.008' y1='36.012' x2='25.602' y2='57.882' gradientUnits='userSpaceOnUse'>
          <stop offset='0.04' stopColor='#F5516C' />
          <stop offset='0.14' stopColor='#C74863' />
          <stop offset='0.31' stopColor='#853B57' />
          <stop offset='0.44' stopColor='#55324E' />
          <stop offset='0.55' stopColor='#382D49' />
          <stop offset='0.61' stopColor='#2D2B47' />
        </linearGradient>
        <linearGradient id='dfx-grad2' x1='42.26' y1='28.25' x2='8.51' y2='68.47' gradientUnits='userSpaceOnUse'>
          <stop offset='0.2' stopColor='#F5516C' />
          <stop offset='1' stopColor='#6B3753' />
        </linearGradient>
      </defs>
    </svg>
  )
}
