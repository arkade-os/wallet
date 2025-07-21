import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Error from '../../components/Error'
import { NavigationContext, Pages } from '../../providers/navigation'
import Padded from '../../components/Padded'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import { invalidPrivateKey, nsecToPrivateKey } from '../../lib/privateKey'
import Header from '../../components/Header'
import FlexCol from '../../components/FlexCol'
import { extractError } from '../../lib/error'
import { hex } from '@scure/base'
import Input from '../../components/Input'

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
    setInitInfo({ privateKey })
    navigate(Pages.InitPassword)
  }

  const disabled = Boolean(!privateKey || error)

  return (
    <>
      <Header text='Restore wallet' back={handleCancel} />
      <Content>
        <Padded>
          <FlexCol>
            <Input label='Private key' onChange={setSomeKey} />
            <Error error={Boolean(error)} text={error} />
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
