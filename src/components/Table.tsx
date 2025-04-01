import Text from './Text'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import { prettyLongText } from '../lib/format'

export default function Table({ data }: { data: any[][] }) {
  const color = (text: string): string => {
    if (text === 'Settled') return 'green'
    if (text === 'Pending') return 'orange'
    return 'dark'
  }

  return (
    <FlexCol gap='0.5rem'>
      {data.map(([title, value, icon]) => (
        <FlexRow between key={`${title}${value}`}>
          <FlexRow color='dark50'>
            {icon}
            <Text>{title}</Text>
          </FlexRow>
          <Text color={color(value)} copy={value}>
            {prettyLongText(value)}
          </Text>
        </FlexRow>
      ))}
    </FlexCol>
  )
}
