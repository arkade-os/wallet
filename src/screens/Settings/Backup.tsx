import { useIonToast } from '@ionic/react'
import { useState, useEffect, useContext } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { copyToClipboard } from '../../lib/clipboard'
import Header from './Header'
import Text, { TextSecondary } from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { copiedToClipboard } from '../../lib/toast'
import { getPrivateKey, privateKeyToNsec } from '../../lib/privateKey'
import { consoleError } from '../../lib/logs'
import NeedsPassword from '../../components/NeedsPassword'
import Shadow from '../../components/Shadow'
import { defaultPassword } from '../../lib/constants'
import { ConfigContext } from '../../providers/config'
import Toggle from '../../components/Toggle'

export default function Backup() {
  const { config, updateConfig } = useContext(ConfigContext)

  const [present] = useIonToast()

  const [nsec, setNsec] = useState('')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

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

  const toggleNostrBackup = () => {
    updateConfig({ ...config, nostrBackup: !config.nostrBackup }, true)
  }

  return (
    <>
      <Header text='Backup' back />
      {nsec ? (
        <>
          <Content>
            <Padded>
              <FlexCol gap='2rem'>
                <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
                  <Text thin>Private key</Text>
                  <Shadow>
                    <div style={{ padding: '10px' }}>
                      <Text small wrap>
                        {nsec}
                      </Text>
                    </div>
                  </Shadow>
                  <TextSecondary>This is enough to restore your wallet.</TextSecondary>
                </FlexCol>
                <Toggle
                  checked={config.nostrBackup}
                  onClick={toggleNostrBackup}
                  text='Enable Nostr backups'
                  subtext='Turn Nostr backups on or off'
                />
              </FlexCol>
            </Padded>
          </Content>
          <ButtonsOnBottom>
            <Button onClick={handleCopy} label='Copy nsec to clipboard' />
          </ButtonsOnBottom>
        </>
      ) : (
        <NeedsPassword onPassword={setPassword} error={error} />
      )}
    </>
  )
}
