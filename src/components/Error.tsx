import Padded from './Padded'
import Shadow from './Shadow'
import Text from './Text'

interface ErrorProps {
  error: boolean
  text: string
}

export default function ErrorMessage({ error, text }: ErrorProps) {
  if (!error) return null
  return (
    <Shadow red>
      <Padded>
        <Text bold centered color='white' small wrap>
          {text}
        </Text>
      </Padded>
    </Shadow>
  )
}
