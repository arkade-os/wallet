import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import Loading from '../../../components/Loading'
import Padded from '../../../components/Padded'
import Text, { TextSecondary } from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { copyToClipboard } from '../../../lib/clipboard'
import type { AssetDetails } from '@arkade-os/sdk'

export default function AppAssetDetail() {
  const { navigate } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { assetInfo, setAssetInfo, setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { assetBalances, svcWallet, assetMetadataCache } = useContext(WalletContext)

  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<AssetDetails | null>(null)

  const assetId = assetInfo.assetId ?? ''
  const balance = assetBalances.find((a) => a.assetId === assetId)?.amount ?? 0

  useEffect(() => {
    const load = async () => {
      if (!svcWallet || !assetId) return

      let cached = assetMetadataCache.get(assetId)
      if (!cached) {
        try {
          cached = await svcWallet.assetManager.getAssetDetails(assetId)
          if (cached) assetMetadataCache.set(assetId, cached)
        } catch (err) {
          consoleError(err, 'error loading asset details')
        }
      }

      setDetails(cached)
      setAssetInfo({ ...assetInfo, details: cached })
      setLoading(false)
    }
    load()
  }, [svcWallet, assetId])

  if (loading) return <Loading text='Loading asset...' />

  const meta = details?.metadata
  const name = meta?.name ?? 'Unknown Asset'
  const ticker = meta?.ticker ?? ''
  const decimals = meta?.decimals ?? 8
  const supply = details?.supply ?? 'Unknown'
  const controlAssetId = details?.controlAssetId
  const truncateId = (id: string) => `${id.slice(0, 12)}...${id.slice(-12)}`

  // Check if user holds control asset
  const holdsControlAsset = controlAssetId
    ? assetBalances.some((a) => a.assetId === controlAssetId && a.amount > 0)
    : false

  const isImported = config.importedAssets.includes(assetId)
  const canRemove = isImported && balance === 0

  const handleCopyId = () => {
    copyToClipboard(assetId)
  }

  const handleSend = () => {
    setSendInfo({ ...emptySendInfo, assets: [{ assetId, amount: 0 }] })
    navigate(Pages.SendForm)
  }

  const handleReceive = () => {
    setRecvInfo({ ...emptyRecvInfo, assetId })
    navigate(Pages.ReceiveAmount)
  }

  const handleReissue = () => {
    navigate(Pages.AppAssetReissue)
  }

  const handleBurn = () => {
    navigate(Pages.AppAssetBurn)
  }

  const handleRemove = () => {
    const updated = config.importedAssets.filter((id) => id !== assetId)
    updateConfig({ ...config, importedAssets: updated })
    navigate(Pages.AppAssets)
  }

  return (
    <>
      <Header text={name} back={() => navigate(Pages.AppAssets)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            {meta?.icon ? (
              <img src={meta.icon} alt='' width={64} height={64} style={{ borderRadius: '50%', alignSelf: 'center' }} />
            ) : null}

            <FlexCol gap='0.25rem'>
              <Text bold>
                {balance} {ticker}
              </Text>
              <TextSecondary>Balance</TextSecondary>
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <div onClick={handleCopyId} style={{ cursor: 'pointer' }}>
                <Text color='dark50' smaller>
                  {truncateId(assetId)}
                </Text>
              </div>
              <TextSecondary>Asset ID (tap to copy)</TextSecondary>
            </FlexCol>

            <FlexRow between>
              <TextSecondary>Supply</TextSecondary>
              <Text>{supply}</Text>
            </FlexRow>

            <FlexRow between>
              <TextSecondary>Decimals</TextSecondary>
              <Text>{decimals}</Text>
            </FlexRow>

            {ticker ? (
              <FlexRow between>
                <TextSecondary>Ticker</TextSecondary>
                <Text>{ticker}</Text>
              </FlexRow>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <FlexRow gap='0.5rem'>
          <Button label='Send' onClick={handleSend} disabled={balance === 0} />
          <Button label='Receive' onClick={handleReceive} />
        </FlexRow>
        {holdsControlAsset ? <Button label='Reissue' onClick={handleReissue} secondary /> : null}
        {balance > 0 ? <Button label='Burn' onClick={handleBurn} secondary /> : null}
        {canRemove ? <Button label='Remove' onClick={handleRemove} secondary /> : null}
      </ButtonsOnBottom>
    </>
  )
}
