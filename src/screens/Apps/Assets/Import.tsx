import { useContext, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import LoadingLogo from '../../../components/LoadingLogo'
import Padded from '../../../components/Padded'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import InputAssetId from '../../../components/InputAssetId'
import Scanner from '../../../components/Scanner'
import { isValidAssetId } from '../../../lib/assets'
import { BackupContext } from '@/providers/backup'
import { useTranslation } from '../../../providers/language'

export default function AppAssetImport() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { replace } = useContext(NavigationContext)
  const { config } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { svcWallet, setCacheEntry } = useContext(WalletContext)
  const { t } = useTranslation()

  const [assetId, setAssetId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scan, setScan] = useState(false)

  const handleImport = async () => {
    if (!svcWallet) return
    if (!isValidAssetId(assetId)) {
      setError(t('mint.assetIdMustBeHex'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const details = await svcWallet.assetManager.getAssetDetails(assetId)
      if (!details) throw new Error(t('mint.assetNotFound'))

      const moderated = setCacheEntry(assetId, details)

      // Add to imported assets if not already there
      if (!config.importedAssets.includes(assetId)) {
        backupAndUpdateConfig({ ...config, importedAssets: [...config.importedAssets, assetId] })
      }

      setAssetInfo(moderated)
      replace(Pages.AppAssetDetail, Pages.AppAssets)
    } catch (err) {
      consoleError(err, 'error importing asset')
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingLogo text={t('loading.fetchAssetDetails')} />

  if (scan)
    return <Scanner close={() => setScan(false)} label={t('notes.arkNote')} onData={setAssetId} onError={setError} />

  return (
    <>
      <Header text={t('mint.importAsset')} back />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage error={Boolean(error)} text={error} />
            <InputAssetId
              name='asset-id'
              focus
              label={t('mint.assetId')}
              onChange={setAssetId}
              onEnter={handleImport}
              openScan={() => setScan(true)}
              value={assetId}
            />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label={t('mint.import')} onClick={handleImport} disabled={!assetId} />
      </ButtonsOnBottom>
    </>
  )
}
