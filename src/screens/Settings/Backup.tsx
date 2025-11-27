import { useIonToast } from '@ionic/react'
import { useState, useEffect, useContext } from 'react'
import Button from '../../components/Button'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { copyToClipboard } from '../../lib/clipboard'
import Header from './Header'
import Text from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { backupToNostr, copiedToClipboard } from '../../lib/toast'
import { getPrivateKey, privateKeyToNsec } from '../../lib/privateKey'
import { consoleError } from '../../lib/logs'
import NeedsPassword from '../../components/NeedsPassword'
import Shadow from '../../components/Shadow'
import { defaultPassword } from '../../lib/constants'
import { ConfigContext } from '../../providers/config'
import Toggle from '../../components/Toggle'
import { BackupProvider } from '../../lib/backup'
import ErrorMessage from '../../components/Error'
import SafeIcon from '../../icons/Safe'
import FlexRow from '../../components/FlexRow'
import CenterScreen from '../../components/CenterScreen'
import DontIcon from '../../icons/Dont'
import XIcon from '../../icons/X'
import WarningBox from '../../components/Warning'
import Modal from '../../components/Modal'

export default function Backup() {
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)

  const [present] = useIonToast()

  const [nsec, setNsec] = useState('')
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(false)
  const [password, setPassword] = useState('')
  const [showNsec, setShowNsec] = useState(false)

  useEffect(() => {
    const pass = password ? password : defaultPassword
    getPrivateKey(pass)
      .then((privateKey) => {
        setNsec(privateKeyToNsec(privateKey))
      })
      .catch((err) => {
        if (password) {
          consoleError(err, 'error unlocking wallet')
          setError('Invalid password')
        }
      })
  }, [password])

  const handleCopy = async () => {
    if (!nsec) return
    await copyToClipboard(nsec)
    present(copiedToClipboard)
  }

  const showPrivateKey = () => {
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
    <CenterScreen>
      <Shadow>
        <FlexCol>
          <FlexCol centered gap='0.5rem'>
            <Text big bold>
              Private key
            </Text>
            <Text small wrap>
              Your Private Key is the key used to back up your wallet. Keep it secret and secure at all times.
            </Text>
          </FlexCol>
          {!nsec ? <p>Enter your password</p> : null}
          {!nsec ? <input type='password' onChange={(e) => setPassword(e.target.value)} /> : null}
          <FlexCol gap='0.25rem'>
            <FlexRow>
              <SafeIcon />
              <Text small>Keep your private key safe</Text>
            </FlexRow>
            <FlexRow>
              <DontIcon />
              <Text small>Don't share it with anyone</Text>
            </FlexRow>
            <FlexRow>
              <XIcon />
              <Text small>If you lose it you can't recover it</Text>
            </FlexRow>
          </FlexCol>
          <FlexRow>
            <Button onClick={toggleDialog} label='Cancel' secondary />
            <Button onClick={showPrivateKey} label='Confirm' />
          </FlexRow>
        </FlexCol>
      </Shadow>
    </CenterScreen>
  )

  return (
    <>
      <Header text='Backup' back />
      {dialog ? (
        nsec ? (
          <Modal>
            <Dialog />
          </Modal>
        ) : (
          <Modal>
            <NeedsPassword onPassword={setPassword} error={error} />
          </Modal>
        )
      ) : (
        <Content>
          <Padded>
            <FlexCol gap='2rem'>
              <ErrorMessage error={Boolean(error)} text={error} />
              <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
                <Text thin>Private key</Text>
                <Shadow>
                  <div style={{ padding: '10px' }}>
                    <Text small wrap>
                      {showNsec ? nsec : '*******'}
                    </Text>
                  </div>
                </Shadow>
                {showNsec ? (
                  <Button onClick={handleCopy} label='Copy to clipboard' />
                ) : (
                  <Button onClick={toggleDialog} label='View private key' />
                )}
                {showNsec ? (
                  <WarningBox text="Your Private Key can be used to access everything in your wallet. Don't share it with anyone." />
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
      )}
    </>
  )
}
