import { createContext } from 'react'
import { rememberReceiverTaxi, type RememberedTaxi } from '../lib/storage'

interface ReceiverClaimsContextProps {
  /** Record a Taxi this wallet named in a request, so its claims are watched from now on. */
  remember: (taxi: RememberedTaxi) => void
}

export const ReceiverClaimsContext = createContext<ReceiverClaimsContextProps>({
  remember: (taxi) => void rememberReceiverTaxi(taxi),
})
