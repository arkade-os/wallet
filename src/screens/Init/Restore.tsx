import { invalidPrivateKey, nsecToPrivateKey } from '../../lib/privateKey'
import { NavigationContext, Pages } from '../../providers/navigation'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { useContext, useEffect, useState } from 'react'
import { defaultPassword } from '../../lib/constants'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import { extractError } from '../../lib/error'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import Input from '../../components/Input'
import ErrorMessage from '../../components/Error'
import Text from '../../components/Text'
import { hex } from '@scure/base'
import { NostrStorage } from '../../lib/nostr'
import { consoleError } from '../../lib/logs'
import { ContractRepositoryImpl } from '@arkade-os/sdk'
import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB'
import { ConfigContext } from '../../providers/config'
import { Config } from '../../lib/types'
import { PendingReverseSwap, PendingSubmarineSwap } from '@arkade-os/boltz-swap'

export default function InitRestore() {
  const { updateConfig } = useContext(ConfigContext)
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
    setInitInfo({ privateKey, password: defaultPassword, restoring: true })
    const nostrStorage = new NostrStorage({ secKey: privateKey! })
    nostrStorage
      .load('arkade_boltz_swaps')
      .then(async (data) => {
        if (!data) return null
        console.log('data loaded from nostr:', data, JSON.parse(data))
        const storage = new IndexedDBStorageAdapter('arkade-service-worker')
        const contractRepo = new ContractRepositoryImpl(storage)
        const { config, reverseSwaps, submarineSwaps } = JSON.parse(data) as {
          config: Config
          reverseSwaps: PendingReverseSwap[]
          submarineSwaps: PendingSubmarineSwap[]
        }
        // restore config and swaps
        updateConfig(config)
        for (const swap of reverseSwaps) {
          await contractRepo.saveToContractCollection('reverseSwaps', swap, 'id')
        }
        for (const swap of submarineSwaps) {
          await contractRepo.saveToContractCollection('submarineSwaps', swap, 'id')
        }
      })
      .catch((err) => {
        console.log('rrrrrrrr', err)
        consoleError(err, 'Error loading boltz swaps from nostr')
        return null
      })
    navigate(Pages.InitSuccess)
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
