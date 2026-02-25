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
import { OnboardStaggerContainer, OnboardStaggerChild } from '../../components/OnboardLoadIn'

export default function InitRestore() {
  const { updateConfig } = useContext(ConfigContext)
  const { navigate } = useContext(NavigationContext)
  const { setInitInfo } = useContext(FlowContext)

  const buttonLabel = 'Continue'

  const [error, setError] = useState('')
  const [label, setLabel] = useState(buttonLabel)
  const [privateKey, setPrivateKey] = useState<Uint8Array>()
  const [restoring, setRestoring] = useState(false)
  const [someKey, setSomeKey] = useState<string>()

  useEffect(() => {
    if (!someKey) return
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
  }, [someKey])

  const handleCancel = () => navigate(Pages.Init)

  const handleProceed = () => {
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

  const disabled = Boolean(!privateKey || error)

  if (restoring) return <Loading text='Restoring wallet...' />

  return (
    <>
      <Header text='Restore wallet' back />
      <Content>
        <Padded>
          <OnboardStaggerContainer>
            <OnboardStaggerChild>
              <FlexCol between>
                <FlexCol>
                  <Input name='private-key' label='Private key' onChange={setSomeKey} />
                  <ErrorMessage error={Boolean(error)} text={error} />
                </FlexCol>
                <Text centered color='dark70' fullWidth thin small>
                  Your private key should start with the 'nsec' string. Do not share it with anyone.
                </Text>
              </FlexCol>
            </OnboardStaggerChild>
          </OnboardStaggerContainer>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleProceed} label={label} disabled={disabled} />
        <Button onClick={handleCancel} label='Cancel' secondary />
      </ButtonsOnBottom>
    </>
  )
}
