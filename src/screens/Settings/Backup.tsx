import { useIonToast } from '@ionic/react'
import { useState, useEffect } from 'react'
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
import { extractError } from '../../lib/error'
import NeedsPassword from '../../components/NeedsPassword'
import Shadow from '../../components/Shadow'

export default function Backup() {
  const [present] = useIonToast()

  const [nsec, setNsec] = useState('')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!password) return
    getPrivateKey(password)
      .then((privateKey) => {
        setNsec(privateKeyToNsec(privateKey))
      })
      .catch((err) => {
        consoleError(err, 'error unlocking wallet')
        setError(extractError(err))
      })
  }, [password])

  const handleCopy = async () => {
    if (!nsec) return
    await copyToClipboard(nsec)
    present(copiedToClipboard)
  }

  return (
    <>
      <Header text='Backup' back />
      {nsec ? (
        <>
          <Content>
            <Padded>
              <FlexCol>
                <FlexCol gap='0.5rem'>
                  <Text capitalize color='dark50' smaller>
                    Private key
                  </Text>
                  <Shadow>
                    <div style={{ padding: '10px' }}>
                      <Text small wrap>
                        {nsec}
                      </Text>
                    </div>
                  </Shadow>
                </FlexCol>
                <TextSecondary>This is enough to restore your wallet.</TextSecondary>
              </FlexCol>
            </Padded>
          </Content>
          <ButtonsOnBottom>
            <Button onClick={handleCopy} label='Copy to clipboard' />
          </ButtonsOnBottom>
        </>
      ) : (
        <NeedsPassword onPassword={setPassword} error={error} />
      )}
    </>
  )
}
