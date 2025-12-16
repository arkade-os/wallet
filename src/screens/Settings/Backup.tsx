import { useIonToast } from '@ionic/react'
import { useState, useEffect, useContext, useRef } from 'react'
import Button from '../../components/Button'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { copyToClipboard } from '../../lib/clipboard'
import Header from './Header'
import Text, { TextSecondary } from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { backupToNostr, copiedToClipboard } from '../../lib/toast'
import { getPrivateKey, privateKeyToNsec } from '../../lib/privateKey'
import { consoleError } from '../../lib/logs'
import Shadow from '../../components/Shadow'
import { defaultPassword } from '../../lib/constants'
import { ConfigContext } from '../../providers/config'
import Toggle from '../../components/Toggle'
import { BackupProvider } from '../../lib/backup'
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

export default function Backup() {
  const { wallet } = useContext(WalletContext)
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)

  const [present] = useIonToast()

  const [nsec, setNsec] = useState('')
  const [pubkey, setPubkey] = useState('')
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(false)
  const [showNsec, setShowNsec] = useState(false)

  const enteredPassword = useRef('')

  useEffect(() => {
    verifyPassword(defaultPassword).then(setNsec)
  }, [])

  useEffect(() => {
    if (wallet.pubkey) {
      setPubkey(wallet.pubkey)
    }
  }, [wallet.pubkey])

  const verifyPassword = async (password: string): Promise<string> => {
    try {
      const privateKey = await getPrivateKey(password)
      return privateKeyToNsec(privateKey)
    } catch {
      return ''
    }
  }

  const handleNsecCopy = async () => {
    if (!nsec) return
    await copyToClipboard(nsec)
    present(copiedToClipboard)
  }

  const handlePubkeyCopy = async () => {
    if (!pubkey) return
    await copyToClipboard(pubkey)
    present(copiedToClipboard)
  }

  const onChangePassword = (e: any) => {
    enteredPassword.current = e.target.value
  }

  const showPrivateKey = async () => {
    if (!nsec) {
      const password = wallet.lockedByBiometrics
        ? await authenticateUser(wallet.passkeyId).catch(setError)
        : enteredPassword.current
      if (!password) return
      const privateKey = await verifyPassword(password)
      setError(privateKey ? '' : 'Invalid password')
      setNsec(privateKey ?? '')
    }
    setShowNsec(true)
    setDialog(false)
  }

  const toggleDialog = () => {
    setDialog(!dialog)
  }

  const toggleNostrBackup = async () => {
    const newConfig = { ...config, nostrBackup: !config.nostrBackup }
    updateConfig(newConfig)
    if (newConfig.nostrBackup) {
      const backupProvider = new BackupProvider({ pubkey: config.pubkey })
      await backupProvider.fullBackup(newConfig).catch((error) => {
        consoleError(error, 'Backup to Nostr failed')
        setError('Backup to Nostr failed')
        return
      })
    } else {
      backupConfig(newConfig)
    }
    present(backupToNostr)
  }

  const Dialog = () => (
    <FlexCol gap='1.5rem'>
      <FlexCol centered gap='0.5rem'>
        <Text big bold>
          Private key
        </Text>
        <TextSecondary centered wrap>
          Your Private Key is the key used to back up your wallet. Keep it secret and secure at all times.
        </TextSecondary>
      </FlexCol>
      {!nsec ? (
        wallet.lockedByBiometrics ? (
          <FlexCol centered gap='0.5rem'>
            <FingerprintIcon />
            <Text centered>Unlock with your passkey</Text>
          </FlexCol>
        ) : (
          <FlexCol gap='0.5rem' testId='backup-password-input'>
            <TextSecondary>Enter your password</TextSecondary>
            <InputPassword onChange={onChangePassword} />
            <ErrorMessage error={Boolean(error)} text={error} />
          </FlexCol>
        )
      ) : null}
      <FlexCol gap='0.25rem'>
        <FlexRow>
          <SafeIcon />
          <TextSecondary>Keep your private key safe</TextSecondary>
        </FlexRow>
        <FlexRow>
          <DontIcon />
          <TextSecondary>Don't share it with anyone</TextSecondary>
        </FlexRow>
        <FlexRow>
          <XIcon />
          <TextSecondary>If you lose it you can't recover it</TextSecondary>
        </FlexRow>
      </FlexCol>
      <FlexRow>
        <Button onClick={toggleDialog} label='Cancel' secondary />
        <Button onClick={showPrivateKey} label='Confirm' />
      </FlexRow>
    </FlexCol>
  )

  return (
    <>
      <Header text='Backup' back />
      {dialog ? (
        <Modal>
          <Dialog />
        </Modal>
      ) : null}
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            {!wallet.isReadonly ? (
              <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
                <Text thin>Private key</Text>
                <TextSecondary>For your eyes only, do not share.</TextSecondary>
                <Shadow lighter>
                  <FlexCol gap='10px'>
                    <InputFake testId='private-key' text={showNsec ? nsec : '*******'} />
                    {showNsec ? (
                      <Button onClick={handleNsecCopy} label='Copy to clipboard' />
                    ) : (
                      <Button onClick={toggleDialog} label='View private key' />
                    )}
                    <FlexRow>
                      <OkIcon />
                      <Text small>This is enough to restore your wallet.</Text>
                    </FlexRow>
                  </FlexCol>
                </Shadow>
                {showNsec ? (
                  <WarningBox text="Your Private Key can be used to access everything in your wallet. Don't share it with anyone." />
                ) : null}
              </FlexCol>
            ) : null}
            <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
              <Text thin>Public key</Text>
              <Shadow lighter>
                <FlexCol gap='10px'>
                  <InputFake testId='public-key' text={pubkey} />
                  <Button onClick={handlePubkeyCopy} label='Copy to clipboard' />
                  <FlexRow>
                    <OkIcon />
                    <Text small>This is enough to restore your wallet in read-only mode.</Text>
                  </FlexRow>
                </FlexCol>
              </Shadow>
            </FlexCol>
            <Toggle
              checked={config.nostrBackup}
              onClick={toggleNostrBackup}
              text='Enable Nostr backups'
              subtext='Turn Nostr backups on or off'
              testId='toggle-backup'
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
