import type { ServiceWorkerWalletMode } from '@arkade-os/sdk'
import { invalidPrivateKey, nsecToPrivateKey } from '../../lib/privateKey'
import { NavigationContext, Pages } from '../../providers/navigation'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { useContext, useEffect, useState } from 'react'
import { defaultPassword } from '../../lib/constants'
import { FlowContext } from '../../providers/flow'
import ErrorMessage from '../../components/Error'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import { extractError } from '../../lib/error'
import LoadingLogo from '../../components/LoadingLogo'
import { consoleError } from '../../lib/logs'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import Text, { TextSecondary } from '../../components/Text'
import SegmentedControl from '../../components/SegmentedControl'
import { DevModeContext } from '../../providers/devMode'
import { hex } from '@scure/base'
import { OnboardStaggerContainer, OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { deriveNostrKeyFromMnemonic } from '../../lib/mnemonic'
import { AspContext } from '../../providers/asp'
import InputNsec from '../../components/InputNsec'
import { BackupContext } from '@/providers/backup'
import { useTranslation } from '../../providers/language'

type RotationChoice = 'Inherit' | 'Static' | 'HD'

// Maps the user's rotation choice to the wallet mode passed into initWallet.
// `undefined` (Inherit) makes resolveWalletMode fall back to config.walletMode,
// which the Nostr backup restored just before navigation (see handleProceed).
const ROTATION_TO_MODE: Record<RotationChoice, ServiceWorkerWalletMode | undefined> = {
  Inherit: undefined,
  Static: 'static',
  HD: 'hd',
}

export default function InitRestore() {
  const { navigate } = useContext(NavigationContext)
  const { setInitInfo } = useContext(FlowContext)
  const { devMode } = useContext(DevModeContext)
  const { restore } = useContext(BackupContext)
  const { aspInfo } = useContext(AspContext)
  const { t } = useTranslation()

  const buttonLabel = t('common.continue')

  const [error, setError] = useState('')
  const [label, setLabel] = useState(buttonLabel)
  const [mnemonic, setMnemonic] = useState<string>()
  const [privateKey, setPrivateKey] = useState<Uint8Array>()
  const [restoring, setRestoring] = useState(false)
  const [restoreDone, setRestoreDone] = useState(false)
  const [someKey, setSomeKey] = useState<string>()
  const [rotationChoice, setRotationChoice] = useState<RotationChoice>('Inherit')

  useEffect(() => {
    const trimmed = someKey?.trim() ?? ''
    if (!trimmed) {
      setMnemonic(undefined)
      setPrivateKey(undefined)
      setLabel(buttonLabel)
      setError('')
      return
    }

    // Detect mnemonic (input contains spaces)
    if (trimmed.includes(' ')) {
      if (validateMnemonic(trimmed, wordlist)) {
        setMnemonic(trimmed)
        setPrivateKey(undefined)
        setLabel(buttonLabel)
        setError('')
      } else {
        setMnemonic(undefined)
        setPrivateKey(undefined)
        setLabel(t('init.invalidRecoveryPhrase'))
        setError(t('init.invalidRecoveryPhrase'))
      }
      return
    }

    // Otherwise try nsec/hex private key
    setMnemonic(undefined)
    let pk = undefined
    try {
      if (trimmed.match(/^nsec/)) pk = nsecToPrivateKey(trimmed)
      else pk = hex.decode(trimmed)
      const invalid = invalidPrivateKey(pk)
      setLabel(invalid ? t('init.unableToValidatePrivateKey') : buttonLabel)
      setError(invalid)
    } catch (err) {
      setLabel(t('init.unableToValidateKey'))
      setError(extractError(err))
    }
    setPrivateKey(pk)
  }, [someKey])

  const handleCancel = () => navigate(Pages.Init)

  const handleProceed = () => {
    setRestoring(true)
    let seckey: Uint8Array
    if (mnemonic) {
      setInitInfo({
        mnemonic,
        password: defaultPassword,
        restoring: true,
        walletMode: ROTATION_TO_MODE[rotationChoice],
      })
      const isNet =
        aspInfo.network !== 'testnet' &&
        aspInfo.network !== 'mutinynet' &&
        aspInfo.network !== 'signet' &&
        aspInfo.network !== 'regtest'
      seckey = deriveNostrKeyFromMnemonic(mnemonic, isNet)
    } else {
      setInitInfo({ privateKey, password: defaultPassword, restoring: true })
      seckey = privateKey!
    }
    restore(seckey)
      .catch((err) => consoleError(err, 'Error restoring from nostr'))
      .finally(() => setRestoreDone(true))
  }

  const handleExitComplete = () => {
    if (error) return setRestoring(false)
    else navigate(Pages.InitConnect)
  }

  const disabled = Boolean((!privateKey && !mnemonic) || error)

  if (restoring)
    return (
      <LoadingLogo
        text={t('init.restoringWallet')}
        done={restoreDone}
        exitMode='fly-up'
        onExitComplete={handleExitComplete}
      />
    )

  return (
    <>
      <Header text={t('init.restoreWallet')} back />
      <Content>
        <Padded>
          <OnboardStaggerContainer>
            <OnboardStaggerChild>
              <FlexCol between>
                <FlexCol>
                  <InputNsec onChange={setSomeKey} />
                  <ErrorMessage error={Boolean(error)} text={error} />
                  {devMode && mnemonic ? (
                    <FlexCol gap='0.5rem'>
                      <Text thin>{t('init.addressRotation')}</Text>
                      <SegmentedControl
                        options={['Inherit', 'Static', 'HD']}
                        selected={rotationChoice}
                        onChange={(v) => setRotationChoice(v as RotationChoice)}
                      />
                      <TextSecondary wrap>{t('init.rotationSubtext')}</TextSecondary>
                    </FlexCol>
                  ) : null}
                </FlexCol>
                <TextSecondary wrap>{t('init.recoveryInstructions')}</TextSecondary>
              </FlexCol>
            </OnboardStaggerChild>
          </OnboardStaggerContainer>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleProceed} label={label} disabled={disabled} />
        <Button onClick={handleCancel} label={t('common.cancel')} secondary />
      </ButtonsOnBottom>
    </>
  )
}
