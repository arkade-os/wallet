import Text from './Text'
import FlexRow from './FlexRow'

const getColor = (strength: number): string => {
  if (strength <= 1) return 'danger'
  if (strength < 4) return 'warning'
  return 'success'
}

const getWord = (strength: number): string => {
  if (strength <= 1) return 'weak'
  if (strength < 4) return 'medium'
  return 'strong'
}

export const calcStrength = (pass: string): number => {
  let strength = pass.length * 0.25
  if (pass.match(/\d/)) strength += 1
  if (pass.match(/\W/)) strength += 1
  return strength
}

export const StrengthLabel = ({ strength }: { strength: number }): JSX.Element => (
  <FlexRow gap='0.25rem'>
    <Text smaller color='neutral-500'>
      Strength:
    </Text>
    <Text smaller color={getColor(strength)}>
      {getWord(strength)}
    </Text>
  </FlexRow>
)

export function StrengthBars({ strength }: { strength: number }) {
  const style = (col: number): React.CSSProperties => ({
    backgroundColor: col < strength ? `var(--${getColor(strength)})` : '',
    height: '4px',
    width: '100%',
  })

  return (
    <div style={{ width: '100%' }}>
      <FlexRow gap='0'>
        {[0, 1, 2, 3].map((col) => (
          <div key={col} style={style(col)} />
        ))}
      </FlexRow>
    </div>
  )
}
