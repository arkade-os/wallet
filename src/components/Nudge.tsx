import FlexCol from './FlexCol'
import { useContext } from 'react'
import { AlertBox, AlertText } from './AlertBox'
import { RedDotIconAnimated } from '../icons/RedDot'
import { Nudge, NudgeContext } from '../providers/nudge'

export default function NudgeComponent({ nudge }: { nudge: Nudge }) {
  const { removeNudge } = useContext(NudgeContext)

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
