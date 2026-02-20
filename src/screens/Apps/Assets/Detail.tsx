import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import Loading from '../../../components/Loading'
import Padded from '../../../components/Padded'
import Shadow from '../../../components/Shadow'
import Text, { TextSecondary } from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
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
          <FlexCol gap='1rem' centered>
            {meta?.icon ? (
              <img src={meta.icon} alt='' width={64} height={64} style={{ borderRadius: '50%' }} />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'var(--dark20)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text big>{ticker?.[0] ?? name?.[0] ?? 'A'}</Text>
              </div>
            )}

            <FlexCol gap='0.25rem' centered>
              <Text bigger bold centered>
                {balance} {ticker}
              </Text>
              <TextSecondary centered>{name}</TextSecondary>
            </FlexCol>

            <FlexCol gap='0.25rem' centered>
              <Text copy={assetId} color='dark50' smaller centered>
                {truncateId(assetId)}
              </Text>
              <TextSecondary centered>Asset ID (tap to copy)</TextSecondary>
            </FlexCol>

            <Shadow lighter>
              <FlexCol gap='0.5rem' padding='0.75rem'>
                <FlexRow between>
                  <TextSecondary>Supply</TextSecondary>
                  <Text bold>{supply}</Text>
                </FlexRow>
                <FlexRow between>
                  <TextSecondary>Decimals</TextSecondary>
                  <Text bold>{decimals}</Text>
                </FlexRow>
                {ticker ? (
                  <FlexRow between>
                    <TextSecondary>Ticker</TextSecondary>
                    <Text bold>{ticker}</Text>
                  </FlexRow>
                ) : null}
              </FlexCol>
            </Shadow>
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
