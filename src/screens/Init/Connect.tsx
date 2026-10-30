import { useContext, useEffect, useState } from 'react'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import { WalletContext } from '../../providers/wallet'
import LoadingLogo from '../../components/LoadingLogo'
import Header from '../../components/Header'
import { setPrivateKey } from '../../lib/privateKey'
import { setMnemonic } from '../../lib/mnemonic'
import { consoleError } from '../../lib/logs'
import { useLoadingStatus } from '../../hooks/useLoadingStatus'
import { NavigationContext, Pages } from '../../providers/navigation'
import { useTranslation } from '../../providers/language'
import { isElectrumOffline } from '../../lib/electrum'
import ErrorMessage from '../../components/Error'
import Padded from '../../components/Padded'

export default function InitConnect() {
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { initWallet } = useContext(WalletContext)
  const { t } = useTranslation()

  const loadingStatus = useLoadingStatus()
  const [error, setError] = useState<string>()
  const [initialized, setInitialized] = useState(false)
  const [connectDone, setConnectDone] = useState(false)

  const { password, privateKey, mnemonic, walletMode } = initInfo

  useEffect(() => {
    if (!password || (!mnemonic && !privateKey)) {
      abortConnectionWithError(new Error('Missing credentials'))
      return
    }
    if (mnemonic) {
      setMnemonic(mnemonic, password)
        .then(() => initWallet({ mnemonic, walletMode, restoring: initInfo.restoring }))
        .then(() => setInitialized(true))
        .catch(abortConnectionWithError)
    } else if (privateKey) {
      setPrivateKey(privateKey, password)
        .then(() => initWallet({ privateKey, restoring: initInfo.restoring }))
        .then(() => setInitialized(true))
        .catch(abortConnectionWithError)
    }
  }, [])

  useEffect(() => {
    if (initialized) setConnectDone(true)
  }, [initialized])

  const clearCredentials = () => {
    setInitInfo({ ...initInfo, password: undefined, privateKey: undefined, mnemonic: undefined, walletMode: undefined })
  }

  const handleExitComplete = () => {
    clearCredentials()
    navigate(error ? Pages.Init : Pages.Wallet)
  }

  const abortConnectionWithError = (err: unknown) => {
    consoleError(err, 'Error during connection:')
    // Do not set connectDone. That animation leaves for the welcome screen,
    // which is the redirect people hit after a failed restore.
    setError(isElectrumOffline(err) ? t('errors.electrumOffline') : t('init.connectionFailed'))
  }

  if (error) {
    return (
      <>
        <Header
          text={t('init.connectingToServer')}
          back={() => {
            clearCredentials()
            navigate(Pages.Init)
          }}
        />
        <Content>
          <Padded>
            <ErrorMessage error text={error} />
          </Padded>
        </Content>
      </>
    )
  }

  return (
    <>
      <Header text={t('init.connectingToServer')} />
      <Content>
        <LoadingLogo
          text={loadingStatus || t('init.connectingToServerStatus')}
          exitMode={connectDone ? 'fly-up' : 'none'}
          onExitComplete={handleExitComplete}
          done={connectDone}
        />
      </Content>
    </>
  )
}
