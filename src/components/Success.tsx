import SuccessIcon from '../icons/Success'
import CenterScreen from './CenterScreen'
import Text from './Text'

interface SuccessProps {
  headline?: string
  text?: string
}

export default function Success({ headline, text }: SuccessProps) {
  return (
    <CenterScreen>
      <SuccessIcon />
      {headline ? (
        <Text big bold>
          {headline}
        </Text>
      ) : null}
      {text ? (
        <Text color='dark70' thin small>
          {text}
        </Text>
      ) : null}
    </CenterScreen>
  )
}
