import CenterScreen from '../../components/CenterScreen'
import ErrorMessage from '../../components/Error'
import WalletNewIcon from '../../icons/WalletNew'
import Text from '../../components/Text'
import { AspContext } from '../../providers/asp'
import { aspErrorText } from '../../lib/asp'
import { useContext, useEffect, useState } from 'react'
import { isIOS } from '../../lib/browser'
import { detectJSCapabilities, getRestrictedEnvironmentMessage } from '../../lib/jsCapabilities'
import { useTranslation } from '../../providers/language'

export default function Unavailable() {
  const { aspInfo } = useContext(AspContext)
  const { t } = useTranslation()

  const [error, setError] = useState('')

  // Check JavaScript capabilities on mount
  useEffect(() => {
    if (aspInfo.unreachable) return setError(aspErrorText(aspInfo, t('init.arkadeServerUnreachable')))
    detectJSCapabilities()
      .then((result) => {
        if (result.isSupported) return
        // Use specific error message or fallback to iOS/generic message
        setError(result.errorMessage || getRestrictedEnvironmentMessage(isIOS()))
      })
      .catch(() => {
        setError(getRestrictedEnvironmentMessage(isIOS()))
      })
  }, [aspInfo.unreachable, aspInfo.outdated])

  return (
    <CenterScreen>
      <WalletNewIcon />
      <Text bigger heading medium>
        Arkade Wallet
      </Text>
      <ErrorMessage error text={error} />
    </CenterScreen>
  )
}
