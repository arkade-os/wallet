import { IonGrid, IonRow, IonCol } from '@ionic/react'
import Text from './Text'
import FlexRow from './FlexRow'

const getColor = (strength: number): string => {
  if (strength <= 1) return 'red'
  if (strength < 4) return 'orange'
  return 'green'
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
  const style = (col: number) => ({
    backgroundColor: col < strength ? `var(--${getColor(strength)})` : '',
    border: '1px solid var(--dark20)',
    height: '0.5rem',
    width: '100%',
  })

  return (
    <IonGrid style={{ width: '100%' }}>
      <IonRow>
        <IonCol size='3'>
          <div style={style(0)} />
        </IonCol>
        <IonCol size='3'>
          <div style={style(1)} />
        </IonCol>
        <IonCol size='3'>
          <div style={style(2)} />
        </IonCol>
        <IonCol size='3'>
          <div style={style(3)} />
        </IonCol>
      </IonRow>
    </IonGrid>
  )
}
