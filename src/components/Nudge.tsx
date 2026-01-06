import Text from './Text'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import { useContext } from 'react'
import { CloseIconMini } from '../icons/Close'
import { Nudge, NudgeContext } from '../providers/nudge'
import Focusable from './Focusable'

export default function NudgeComponent({ nudge }: { nudge: Nudge }) {
  const { removeNudge } = useContext(NudgeContext)

  const style = {
    color: 'var(--white)',
    padding: '0.7rem 1rem',
    borderRadius: '0.5rem',
    backgroundColor: 'var(--nudgebg)',
  }

  const handleClose = () => {
    removeNudge(nudge)
  }

  return (
    <Focusable onEnter={handleClose} round>
      <div style={style}>
        <FlexRow between>
          <FlexCol gap='0'>
            {nudge.texts.map((text) => (
              <Text key={text} bold smaller wrap>
                {text}
              </Text>
            ))}
          </FlexCol>
          <CloseIconMini onClick={handleClose} />
        </FlexRow>
      </div>
    </Focusable>
  )
}
