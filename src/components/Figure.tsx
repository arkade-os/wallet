import { useContext } from 'react'
import { ConfigContext } from '../providers/config'

export default function Figure({ value }: { value: string }) {
  const match = /^(.*\d)([.,]\d{2})(\D*)$/.exec(value)
  if (!match) return <>{value}</>
  return (
    <>
      {match[1]}
      <span className='figure__minor'>{match[2]}</span>
      {match[3]}
    </>
  )
}

export function PrivateFigure({ value, masked = '•••••' }: { value: string; masked?: string }) {
  const { config } = useContext(ConfigContext)
  const shown = config.showBalance ? value : masked
  return (
    <span className='figure-fit' style={{ '--amount-chars': Math.max(shown.length, 1) } as React.CSSProperties}>
      {config.showBalance ? <Figure value={value} /> : masked}
    </span>
  )
}
