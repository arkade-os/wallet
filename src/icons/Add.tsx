export default function AddIcon({ reversed }: { reversed?: boolean }) {
  return (
    <svg width='24' height='24' fill='none' viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M256 112v288M400 256H112'
        stroke={reversed ? 'var(--ion-background-color)' : 'currentColor'}
        strokeWidth='32'
      />
    </svg>
  )
}
