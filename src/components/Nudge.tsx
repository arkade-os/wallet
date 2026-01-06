import FlexCol from './FlexCol'
import { useContext } from 'react'
import { AlertBox, AlertText } from './AlertBox'
import { RedDotIconAnimated } from '../icons/RedDot'
import { Nudge, NudgeContext } from '../providers/nudge'
import FlexRow from './FlexRow'
import Text from './Text'

function CloseIcon({ onClick }: { onClick: () => void }) {
  const style = {
    cursor: 'pointer',
  }
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 512 512'
      onClick={onClick}
      style={style}
    >
      <path
        fill='currentColor'
        d='M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48Zm75.31 260.69a16 16 0 1 1-22.62 22.62L256 278.63l-52.69 52.68a16 16 0 0 1-22.62-22.62L233.37 256l-52.68-52.69a16 16 0 0 1 22.62-22.62L256 233.37l52.69-52.68a16 16 0 0 1 22.62 22.62L278.63 256Z'
      />
    </svg>
  )
}

export default function NudgeComponent({ nudge }: { nudge: Nudge }) {
  const { removeNudge } = useContext(NudgeContext)

  const style = {
    padding: '0.7rem 1rem',
    color: 'var(--white)',
    borderRadius: '0.5rem',
    backgroundColor: 'var(--nudgebg)',
    marginBottom: '1rem',
  }
  return (
    <div style={style}>
      <FlexRow between>
        <FlexCol gap='0'>
          {nudge.texts.map((text) => (
            <Text bold smaller wrap>
              {text}
            </Text>
          ))}
        </FlexCol>
        <CloseIcon onClick={() => removeNudge(nudge)} />
      </FlexRow>
    </div>
  )
  return (
    <div style={{ marginBottom: '1rem' }}>
      <AlertBox icon={<RedDotIconAnimated />} onDismiss={() => removeNudge(nudge)}>
        <FlexCol gap='0'>
          {nudge.texts.map((text) => (
            <AlertText key={text}>{text}</AlertText>
          ))}
        </FlexCol>
      </AlertBox>
    </div>
  )
}
