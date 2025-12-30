import Text from './Text'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import { prettyLongText } from '../lib/format'
import { useState } from 'react'
import Focusable from './Focusable'
import { copyToClipboard } from '../lib/clipboard'
import { useIonToast } from '@ionic/react'
import { copiedToClipboard } from '../lib/toast'

export default function Table({ data }: { data: any[][] }) {
  const [focused, setFocused] = useState(false)

  const [present] = useIonToast()

  const copy = (value: string) => {
    copyToClipboard(value)
    present(copiedToClipboard)
  }

  const focusOnFirstRow = () => {
    setFocused(true)
    if (data.length === 0) return
    const id = data[0][0]
    const first = document.getElementById(id) as HTMLElement
    if (first) first.focus()
  }

  const focusOnOuterShell = () => {
    setFocused(false)
    const outer = document.getElementById('outer') as HTMLElement
    if (outer) outer.focus()
  }

  const ariaLabel = (title?: string, value?: string) => {
    if (!title || !value) return 'Pressing Enter enables keyboard navigation of the table'
    return `Title ${title} with status ${value}. Press Escape to exit keyboard navigation.`
  }

  return (
    <Focusable id='outer' inactive={focused} onEnter={focusOnFirstRow} ariaLabel={ariaLabel()}>
      <FlexCol gap='0.5rem'>
        {data.map(([title, value, icon]) =>
          !value ? null : (
            <Focusable
              id={title}
              key={title}
              inactive={!focused}
              onEnter={() => copy(value)}
              onEscape={focusOnOuterShell}
              ariaLabel={ariaLabel(title, value)}
            >
              <FlexRow between>
                <FlexRow color='dark50'>
                  {icon}
                  <Text small thin>
                    {title}
                  </Text>
                </FlexRow>
                <Text color='dark' copy={value} small bold>
                  {prettyLongText(value)}
                </Text>
              </FlexRow>
            </Focusable>
          ),
        )}
      </FlexCol>
    </Focusable>
  )
}
