import { invalidPrivateKey, nsecToPrivateKey } from '../../lib/privateKey'
import { NavigationContext, Pages } from '../../providers/navigation'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { useContext, useEffect, useState } from 'react'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import { extractError } from '../../lib/error'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import Input from '../../components/Input'
import Error from '../../components/Error'
import Text from '../../components/Text'
import { hex } from '@scure/base'

export default function InitRestore() {
  const { navigate } = useContext(NavigationContext)
  const { setInitInfo } = useContext(FlowContext)

  const buttonLabel = 'Continue'

  const [error, setError] = useState('')
  const [label, setLabel] = useState(buttonLabel)
  const [privateKey, setPrivateKey] = useState<Uint8Array>()
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
    setInitInfo({ privateKey, restoring: true })
    navigate(Pages.InitPassword)
  }

  const disabled = Boolean(!privateKey || error)

  return (
    <>
      <Header text='Restore wallet' back={handleCancel} />
      <Content>
        <Padded>
          <FlexCol between>
            <FlexCol>
              <Input label='Private key' onChange={setSomeKey} />
              <Error error={Boolean(error)} text={error} />
            </FlexCol>
            <Text color='dark70' thin small>
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
