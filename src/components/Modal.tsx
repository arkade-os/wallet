import { IonBackdrop } from '@ionic/react'
import Content from './Content'

export default function Modal({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IonBackdrop visible tappable={false} />
      <div style={{ zIndex: 21 }}>{children}</div>
    </>
  )
}
