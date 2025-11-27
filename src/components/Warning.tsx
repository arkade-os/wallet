import ForbidIcon from '../icons/Forbid'
import InfoIcon, { InfoIconDark } from '../icons/Info'
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
  const Icon = () => (red ? <ForbidIcon /> : <InfoIconDark />)

  const style = {
    backgroundColor,
    borderRadius: '0.5rem',
    color: 'var(--orange)',
    padding: '0.75rem 1rem',
    width: '100%',
  }

  return (
    <div style={style}>
      <FlexRow alignItems='flex-start' gap='1rem'>
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
