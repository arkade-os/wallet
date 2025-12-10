import { invalidPrivateKey, nsecToPrivateKey } from '../../lib/privateKey'
import { NavigationContext, Pages } from '../../providers/navigation'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { useContext, useEffect, useState } from 'react'
import { ConfigContext } from '../../providers/config'
import { BackupProvider } from '../../lib/backup'
import { defaultPassword } from '../../lib/constants'
import { FlowContext } from '../../providers/flow'
import ErrorMessage from '../../components/Error'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import { extractError } from '../../lib/error'
import Loading from '../../components/Loading'
import { consoleError } from '../../lib/logs'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import Input from '../../components/Input'
import Text from '../../components/Text'
import { hex } from '@scure/base'
import { ArkAddress } from '@arkade-os/sdk'

type Props = { readonly?: boolean }
export default function InitRestore({ readonly }: Props) {
  const { updateConfig } = useContext(ConfigContext)
  const { navigate } = useContext(NavigationContext)
  const { setInitInfo } = useContext(FlowContext)

  const buttonLabel = 'Continue'

  const [error, setError] = useState('')
  const [label, setLabel] = useState(buttonLabel)
  const [privateKey, setPrivateKey] = useState<Uint8Array>()
  const [publicKey, setPublicKey] = useState<Uint8Array>()
  const [restoring, setRestoring] = useState(false)
  const [someKey, setSomeKey] = useState<string>()

  useEffect(() => {
    if (!someKey) return

    if (readonly) {
      let pubkey: Uint8Array | undefined = undefined
      try {
        const arkAddress = ArkAddress.decode(someKey)
        pubkey = arkAddress.pkScript
        setError('')
        setLabel(buttonLabel)
      } catch (e) {
        consoleError(e, `Error validating ark address ${someKey}`)
        setLabel('Unable to validate address format')
        setError(extractError(e))
      }
      setPublicKey(pubkey)
    } else {
      let privateKey = undefined
      try {
        if (someKey?.match(/^nsec/)) privateKey = nsecToPrivateKey(someKey)
        else privateKey = hex.decode(someKey)
        const invalid = invalidPrivateKey(privateKey)
        setLabel(invalid ? 'Unable to validate private key format' : buttonLabel)
        setError(invalid)
      } catch (err) {
        setLabel('Unable to validate key format')
        setError(extractError(err))
      }
      setPrivateKey(privateKey)
    }
  }, [someKey])

  const handleCancel = () => navigate(Pages.Init)

  const handleProceed = () => {
    if (readonly) {
      // tark1qra883hysahlkt0ujcwhv0x2n278849c3m7t3a08l7fdc40f4f2n65pzca77269jv9pzkc8ywdqstxfez4gd767y2pmqffhvma75f8xq9szgcu
      // nsec19wjhpzqktar0c3vfehzwjkths2wcw3uehpck3xqf8klq2w9s2lzqv00k42
      setInitInfo({ publicKey })
      navigate(Pages.InitSuccess)
    } else {
      setInitInfo({ privateKey, password: defaultPassword, restoring: true })
      setRestoring(true)
      new BackupProvider({ seckey: privateKey! })
        .restore(updateConfig)
        .catch((err) => consoleError(err, 'Error restoring from nostr'))
        .finally(() => {
          setRestoring(false)
          navigate(Pages.InitSuccess)
        })
    }
  }

  const disabled = Boolean((readonly ? !publicKey : !privateKey) || error)

  if (restoring) return <Loading text='Restoring wallet...' />

  if (readonly)
    return (
      <>
        <Header text='Restore readonly wallet' back={handleCancel} />
        <Content>
          <Padded>
            <FlexCol between>
              <FlexCol>
                <Input name='ark-address' label='ARK Address' onChange={setSomeKey} />
                <ErrorMessage error={Boolean(error)} text={error} />
              </FlexCol>
              <Text centered color='dark70' fullWidth thin small>
                Your ARK address should start with the 'ark' string. Do not share it with anyone.
              </Text>
            </FlexCol>
          </Padded>
        </Content>
        <ButtonsOnBottom>
          <Button onClick={handleProceed} label={label} disabled={disabled} />
          <Button onClick={handleCancel} label='Cancel' secondary />
        </ButtonsOnBottom>
      </>
    )

  return (
    <>
      <Header text='Restore wallet' back={handleCancel} />
      <Content>
        <Padded>
          <FlexCol between>
            <FlexCol>
              <Input name='private-key' label='Private key' onChange={setSomeKey} />
              <ErrorMessage error={Boolean(error)} text={error} />
            </FlexCol>
            <Text centered color='dark70' fullWidth thin small>
              Your private key should start with the 'nsec' string. Do not share it with anyone.
            </Text>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleProceed} label={label} disabled={disabled} />
        <Button onClick={handleCancel} label='Cancel' secondary />
      </ButtonsOnBottom>
    </>
  )
}
