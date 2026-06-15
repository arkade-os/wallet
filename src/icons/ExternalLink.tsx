export default function ExternalLinkIcon({ small }: { small?: boolean }) {
  const size = small ? 16 : 24
  return (
    <svg
      fill='none'
      width={size}
      height={size}
      stroke-width='2'
      viewBox='0 0 24 24'
      stroke='currentColor'
      stroke-linecap='round'
      stroke-linejoin='round'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6' />
      <path d='m21 3-9 9' />
      <path d='M15 3h6v6' />
    </svg>
  )
}
