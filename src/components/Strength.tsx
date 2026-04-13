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
    <Text smaller color='dark50'>
      Strength:
    </Text>
    <Text smaller color={getColor(strength)}>
      {getWord(strength)}
    </Text>
  </FlexRow>
)

export default function StrengthBars({ strength }: { strength: number }) {
  const style = (col: number): React.CSSProperties => ({
    backgroundColor: col < strength ? `var(--${getColor(strength)})` : '',
    border: '1px solid var(--dark20)',
    height: '0.5rem',
    width: '100%',
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', width: '100%' }}>
      <div style={style(0)} />
      <div style={style(1)} />
      <div style={style(2)} />
      <div style={style(3)} />
    </div>
  )
}

export function StrengthProgress({ strength }: { strength: number }) {
  const color = getColor(strength)
  const value = Math.min(strength * 0.25, 1)
  return (
    <div style={{ width: '100%', height: '4px', background: 'var(--dark10)', borderRadius: '2px' }}>
      <div
        style={{
          width: `${value * 100}%`,
          height: '100%',
          background: `var(--${color})`,
          borderRadius: '2px',
          transition: 'width 200ms ease-out',
        }}
      />
    </div>
  )
}
