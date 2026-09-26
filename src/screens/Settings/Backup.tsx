import { useToast } from '../../components/Toast'
import { BackupContext } from '../../providers/backup'
import { useState, useEffect, useContext, useRef } from 'react'
import Button from '../../components/Button'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { copyToClipboard } from '../../lib/clipboard'
import Header from './Header'
import Text, { TextSecondary } from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { getPrivateKey, privateKeyToNsec } from '../../lib/privateKey'
import { hasMnemonic, getMnemonic } from '../../lib/mnemonic'
import { consoleError } from '../../lib/logs'
import Shadow from '../../components/Shadow'
import { defaultPassword } from '../../lib/constants'
import { ConfigContext } from '../../providers/config'
import Toggle from '../../components/Toggle'
import ErrorMessage from '../../components/Error'
import SafeIcon from '../../icons/Safe'
import FlexRow from '../../components/FlexRow'
import DontIcon from '../../icons/Dont'
import XIcon from '../../icons/X'
import WarningBox from '../../components/Warning'
import Modal from '../../components/Modal'
import InputFake from '../../components/InputFake'
import OkIcon from '../../icons/Ok'
import { WalletContext } from '../../providers/wallet'
import { authenticateUser } from '../../lib/biometrics'
import FingerprintIcon from '../../icons/Fingerprint'
import InputPassword from '../../components/InputPassword'
import { useTranslation } from '../../providers/language'

export default function Backup() {
  const { wallet } = useContext(WalletContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { backupConfig, fullBackup } = useContext(BackupContext)

  const { toast } = useToast()
  const { t } = useTranslation()

  const isMnemonicWallet = hasMnemonic()

  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const enteredPassword = useRef('')

  useEffect(() => {
    verifyPassword(defaultPassword).then(setSecret)
  }, [])

  const verifyPassword = async (password: string): Promise<string> => {
    try {
      if (isMnemonicWallet) {
        return await getMnemonic(password)
      }
      const privateKey = await getPrivateKey(password)
      return privateKeyToNsec(privateKey)
    } catch {
      return ''
    }
  }

  const handleCopy = async () => {
    if (!secret) return
    await copyToClipboard(secret)
    toast(t('backup.copyToClipboard'))
  }

  const onChangePassword = (e: any) => {
    enteredPassword.current = e.target.value
  }

  const showPrivateKey = async () => {
    if (!secret) {
      const password = wallet.lockedByBiometrics
        ? await authenticateUser(wallet.passkeyId).catch(setError)
        : enteredPassword.current
      if (!password) return
      const result = await verifyPassword(password)
      if (!result) {
        setError(t('unlock.invalidPassword'))
        return
      }
      setError('')
      setSecret(result)
    }
    setShowSecret(true)
    setDialog(false)
  }

  const toggleDialog = () => {
    setDialog(!dialog)
  }

  const toggleNostrBackup = async () => {
    const newConfig = { ...config, nostrBackup: !config.nostrBackup }
    updateConfig(newConfig)
    if (newConfig.nostrBackup) {
      await fullBackup(newConfig).catch((error) => {
        consoleError(error, 'Backup to Nostr failed')
        setError(t('backup.backupFailed'))
        return
      })
    } else {
      backupConfig(newConfig, true)
    }
    toast(t('backup.nostrBackupUpdated'))
  }

  const secretLabel = isMnemonicWallet ? t('backup.recoveryPhrase') : t('backup.privateKey')

  const Dialog = () => (
    <FlexCol gap='1.5rem'>
      <FlexCol centered gap='0.5rem'>
        <Text big medium heading>
          {secretLabel}
        </Text>
        <TextSecondary centered wrap>
          {isMnemonicWallet ? t('backup.phraseBacksUpWallet') : t('backup.keyBacksUpWallet')}
        </TextSecondary>
      </FlexCol>
      {!secret ? (
        wallet.lockedByBiometrics ? (
          <FlexCol centered gap='0.5rem'>
            <FingerprintIcon />
            <Text centered>{t('unlock.unlockWithPasskey')}</Text>
          </FlexCol>
        ) : (
          <FlexCol gap='0.5rem' testId='backup-password-input'>
            <TextSecondary>{t('unlock.enterPassword')}</TextSecondary>
            <InputPassword onChange={onChangePassword} />
            <ErrorMessage error={Boolean(error)} text={error} />
          </FlexCol>
        )
      ) : null}
      <FlexCol gap='0.25rem'>
        <FlexRow>
          <SafeIcon />
          <TextSecondary>{t('backup.keepSafe', { secret: secretLabel.toLowerCase() })}</TextSecondary>
        </FlexRow>
        <FlexRow>
          <DontIcon />
          <TextSecondary>{t('backup.doNotShare')}</TextSecondary>
        </FlexRow>
        <FlexRow>
          <XIcon />
          <TextSecondary>{t('backup.cantRecover')}</TextSecondary>
        </FlexRow>
      </FlexCol>
      <FlexRow>
        <Button onClick={toggleDialog} label={t('common.cancel')} secondary />
        <Button onClick={showPrivateKey} label={t('backup.confirm')} />
      </FlexRow>
    </FlexCol>
  )

  return (
    <>
      <Header text={t('settings.backup')} back />
      <Modal open={dialog} onOpenChange={setDialog}>
        <Dialog />
      </Modal>
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
              <Text thin>{secretLabel}</Text>
              <TextSecondary>{t('backup.forYourEyesOnly')}</TextSecondary>
              <Shadow lighter>
                <FlexCol gap='10px'>
                  <InputFake testId='private-key' text={showSecret ? secret : '*******'} />
                  {showSecret ? (
                    <Button onClick={handleCopy} label={t('backup.copyToClipboard')} />
                  ) : (
                    <Button
                      onClick={toggleDialog}
                      label={isMnemonicWallet ? t('backup.viewRecoveryPhrase') : t('backup.viewPrivateKey')}
                    />
                  )}
                  <FlexRow>
                    <OkIcon />
                    <Text small>{t('backup.enoughToRestore')}</Text>
                  </FlexRow>
                </FlexCol>
              </Shadow>
              {showSecret ? (
                <WarningBox text={isMnemonicWallet ? t('backup.phraseWarning') : t('backup.privateKeyWarning')} />
              ) : null}
            </FlexCol>
            <Toggle
              checked={config.nostrBackup}
              onClick={toggleNostrBackup}
              text={t('backup.enableNostrBackups')}
              subtext={t('backup.nostrBackupsSubtext')}
              testId='toggle-backup'
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
