import { useContext, useEffect, useState } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Toggle from '../../../components/Toggle'
import Text from '../../../components/Text'
import { LightningContext } from '../../../providers/lightning'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'

export default function AppBoltzSettings() {
  const { connected, getApiUrl, restoreSwaps, toggleConnection } = useContext(LightningContext)


  const [counter, setCounter] = useState(0)
  const [results, setResults] = useState('')

  useEffect(() => {
    if (counter !== 5) return
    restoreSwaps()
      .then((numSwapsRestored) => {
        setResults(
          numSwapsRestored === 0
            ? 'Unable to find swaps available to restore'
            : `Successfully restored ${numSwapsRestored} swaps`,
        )
      })
      .catch((error) => {
        consoleError(error, 'Error restoring swaps')
        setResults(`Error restoring swaps: ${extractError(error)}`)
      })
  }, [counter, restoreSwaps])

  return (
    <>
      <Header text='Boltz settings' back />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <Toggle
              checked={connected}
              onClick={toggleConnection}
              text='Enable Boltz'
              subtext='Turn Boltz integration on or off'
            />
            <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
              <div onClick={() => setCounter((c) => (c += 1))}>
                <Text thin>Boltz API URL</Text>
              </div>
              <Text color='dark50' small thin>
                {getApiUrl() ?? 'No server available'}
              </Text>
            </FlexCol>
            {results ? (
              <Text small thin>
                {results}
              </Text>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
