import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Error from '../../components/Error'
import { NavigationContext, Pages } from '../../providers/navigation'
import Padded from '../../components/Padded'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import { invalidPrivateKey, nsecToSeed } from '../../lib/privateKey'
import Textarea from '../../components/Textarea'
import Header from '../../components/Header'
import FlexCol from '../../components/FlexCol'
import { extractError } from '../../lib/error'

export default function InitRestore() {
  const { navigate } = useContext(NavigationContext)
  const { setInitInfo } = useContext(FlowContext)

  const buttonLabel = 'Continue'

  const [error, setError] = useState('')
  const [label, setLabel] = useState(buttonLabel)
  const [privateKey, setPrivateKey] = useState('')
  const [someKey, setSomeKey] = useState('')

  useEffect(() => {
    let privateKey = someKey
    try {
      if (someKey.match(/^nsec/)) privateKey = nsecToSeed(someKey)
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
            <Textarea label='Private key' onChange={setSomeKey} value={someKey} />
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
