import type { ServiceWorkerWalletMode } from '@arkade-os/sdk'
import { NavigationContext, Pages } from '../../providers/navigation'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { useContext, useMemo, useState } from 'react'
import { defaultPassword } from '../../lib/constants'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import LoadingLogo from '../../components/LoadingLogo'
import { consoleError } from '../../lib/logs'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import Text, { TextSecondary } from '../../components/Text'
import SegmentedControl from '../../components/SegmentedControl'
import { DevModeContext } from '../../providers/devMode'
import { OnboardStaggerContainer, OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { deriveNostrKeyFromMnemonic } from '../../lib/mnemonic'
import { AspContext } from '../../providers/asp'
import InputNsec from '../../components/InputNsec'
import { getRecoveryWord, parseRecoveryInput } from '../../lib/recoveryInput'
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

  const [input, setInput] = useState<{ value: string; cursor: number | null }>({ value: '', cursor: null })
  const [submitted, setSubmitted] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restoreDone, setRestoreDone] = useState(false)
  const [rotationChoice, setRotationChoice] = useState<RotationChoice>('Inherit')
  const parsed = useMemo(() => parseRecoveryInput(input.value), [input.value])
  const mnemonic = parsed.kind === 'phrase' ? parsed.mnemonic : undefined
  const privateKey = parsed.kind === 'key' ? parsed.privateKey : undefined
  const activeWord = getRecoveryWord(input.value, input.cursor)

  let error = ''
  if (parsed.kind === 'phrase' && parsed.error === 'word') {
    if (submitted || activeWord?.index !== parsed.wordIndex) {
      error = t('init.recoveryWordError', { number: parsed.wordIndex! + 1 })
    }
  } else if (submitted && parsed.kind !== 'empty' && parsed.error) {
    if (parsed.error === 'count') error = t('init.recoveryWordCountError')
    if (parsed.error === 'checksum') error = t('init.recoveryChecksumError')
    if (parsed.error === 'key') error = t('init.recoveryKeyError')
  }

  const helperText =
    parsed.kind === 'phrase'
      ? t(parsed.count === 1 ? 'init.recoveryOneWord' : 'init.recoveryWordCount', { count: parsed.count })
      : t('init.recoveryInputHint')

  const handleChange = (value: string, cursor: number | null) => {
    if (value !== input.value) setSubmitted(false)
    setInput({ value, cursor })
  }

  const handleCancel = () => navigate(Pages.Init)

  const handleProceed = () => {
    setSubmitted(true)
    if ((!mnemonic && !privateKey) || restoring) return
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

  const handleExitComplete = () => navigate(Pages.InitConnect)

  const disabled = !input.value.trim()

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
                  <InputNsec
                    value={input.value}
                    cursor={input.cursor}
                    onChange={handleChange}
                    onSubmit={handleProceed}
                    error={error}
                    helperText={helperText}
                  />
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
        <Button onClick={handleProceed} label={buttonLabel} disabled={disabled} />
        <Button onClick={handleCancel} label={t('common.cancel')} secondary />
      </ButtonsOnBottom>
    </>
  )
}
