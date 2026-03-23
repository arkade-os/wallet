import Text from './Text'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import { prettyLongText } from '../lib/format'
import { useState } from 'react'
import Focusable from './Focusable'
import { copyToClipboard } from '../lib/clipboard'
import { useIonToast } from '@ionic/react'
import { copiedToClipboard } from '../lib/toast'
import { hapticSubtle } from '../lib/haptics'
import ExternalLinkIcon from '../icons/ExternalLink'

export type TableLine = [string, string | undefined, JSX.Element?, (() => void)?]
export type TableData = TableLine[]

export default function Table({ data }: { data: TableData }) {
  const [focused, setFocused] = useState(false)

  const [present] = useIonToast()

  const copy = (value: string) => {
    hapticSubtle()
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
        {data.map(([title, value, icon, onClick]) =>
          value == '' || value === undefined || value === null ? null : (
            <Focusable
              id={title}
              key={title}
              inactive={!focused}
              onEnter={() => (onClick ? onClick() : copy(value))}
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
                <FlexRow end gap='0.25rem'>
                  {onClick ? (
                    <span onClick={onClick} style={{ cursor: 'pointer', color: 'var(--dark50)' }}>
                      <ExternalLinkIcon />
                    </span>
                  ) : null}
                  <Text color='dark' copy={value} small bold testId={title}>
                    {prettyLongText(value, onClick ? 8 : undefined)}
                  </Text>
                </FlexRow>
              </FlexRow>
            </Focusable>
          ),
        )}
      </FlexCol>
    </Focusable>
  )
}
