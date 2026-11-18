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
