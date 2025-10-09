import { GreenStatusIcon } from '../icons/Status'
import UnheckedIcon from '../icons/Unchecked'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import Text from './Text'

type CheckListData = {
  text: string
  done: boolean
}

interface CheckListProps {
  data: CheckListData[]
}

const Line = ({ row }: { row: CheckListData }) => (
  <>
    {row.done ? (
      <FlexRow>
        <GreenStatusIcon />
        <Text small color='green'>
          {row.text}
        </Text>
      </FlexRow>
    ) : (
      <FlexRow>
        <UnheckedIcon />
        <Text small color='dark70'>
          {row.text}
        </Text>
      </FlexRow>
    )}
  </>
)

export default function CheckList({ data }: CheckListProps) {
  return (
    <FlexCol gap='0.5rem'>
      <Text smaller>Set a strong password with:</Text>
      {data.map((row) => (
        <Line key={row.text} row={row} />
      ))}
    </FlexCol>
  )
}
