import Text from './Text'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import Focusable from './Focusable'
import { hapticLight } from '../lib/haptics'

interface ToggleProps {
  checked: boolean
  onClick: () => void
  subtext?: string
  text: string
  testId?: string
}

export default function Toggle({ checked, onClick, text, subtext, testId }: ToggleProps) {
  const handleClick = () => {
    console.log('Toggle clicked, new value:', !checked)
    hapticLight()
    onClick()
  }

  return (
    <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
      <FlexRow between>
        <Text thin>{text}</Text>
        <Focusable onEnter={handleClick} fit round>
          <div className='cl-toggle-switch'>
            <label className='cl-switch'>
              <input type='checkbox' checked={checked} data-testid={testId} readOnly onClick={handleClick} />
              <span />
            </label>
          </div>
        </Focusable>
      </FlexRow>
      {subtext ? (
        <Text color='dark50' small thin wrap>
          {subtext}
        </Text>
      ) : null}
    </FlexCol>
  )
}
