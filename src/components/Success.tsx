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
        <Text centered big bold heading>
          {headline}
        </Text>
      ) : null}
      {text ? (
        <Text centered color='dark70' thin small wrap>
          {text}
        </Text>
      ) : null}
    </CenterScreen>
  )
}
