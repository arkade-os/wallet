import LoadingBar from '../icons/LoadingBar'
import CenterScreen from './CenterScreen'
import Text from './Text'

export default function Loading({ text }: { text?: string }) {
  return (
    <CenterScreen>
      <LoadingBar />
      <Text centered small wrap>
        {text || 'Loading...'}
      </Text>
    </CenterScreen>
  )
}
