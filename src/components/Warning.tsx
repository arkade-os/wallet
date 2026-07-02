import ForbidIcon from '../icons/Forbid'
import { InfoIconDark } from '../icons/Info'
import FlexRow from './FlexRow'
import Text from './Text'

interface WarningProps {
  green?: boolean
  small?: boolean
  red?: boolean
  text: string
}

export default function WarningBox({ green, red, small, text }: WarningProps) {
  const backgroundColor = red ? 'var(--redbg)' : green ? 'var(--greenbg)' : 'var(--orangebg)'
  const Icon = () => (red ? <ForbidIcon /> : <InfoIconDark />)
  const color = red || green ? 'white' : 'var(--orange)'

  const style: React.CSSProperties = {
    color,
    width: '100%',
    backgroundColor,
    borderRadius: '0.5rem',
    border: `1px solid ${color}`,
    padding: '0.75rem 1rem',
    margin: small ? '0 auto' : undefined,
    maxWidth: small ? '340px' : undefined,
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
