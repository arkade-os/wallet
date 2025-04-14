import { useState, useContext } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Padded from '../../components/Padded'
import Textarea from '../../components/Textarea'
import Content from '../../components/Content'
import { copyToClipboard } from '../../lib/clipboard'
import Header from './Header'
import { TextSecondary } from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { copiedToClipboard } from '../../lib/toast'
import { useIonToast } from '@ionic/react'
import { WalletContext } from '../../providers/wallet'
import { getPrivateKey, privateKeyToNsec } from '../../lib/privateKey'
import { authenticateUser } from '../../lib/biometrics'
import { consoleError } from '../../lib/logs'

export default function Backup() {
  const { wallet } = useContext(WalletContext)
  const [nsec, setNsec] = useState('')
  const [present] = useIonToast()
  const [loading, setLoading] = useState(false)

  const handleBackup = async () => {
    try {
      setLoading(true)
      const password = await authenticateUser(wallet.passkeyId)
      const privateKey = await getPrivateKey(password)
      const nsec = privateKeyToNsec(privateKey)
      setNsec(nsec)
    } catch (error) {
      consoleError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!nsec) return
    await copyToClipboard(nsec)
    present(copiedToClipboard)
  }

  return (
    <>
      <Header text='Backup' back />
      <Content>
        <Padded>
          <FlexCol>
            <Textarea label='Private key' value={nsec} />
          </FlexCol>
          <FlexCol gap='0.5rem' margin='2rem 0 0 0'>
            <TextSecondary>This is enough to restore your wallet.</TextSecondary>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button
          onClick={nsec ? handleCopy : handleBackup}
          label={nsec ? 'Copy to clipboard' : 'Show private key'}
          loading={loading}
        />
      </ButtonsOnBottom>
    </>
  )
}
