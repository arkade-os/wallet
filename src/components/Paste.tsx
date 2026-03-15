import { IonCol, IonGrid, IonRow } from '@ionic/react'
import PasteIcon from '../icons/Paste'
import FlexRow from './FlexRow'
import Text from './Text'
import Shadow from './Shadow'
import { hapticLight } from '../lib/haptics'

interface PasteProps {
  data: string
  onClick: () => void
}

export default function Paste({ data, onClick }: PasteProps) {
  const gridStyle = {
    padding: '0',
    cursor: 'pointer',
  }

  const handleClick = () => {
    hapticLight()
    onClick()
  }

  return (
    <Shadow lighter onClick={handleClick}>
      <IonGrid style={gridStyle}>
        <IonRow>
          <IonCol size='7'>
            <FlexRow>
              <PasteIcon />
              <Text smaller>Paste from clipboard</Text>
            </FlexRow>
          </IonCol>
          <IonCol size='5'>
            <Text right color='dark50' smaller>
              {data}
            </Text>
          </IonCol>
        </IonRow>
      </IonGrid>
    </Shadow>
  )
}
