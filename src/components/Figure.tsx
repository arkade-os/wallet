import { useContext } from 'react'
import { ConfigContext } from '../providers/config'

/**
 * A money figure with its minor units set back: "$4,385" in ink and ".00" in
 * grey, so the eye lands on the part that matters. Strings without a
 * two-digit fraction render unchanged.
 */
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

/**
 * A figure that honours "Show balances". The amount behind a review or success
 * sheet is as visible as the one inside it, so it has to hide with it.
 */
export function PrivateFigure({ value, masked = '•••••' }: { value: string; masked?: string }) {
  const { config } = useContext(ConfigContext)
  const shown = config.showBalance ? value : masked
  return (
    // The length lets the figure size itself to the width it has (see .figure-fit).
    <span className='figure-fit' style={{ '--amount-chars': Math.max(shown.length, 1) } as React.CSSProperties}>
      {config.showBalance ? <Figure value={value} /> : masked}
    </span>
  )
}
