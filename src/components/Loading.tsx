import LoadingBar from '../icons/LoadingBar'
import CenterScreen from './CenterScreen'
import Text from './Text'

export default function Loading({ text }: { text?: string }) {
  return (
    <CenterScreen>
      <div style={{ display: 'flex', flexDirection: 'column', height: '120px', justifyContent: 'flex-end' }}>
        <LoadingBar />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', height: '120px' }}>
        <Text centered small wrap heading>
          {text || 'Loading...'}
        </Text>
      </div>
    </CenterScreen>
  )
}
