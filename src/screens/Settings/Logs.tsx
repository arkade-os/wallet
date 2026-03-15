import Header from './Header'
import Text from '../../components/Text'
import Content from '../../components/Content'
import { useEffect, useState } from 'react'
import { prettyAgo, prettyLongText } from '../../lib/format'
import { clearLogs, getLogs, LogLine } from '../../lib/logs'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { EmptyLogsList } from '../../components/Empty'
import Focusable from '../../components/Focusable'
import { useIonToast } from '@ionic/react'
import { copyToClipboard } from '../../lib/clipboard'
import { copiedToClipboard } from '../../lib/toast'

function LogsTable({ logs }: { logs: LogLine[] }) {
  const [focused, setFocused] = useState(false)

  const [present] = useIonToast()

  const color = (level: string): string => {
    if (level === 'info') return ''
    if (level === 'warn') return 'orange'
    if (level === 'error') return 'red'
    return ''
  }

  const numChars = (v: string) => Math.floor((36 - v.length) / 2)

  if (logs.length === 0) {
    return <EmptyLogsList />
  }

  const key = ({ time, msg, level }: LogLine) => `${time}${msg}${level}`

  const copy = (value: string) => {
    copyToClipboard(value)
    present(copiedToClipboard)
  }

  const focusOnFirstRow = () => {
    setFocused(true)
    if (logs.length === 0) return
    const id = key([...logs].reverse()[0])
    const first = document.getElementById(id) as HTMLElement
    if (first) first.focus()
  }

  const focusOnOuterShell = () => {
    setFocused(false)
    const outer = document.getElementById('outer') as HTMLElement
    if (outer) outer.focus()
  }

  const ariaLabel = (l?: LogLine) => {
    if (!l) return 'Pressing Enter enables keyboard navigation of the logs'
    return `Log at ${prettyAgo(l.time)} with message ${l.msg}. Press Escape to exit keyboard navigation.`
  }

  return (
    <Focusable id='outer' inactive={focused} onEnter={focusOnFirstRow} ariaLabel={ariaLabel()}>
      <div style={{ margin: '1rem' }}>
        <FlexCol gap='0.5rem'>
          {[...logs].reverse().map(({ time, msg, level }) => (
            <Focusable
              inactive={!focused}
              onEnter={() => copy(msg)}
              onEscape={focusOnOuterShell}
              id={key({ time, msg, level })}
              key={key({ time, msg, level })}
              ariaLabel={ariaLabel({ time, msg, level })}
            >
              <FlexRow between>
                <Text color={color(level)}>{prettyAgo(time)}</Text>
                <Text color='dark50' copy={msg}>
                  {prettyLongText(msg.replace('...', ''), numChars(prettyAgo(time)))}
                </Text>
              </FlexRow>
            </Focusable>
          ))}
        </FlexCol>
      </div>
    </Focusable>
  )
}

export default function Logs() {
  const [logs, setLogs] = useState<LogLine[]>([])
  const [load, setLoad] = useState(true)

  useEffect(() => {
    if (!load) return
    setLogs(getLogs())
    setLoad(false)
  }, [load])

  const handleClear = () => {
    clearLogs() // clear logs from local storage
    setLoad(true) // to reload page and show empty logs
  }

  const handleExport = () => {
    if (logs?.length === 0) return
    const csvHeader =
      Object.keys(logs[0])
        .map((k) => `"${k}"`)
        .join(',') + '\n'
    const csvBody = logs
      .map((row) =>
        Object.values(row)
          .map((k) => `"${k}"`)
          .join(','),
      )
      .join('\n')
    const hiddenElement = document.createElement('a')
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvHeader + csvBody)
    hiddenElement.target = '_blank'
    hiddenElement.download = 'arkade_logs.csv'
    document.body.appendChild(hiddenElement) // required for firefox
    hiddenElement.click()
  }

  return (
    <>
      <Header auxFunc={handleClear} auxText='Clear' back text='Logs' />
      <Content>
        <LogsTable logs={logs} />
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleExport} label='Export to CSV file' disabled={logs.length === 0} />
      </ButtonsOnBottom>
    </>
  )
}
