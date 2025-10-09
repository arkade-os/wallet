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

function LogsTable({ logs }: { logs: LogLine[] }) {
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

  return (
    <div style={{ margin: '1rem' }}>
      <FlexCol gap='0.5rem'>
        {[...logs].reverse().map(({ time, msg, level }) => (
          <FlexRow between key={`${time}${msg}`}>
            <Text color={color(level)}>{prettyAgo(time)}</Text>
            <Text color='dark50' copy={msg}>
              {prettyLongText(msg.replace('...', ''), numChars(prettyAgo(time)))}
            </Text>
          </FlexRow>
        ))}
      </FlexCol>
    </div>
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
