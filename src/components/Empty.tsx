import EmptyIcon from '../icons/Empty'
import FlexCol from './FlexCol'
import Text, { TextSecondary } from './Text'

interface EmptyProps {
  text: string
  secondaryText?: string
}

export default function Empty({ text, secondaryText }: EmptyProps) {
  return (
    <div style={{ paddingTop: '10rem', width: '100%' }}>
      <FlexCol centered gap='1rem'>
        <EmptyIcon />
        <FlexCol centered gap='0.5rem'>
          <Text>{text}</Text>
          <TextSecondary>{secondaryText}</TextSecondary>
        </FlexCol>
      </FlexCol>
    </div>
  )
}
