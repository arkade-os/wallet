export default function ExternalLinkIcon({ small }: { small?: boolean }) {
  const size = small ? 12 : 16
  return (
    <svg
      height={size}
      width={size}
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      style={{ marginLeft: '0.25rem', verticalAlign: 'middle' }}
      aria-label='Open in explorer'
      role='img'
    >
      <path
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3'
      />
    </svg>
  )
}
