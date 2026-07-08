import { useContext, useEffect, useState } from 'react'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import { WalletContext } from '../../providers/wallet'
import LoadingLogo from '../../components/LoadingLogo'
import Header from '../../components/Header'
import { setPrivateKey } from '../../lib/privateKey'
import { setMnemonic } from '../../lib/mnemonic'
import { setMnemonicWithPrf } from '../../lib/passkeyVault'
import { consoleError, consoleLog } from '../../lib/logs'
import { SwapsContext } from '../../providers/swaps'
import { useLoadingStatus } from '../../hooks/useLoadingStatus'
import { setLoadingStatus } from '../../lib/loadingStatus'
import { NavigationContext, Pages } from '../../providers/navigation'

export default function InitConnect() {
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { arkadeSwaps, restoreSwaps } = useContext(SwapsContext)
  const { navigate } = useContext(NavigationContext)
  const { initWallet, updateWallet } = useContext(WalletContext)

  const loadingStatus = useLoadingStatus()
  const [error, setError] = useState<string>()
  const [initialized, setInitialized] = useState(false)
  const [connectDone, setConnectDone] = useState(false)

  const { password, privateKey, mnemonic, walletMode, prf, legacyPasskey } = initInfo

  // restored wallets don't need the backup nudge: the user already has the words
  const markRestoredAsBackedUp = () => {
    if (initInfo.restoring) updateWallet((prev) => ({ ...prev, walletBackedUp: true }))
  }

  useEffect(() => {
    if (mnemonic && prf) {
      setMnemonicWithPrf(mnemonic, prf.credentialId, prf.prfOutput)
        .then(() => initWallet({ mnemonic, walletMode, restoring: initInfo.restoring }))
        .then(() => {
          markRestoredAsBackedUp()
          setInitialized(true)
        })
        .catch(abortConnectionWithError)
        .finally(() => prf.prfOutput.fill(0))
      return
    }
    if (!password || (!mnemonic && !privateKey)) {
      abortConnectionWithError(new Error('Missing credentials'))
      return
    }
    if (mnemonic) {
      setMnemonic(mnemonic, password)
        .then(() => initWallet({ mnemonic, walletMode, restoring: initInfo.restoring }))
        .then(() => {
          if (legacyPasskey) {
            updateWallet((prev) => ({ ...prev, lockedByBiometrics: true, passkeyId: legacyPasskey.credentialId }))
          }
          markRestoredAsBackedUp()
          setInitialized(true)
        })
        .catch(abortConnectionWithError)
    } else if (privateKey) {
      setPrivateKey(privateKey, password)
        .then(() => initWallet({ privateKey }))
        .then(() => {
          markRestoredAsBackedUp()
          setInitialized(true)
        })
        .catch(abortConnectionWithError)
    }
  }, [])

  useEffect(() => {
    if (!initialized || !arkadeSwaps) return
    if (!initInfo.restoring) return setConnectDone(true)
    setLoadingStatus('Restoring swaps...')
    restoreSwaps()
      .then((count) => count && consoleLog(`Restored ${count} swaps from network`))
      .catch((err) => consoleError(err, 'Error restoring swaps:'))
      .finally(() => setConnectDone(true))
  }, [arkadeSwaps, initialized, initInfo.restoring])

  const handleExitComplete = () => {
    setInitInfo({
      ...initInfo,
      password: undefined,
      privateKey: undefined,
      mnemonic: undefined,
      walletMode: undefined,
      prf: undefined,
      legacyPasskey: undefined,
    })
    navigate(error ? Pages.Init : Pages.Wallet)
  }

  const abortConnectionWithError = (err: any) => {
    consoleError(err, 'Error during connection:')
    setLoadingStatus('Connection failed')
    setError('Connection failed')
    setConnectDone(true)
  }

  return (
    <>
      <Header text='Connecting to server' />
      <Content>
        <LoadingLogo
          text={loadingStatus || 'Connecting to server'}
          exitMode={connectDone ? 'fly-up' : 'none'}
          onExitComplete={handleExitComplete}
          done={connectDone}
        />
      </Content>
    </>
  )
}
