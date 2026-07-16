import Text from './Text'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import { prettyLongText } from '../lib/format'
import { useState } from 'react'
import Focusable from './Focusable'
import { copyToClipboard } from '../lib/clipboard'
import { useToast } from './Toast'
import { hapticSubtle } from '../lib/haptics'
import ExternalLinkIcon from '../icons/ExternalLink'

export type TableLine = [string, string | undefined, JSX.Element?, (() => void)?]
export type TableData = TableLine[]

export default function Table({ data, variant = 'default' }: { data: TableData; variant?: 'default' | 'receipt' }) {
  const isReceipt = variant === 'receipt'
  const [focused, setFocused] = useState(false)

  const { toast } = useToast()

  const copy = (value: string) => {
    hapticSubtle()
    copyToClipboard(value)
    toast('Copied to clipboard')
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
      <FlexCol className={isReceipt ? 'table table--receipt' : undefined} gap={isReceipt ? '0' : '0.5rem'}>
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
              {isReceipt ? (
                <div className='table-row'>
                  <div className='table-row__label'>
                    {icon ? <span className='table-row__icon'>{icon}</span> : null}
                    <span className='table-row__title'>{title}</span>
                  </div>
                  <div className='table-row__value-wrap'>
                    {onClick ? (
                      <span onClick={onClick} className='table-row__external' aria-hidden='true'>
                        <ExternalLinkIcon small />
                      </span>
                    ) : null}
                    <span className='table-row__value' onClick={() => copy(value)} data-testid={title}>
                      {prettyLongText(value, onClick ? 8 : undefined)}
                    </span>
                  </div>
                </div>
              ) : (
                <FlexRow between>
                  <FlexRow color='neutral-500'>
                    {icon}
                    <Text small thin>
                      {title}
                    </Text>
                  </FlexRow>
                  <FlexRow end gap='0.25rem'>
                    {onClick ? (
                      <span onClick={onClick} style={{ cursor: 'pointer', color: 'var(--neutral-500)' }}>
                        <ExternalLinkIcon small />
                      </span>
                    ) : null}
                    <Text color='dark' copy={value} small bold testId={title}>
                      {prettyLongText(value, onClick ? 8 : undefined)}
                    </Text>
                  </FlexRow>
                </FlexRow>
              )}
            </Focusable>
          ),
        )}
      </FlexCol>
    </Focusable>
  )
}
