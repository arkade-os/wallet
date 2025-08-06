import MegaphoneIcon from '../icons/Megaphone'
import FlexRow from './FlexRow'
import Text from './Text'

interface AlertProps {
  text: string
}

export default function AlertBox({ text }: AlertProps) {
  const style = {
    backgroundColor: 'var(--purple20)',
    borderRadius: '0.5rem',
    padding: '0.5rem',
    color: 'white',
    width: '100%',
  }

  return (
    <div style={{ padding: '2px', width: '100%' }}>
      <div style={style}>
        <FlexRow gap='0.5rem'>
          <MegaphoneIcon />
          <Text bold color='white' tiny wrap>
            {text}
          </Text>
        </FlexRow>
      </div>
    </div>
  )
}
