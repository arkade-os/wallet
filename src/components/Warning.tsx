import ForbidIcon from '../icons/Forbid'
import { InfoIconDark } from '../icons/Info'
import FlexRow from './FlexRow'
import Text from './Text'

interface WarningProps {
  green?: boolean
  red?: boolean
  text: string
}

export default function WarningBox({ green, red, text }: WarningProps) {
  const backgroundColor = red ? 'var(--redbg)' : green ? 'var(--greenbg)' : 'var(--orangebg)'
  const Icon = () => (red ? <ForbidIcon /> : <InfoIconDark />)
  const color = red || green ? 'white' : 'var(--orange)'

  const style: React.CSSProperties = {
    backgroundColor,
    borderRadius: '0.5rem',
    color,
    padding: '0.75rem 1rem',
    width: '100%',
  }

  return (
    <div style={style}>
      <FlexRow alignItems='flex-start' gap='1rem'>
        <div style={{ color }}>
          <Icon />
        </div>
        <Text small wrap>
          {text}
        </Text>
      </FlexRow>
    </div>
  )
}
