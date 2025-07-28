import { ReactNode } from 'react'
import Text from './Text'
import Error from './Error'
import FlexRow from './FlexRow'
import Shadow from './Shadow'
import FlexCol from './FlexCol'
import Padded from './Padded'

interface InputContainerProps {
  children: ReactNode
  error?: string
  label?: string
  right?: JSX.Element
  bottomLeft?: string
  bottomRight?: string
}

export default function InputContainer({
  children,
  error,
  label,
  right,
  bottomLeft,
  bottomRight,
}: InputContainerProps) {
  const TopLabel = () => (
    <FlexRow between>
      <Text capitalize color='dark50' smaller>
        {label}
      </Text>
      <div>{right}</div>
    </FlexRow>
  )

  const BottomLabel = () => (
    <FlexRow between>
      <Text capitalize color='dark50' smaller>
        {bottomLeft}
      </Text>
      <Text capitalize color='dark50' smaller>
        {bottomRight}
      </Text>
    </FlexRow>
  )

  return (
    <FlexCol>
      <FlexCol gap='0.5rem'>
        {label || right ? <TopLabel /> : null}
        <Shadow>
          <Padded>{children}</Padded>
        </Shadow>
        {bottomLeft || bottomRight ? <BottomLabel /> : null}
      </FlexCol>
      <Error error={Boolean(error)} text={error ?? ''} />
    </FlexCol>
  )
}
