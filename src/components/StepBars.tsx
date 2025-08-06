import { IonGrid, IonRow, IonCol } from '@ionic/react'

export default function StepBars({ active, length }: { active: number; length: number }) {
  const colSize = Math.floor(12 / length).toString()

  const style = (col: number) => ({
    backgroundColor: col === active ? `currentColor` : 'var(--dark30)',
    borderRadius: '3px',
    height: '0.25rem',
    width: '100%',
  })

  return (
    <IonGrid style={{ maxHeight: '1rem', width: '100%' }}>
      <IonRow>
        {Array.from({ length }, (_, i) => (
          <IonCol size={colSize} key={i}>
            <div style={style(i + 1)} />
          </IonCol>
        ))}
      </IonRow>
    </IonGrid>
  )
}
