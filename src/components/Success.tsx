import { SuccessIcon2 } from '../icons/Success'
import CenterScreen from './CenterScreen'
import Text from './Text'

export default function Success({ text }: { text?: string }) {
  return (
    <CenterScreen>
      <SuccessIcon2 />
      {text ? <Text small>{text}</Text> : null}
    </CenterScreen>
  )
}
