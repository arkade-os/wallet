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
import { getPrivateKey, nsecToPrivateKey, privateKeyToNsec } from '../../lib/privateKey'
import { consoleError } from '../../lib/logs'
import NeedsPassword from '../../components/NeedsPassword'
import Shadow from '../../components/Shadow'
import { defaultPassword } from '../../lib/constants'
import { NostrStorage } from '../../lib/nostr'
import { WalletContext } from '../../providers/wallet'
import FlexRow from '../../components/FlexRow'
import { ConfigContext } from '../../providers/config'

export default function Backup() {
  const { config, updateConfig } = useContext(ConfigContext)
  const { svcWallet } = useContext(WalletContext)

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

  const handleNostrBackup = async () => {
    if (!nsec || !svcWallet) return
    // data to backup
    const backup = {
      config,
      reverseSwaps: await svcWallet.contractRepository.getContractCollection('reverseSwaps'),
      submarineSwaps: await svcWallet.contractRepository.getContractCollection('submarineSwaps'),
    }
    // save to nostr
    const nostrStorage = new NostrStorage({ secKey: nsecToPrivateKey(nsec) })
    await nostrStorage.save('arkade_boltz_swaps', JSON.stringify(backup)).catch((err) => {
      consoleError(err, 'error saving backup to nostr')
    })
    // update last backup time in config
    const now = Math.floor(new Date().getTime() / 1000)
    updateConfig({ ...config, lastBackup: now })
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
                <FlexCol gap='0.5rem' padding='0 0 1rem 0'>
                  <Text thin>Backup to Nostr</Text>
                  <Shadow>
                    <FlexRow between>
                      <Text small wrap>
                        Last backup: {config.lastBackup ? new Date(config.lastBackup * 1000).toLocaleString() : 'never'}
                      </Text>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          minWidth: '4rem',
                        }}
                      >
                        <Button onClick={handleNostrBackup} label='Backup' />
                      </div>
                    </FlexRow>
                  </Shadow>
                  <Text color='dark50' small thin>
                    Backup your settings and swaps to Nostr.
                  </Text>
                  <Text color='dark50' small thin>
                    It will be restored when you restore your wallet using your private key.
                  </Text>
                </FlexCol>
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
