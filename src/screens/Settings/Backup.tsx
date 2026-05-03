import { useToast } from '../../components/Toast'
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
import { IndexedDbSwapRepository } from '@arkade-os/boltz-swap'
import { SwapsContext } from '../../providers/swaps'

export default function Backup() {
  const { wallet } = useContext(WalletContext)
  const { arkadeSwaps } = useContext(SwapsContext)
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)

  const { toast } = useToast()

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
    toast('Copied to clipboard')
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
      setError(result ? '' : 'Invalid password')
      setSecret(result ?? '')
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
    console.log('Updating backup with new config', newConfig)
    if (newConfig.nostrBackup) {
      const backupProvider = new BackupProvider({ pubkey: config.pubkey }, new IndexedDbSwapRepository())
      await backupProvider.fullBackup(newConfig, arkadeSwaps ?? undefined).catch((error) => {
        consoleError(error, 'Backup to Nostr failed')
        setError('Backup to Nostr failed')
        return
      })
    } else {
      backupConfig(newConfig)
    }
    toast('Nostr backup updated')
  }

  const secretLabel = isMnemonicWallet ? 'Recovery phrase' : 'Private key'

  const Dialog = () => (
    <FlexCol gap='1.5rem'>
      <FlexCol centered gap='0.5rem'>
        <Text big medium heading>
          {secretLabel}
        </Text>
        <TextSecondary centered wrap>
          {isMnemonicWallet
            ? 'Your recovery phrase is used to back up your wallet. Keep it secret and secure at all times.'
            : 'Your private key is used to back up your wallet. Keep it secret and secure at all times.'}
        </TextSecondary>
      </FlexCol>
      {!secret ? (
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
          <TextSecondary>Keep your {secretLabel.toLowerCase()} safe</TextSecondary>
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
            <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
              <Text thin>{secretLabel}</Text>
              <TextSecondary>For your eyes only, do not share.</TextSecondary>
              <Shadow lighter>
                <FlexCol gap='10px'>
                  <InputFake testId='private-key' text={showSecret ? secret : '*******'} />
                  {showSecret ? (
                    <Button onClick={handleCopy} label='Copy to clipboard' />
                  ) : (
                    <Button onClick={toggleDialog} label={`View ${secretLabel.toLowerCase()}`} />
                  )}
                  <FlexRow>
                    <OkIcon />
                    <Text small>This is enough to restore your wallet.</Text>
                  </FlexRow>
                </FlexCol>
              </Shadow>
              {showSecret ? (
                <WarningBox
                  text={
                    isMnemonicWallet
                      ? "Your recovery phrase can be used to access everything in your wallet. Don't share it with anyone."
                      : "Your private key can be used to access everything in your wallet. Don't share it with anyone."
                  }
                />
              ) : null}
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
