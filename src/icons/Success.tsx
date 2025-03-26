export default function SuccessIcon({ small }: { small?: boolean }) {
  if (small) return <img height='96px' width='96px' src='/success-icon-rounded.png' />
  return <img height='144px' width='144px' src='/success-icon-rounded.png' />
}
