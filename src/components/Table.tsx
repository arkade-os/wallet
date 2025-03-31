import Text from './Text'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import { prettyLongText } from '../lib/format'

export default function Table({ data }: { data: string[][] }) {
  const color = (text: string): string => {
    if (text === 'Settled') return 'green'
    if (text === 'Pending') return 'yellow'
    return 'dark'
  }

  return (
    <FlexCol gap='0.5rem'>
      {data.map(([title, value]) => (
        <FlexRow between key={`${title}${value}`}>
          <Text color='dark50'>{title}</Text>
          <Text color={color(value)} copy={value}>
            {prettyLongText(value)}
          </Text>
        </FlexRow>
      ))}
    </FlexCol>
  )
}
