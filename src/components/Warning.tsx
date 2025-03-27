import ForbidIcon from '../icons/Forbid'
import InfoIcon from '../icons/Info'
import FlexRow from './FlexRow'
import Text from './Text'

interface WarningProps {
  green?: boolean
  red?: boolean
  text: string
}

export default function WarningBox({ green, red, text }: WarningProps) {
  const backgroundColor = red ? 'var(--redbg)' : green ? 'var(--greenbg)' : 'var(--orangebg)'
  const borderColor = red ? 'var(--red)' : green ? 'var(--green)' : 'var(--orange)'
  const Icon = () => (red ? <ForbidIcon /> : <InfoIcon />)

  const style = {
    backgroundColor,
    border: `1px solid ${borderColor}`,
    borderRadius: '0.5rem',
    color: 'white',
    padding: '1rem',
    width: '100%',
  }

  return (
    <div style={style}>
      <FlexRow gap='1rem'>
        <div style={{ color: borderColor }}>
          <Icon />
        </div>
        <Text small wrap>
          {text}
        </Text>
      </FlexRow>
    </div>
  )
}
