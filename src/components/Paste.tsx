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
  const handleClick = () => {
    hapticLight()
    onClick()
  }

  return (
    <Shadow lighter onClick={handleClick}>
      <div style={{ display: 'flex', padding: 0, cursor: 'pointer' }}>
        <div style={{ flex: 7 }}>
          <FlexRow>
            <PasteIcon />
            <Text smaller>Paste from clipboard</Text>
          </FlexRow>
        </div>
        <div style={{ flex: 5 }}>
          <Text right color='dark50' smaller>
            {data}
          </Text>
        </div>
      </div>
    </Shadow>
  )
}
