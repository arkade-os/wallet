import { useContext, useEffect, useState } from 'react'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import { WalletContext } from '../../providers/wallet'
import LoadingLogo from '../../components/LoadingLogo'
import Header from '../../components/Header'
import { setPrivateKey } from '../../lib/privateKey'
import { setMnemonic } from '../../lib/mnemonic'
import { setPasskeyWallet } from '../../lib/passkeyVault'
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

  const { password, privateKey, mnemonic, walletMode, passkeyCredentialId, legacyPasskey } = initInfo

  // seed-restored wallets don't need the backup nudge (the user already has
  // the words) — but they're recovery vehicles: flag them so the app nudges
  // moving funds to a fresh passkey wallet. Passkey logins are neither: the
  // wallet is passkey-native, and the words may never have been written down.
  const markRestoredAsBackedUp = () => {
    if (initInfo.restoring && !passkeyCredentialId) {
      updateWallet((prev) => ({ ...prev, walletBackedUp: true, restoredFromSeed: true }))
    }
  }

  useEffect(() => {
    if (mnemonic && passkeyCredentialId) {
      // FileKey model: the mnemonic is derived from the passkey PRF, so persist
      // only which credential to assert — no secret is stored at rest.
      setPasskeyWallet(passkeyCredentialId)
      initWallet({ mnemonic, walletMode, restoring: initInfo.restoring })
        .then(() => {
          markRestoredAsBackedUp()
          setInitialized(true)
        })
        .catch(abortConnectionWithError)
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
      passkeyCredentialId: undefined,
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
