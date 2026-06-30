import { ReactNode } from 'react'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import Text from './Text'

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
      <Text capitalize color='neutral-500' smaller>
        {label}
      </Text>
      <div>{right}</div>
    </FlexRow>
  )

  const BottomLabel = () => (
    <FlexRow between>
      <Text capitalize color='neutral-500' smaller>
        {bottomLeft}
      </Text>
      <Text capitalize color='neutral-500' smaller>
        {bottomRight}
      </Text>
    </FlexRow>
  )

  return (
    <FlexCol className='input-container'>
      <FlexCol gap='0.5rem'>
        {label || right ? <TopLabel /> : null}
        <div className='input-shell'>
          <FlexRow between>{children}</FlexRow>
        </div>
        {bottomLeft || bottomRight ? <BottomLabel /> : null}
      </FlexCol>
      {Boolean(error) ? (
        <Text capitalize color='red-500' smaller>
          {error}
        </Text>
      ) : null}
    </FlexCol>
  )
}
