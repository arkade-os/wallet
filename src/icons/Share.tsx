export default function ShareIcon({ reversed }: { reversed?: boolean }) {
  return (
    <svg width='24' height='24' fill='none' viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M336 192h40a40 40 0 0140 40v192a40 40 0 01-40 40H136a40 40 0 01-40-40V232a40 40 0 0140-40h40M336 128l-80-80-80 80M256 321V48'
        stroke={reversed ? 'var(--ion-background-color)' : 'currentColor'}
        strokeWidth='32'
      />
    </svg>
  )
}
