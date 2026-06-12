import { ReactNode } from 'react'
import ErrorMessage from './Error'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import Shadow from './Shadow'
import Text from './Text'

interface InputContainerProps {
  children: ReactNode
  error?: string
  errorVariant?: 'banner' | 'inline'
  label?: string
  right?: JSX.Element
  bottomLeft?: string
  bottomRight?: string
}

export default function InputContainer({
  children,
  error,
  errorVariant = 'banner',
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

  const hasError = Boolean(error)
  const inlineError = errorVariant === 'inline' && hasError

  return (
    <FlexCol gap={inlineError ? '0.375rem' : undefined}>
      <FlexCol gap='0.5rem'>
        {label || right ? <TopLabel /> : null}
        <Shadow dangerBorder={inlineError}>
          <FlexRow between>{children}</FlexRow>
        </Shadow>
        {bottomLeft || bottomRight ? <BottomLabel /> : null}
      </FlexCol>
      {inlineError ? (
        <div className='field-error' role='alert'>
          <Text color='danger' small wrap>
            {error}
          </Text>
        </div>
      ) : (
        <ErrorMessage error={hasError} text={error ?? ''} />
      )}
    </FlexCol>
  )
}
