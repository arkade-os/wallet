import CenterScreen from '../../components/CenterScreen'
import ErrorMessage from '../../components/Error'
import WalletNewIcon from '../../icons/WalletNew'
import Text from '../../components/Text'
import { AspContext } from '../../providers/asp'
import { useContext, useEffect, useState } from 'react'
import { isIOS } from '../../lib/browser'
import { detectJSCapabilities, getRestrictedEnvironmentMessage } from '../../lib/jsCapabilities'

export default function Unavailable() {
  const { aspInfo } = useContext(AspContext)

  const [error, setError] = useState('')

  // Check JavaScript capabilities on mount
  useEffect(() => {
    if (aspInfo.unreachable) return setError('Arkade server unreachable.')
    detectJSCapabilities()
      .then((result) => {
        if (result.isSupported) return
        // Use specific error message or fallback to iOS/generic message
        setError(result.errorMessage || getRestrictedEnvironmentMessage(isIOS()))
      })
      .catch(() => {
        setError(getRestrictedEnvironmentMessage(isIOS()))
      })
  }, [])

  return (
    <CenterScreen>
      <WalletNewIcon />
      <Text bigger>Arkade Wallet</Text>
      <ErrorMessage error text={error} />
    </CenterScreen>
  )
}
