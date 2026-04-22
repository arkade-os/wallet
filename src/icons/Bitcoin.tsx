interface BitcoinIconProps {
  size?: number
}

export default function BitcoinIcon({ size = 24 }: BitcoinIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.5 5.5V4M9.5 20v-1.5M14.5 5.5V4M14.5 20v-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 8.5h8.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5H7V8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 13.5h9c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5H7v-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 8.5V5.5M7 18.5v-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
