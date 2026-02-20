import { useContext, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import InputAddress from '../../../components/InputAddress'
import Loading from '../../../components/Loading'
import Padded from '../../../components/Padded'
import Scanner from '../../../components/Scanner'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'

export default function AppAssetImport() {
  const { navigate } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { svcWallet, assetMetadataCache, setCacheEntry } = useContext(WalletContext)

  const [assetId, setAssetId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scan, setScan] = useState(false)

  const isValidAssetId = (id: string) => /^[0-9a-fA-F]{68}$/.test(id)

  const handleImport = async () => {
    if (!svcWallet) return
    if (!isValidAssetId(assetId)) {
      setError('Asset ID must be a 68-character hex string')
      return
    }

    setLoading(true)
    setError('')

    try {
      const details = await svcWallet.assetManager.getAssetDetails(assetId)
      if (!details) throw new Error('Asset not found')

      setCacheEntry(assetId, details)

      // Add to imported assets if not already there
      if (!config.importedAssets.includes(assetId)) {
        updateConfig({ ...config, importedAssets: [...config.importedAssets, assetId] })
      }

      setAssetInfo({ assetId, details })
      navigate(Pages.AppAssetDetail)
    } catch (err) {
      consoleError(err, 'error importing asset')
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  if (scan) {
    return <Scanner close={() => setScan(false)} label='Asset ID' onData={setAssetId} onError={setError} />
  }

  if (loading) return <Loading text='Fetching asset details...' />

  return (
    <>
      <Header text='Import Asset' back={() => navigate(Pages.AppAssets)} />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage error={Boolean(error)} text={error} />
            <InputAddress
              name='asset-id'
              focus
              label='Asset ID'
              onChange={setAssetId}
              onEnter={handleImport}
              openScan={() => setScan(true)}
              value={assetId}
            />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Import' onClick={handleImport} disabled={!assetId} />
      </ButtonsOnBottom>
    </>
  )
}
