import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { ConfigContext } from '../../providers/config'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { copyToClipboard } from '../../lib/clipboard'
import { invalidNpub } from '../../lib/privateKey'
import Error from '../../components/Error'
import Header from './Header'
import Toggle from '../../components/Toggle'
import { TextSecondary } from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import InputNpub from '../../components/InputNpub'
import Scanner from '../../components/Scanner'
import { useIonToast } from '@ionic/react'
import { copiedToClipboard } from '../../lib/toast'

export default function Nostr() {
  const { config, updateConfig } = useContext(ConfigContext)

  const [error, setError] = useState('')
  const [npub, setNpub] = useState('')
  const [scan, setScan] = useState(false)
  const [present] = useIonToast()

  useEffect(() => {
    if (config.npub) setNpub(config.npub)
  }, [])

  useEffect(() => {
    setError(invalidNpub(npub))
  }, [npub])

  const handleCheck = () => {
    updateConfig({ ...config, nostr: !config.nostr })
  }

  const handleCopy = async () => {
    await copyToClipboard(npub)
    present(copiedToClipboard)
  }

  const handleSave = () => {
    updateConfig({ ...config, npub })
    // setNostrNotificationRecipient(npub)
    throw 'not implemented'
  }

  const showCopyButton = config.nostr && config.npub === npub && npub
  const showSaveButton = config.nostr && config.npub !== npub && !error

  if (scan) return <Scanner close={() => setScan(false)} label='Nostr npub' setData={setNpub} setError={setError} />

  return (
    <>
      <Header text='Nostr' back />
      <Content>
        <Toggle checked={config.nostr} label='Nostr' onClick={handleCheck} text='Allow Nostr' />
        <Padded>
          <FlexCol gap='2rem' margin='2rem 0 0 0'>
            <TextSecondary wrap>
              If you let your VTXOs expire, you will receive, on Nostr, via encrypted DM, an arknote with the same
              value, that you will be able to redeem later.
            </TextSecondary>
            {config.nostr ? (
              <FlexCol>
                <InputNpub
                  focus
                  label='Nostr public key (npub)'
                  onChange={setNpub}
                  openScan={() => setScan(true)}
                  value={npub}
                />
                <Error error={Boolean(error)} text={error} />
              </FlexCol>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
      {config.nostr ? (
        <ButtonsOnBottom>
          {showCopyButton ? <Button onClick={handleCopy} label='Copy to clipboard' /> : null}
          {showSaveButton ? <Button onClick={handleSave} label='Save new npub' /> : null}
        </ButtonsOnBottom>
      ) : null}
    </>
  )
}
