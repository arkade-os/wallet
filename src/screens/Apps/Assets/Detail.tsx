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
import AssetAvatar from '../../../components/AssetAvatar'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { formatAssetAmount } from '../../../lib/format'
import type { AssetDetails } from '@arkade-os/sdk'

export default function AppAssetDetail() {
  const { navigate } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { assetInfo, setAssetInfo, setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { assetBalances, svcWallet, assetMetadataCache, setCacheEntry } = useContext(WalletContext)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const balance = assetBalances.find((a) => a.assetId === assetInfo.assetId)?.amount ?? 0

  const fetchDetails = async (forceRefresh = false) => {
    if (!svcWallet || !assetInfo.assetId) return

    let cached: AssetDetails | undefined = forceRefresh ? undefined : assetMetadataCache.get(assetInfo.assetId)
    if (!cached) {
      try {
        cached = await svcWallet.assetManager.getAssetDetails(assetInfo.assetId)
        if (cached) setCacheEntry(assetInfo.assetId, cached)
      } catch (err) {
        consoleError(err, 'error loading asset details')
      }
    }

    if (!cached) return
    setAssetInfo(cached)
  }

  useEffect(() => {
    fetchDetails().then(() => setLoading(false))
  }, [svcWallet, assetInfo.assetId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDetails(true)
    setRefreshing(false)
  }

  if (loading) return <Loading text='Loading asset...' />

  const meta = assetInfo.metadata
  const name = meta?.name ?? 'Unknown Asset'
  const ticker = meta?.ticker ?? ''
  const decimals = meta?.decimals ?? 8
  const supply = assetInfo.supply
  const controlAssetId = assetInfo.controlAssetId
  const truncateId = (id: string) => `${id.slice(0, 12)}...${id.slice(-12)}`

  // Check if user holds control asset
  const holdsControlAsset = controlAssetId
    ? assetBalances.some((a) => a.assetId === controlAssetId && a.amount > 0)
    : false

  const isImported = config.importedAssets.includes(assetInfo.assetId)
  const canRemove = isImported && balance === 0

  const handleSend = () => {
    setSendInfo({ ...emptySendInfo, assets: [{ assetId: assetInfo.assetId, amount: 0 }] })
    navigate(Pages.SendForm)
  }

  const handleReceive = () => {
    setRecvInfo({ ...emptyRecvInfo, assetId: assetInfo.assetId })
    navigate(Pages.ReceiveAmount)
  }

  const handleReissue = () => {
    navigate(Pages.AppAssetReissue)
  }

  const handleBurn = () => {
    navigate(Pages.AppAssetBurn)
  }

  const handleRemove = () => {
    const updated = config.importedAssets.filter((id) => id !== assetInfo.assetId)
    updateConfig({ ...config, importedAssets: updated })
    navigate(Pages.AppAssets)
  }

  return (
    <>
      <Header text={name} back={() => navigate(Pages.AppAssets)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem' centered>
            <AssetAvatar icon={meta?.icon} ticker={ticker} name={name} size={64} />

            <FlexCol gap='0.25rem' centered>
              <Text bigger bold centered>
                {formatAssetAmount(balance, decimals)} {ticker}
              </Text>
              <TextSecondary centered>{name}</TextSecondary>
            </FlexCol>

            <FlexCol gap='0.25rem' centered>
              <Text copy={assetInfo.assetId} color='dark50' smaller centered>
                {truncateId(assetInfo.assetId)}
              </Text>
              <FlexRow gap='0.25rem' centered>
                <TextSecondary centered>Asset ID (tap to copy)</TextSecondary>
                <span
                  onClick={handleRefresh}
                  style={{
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--dark50)',
                    opacity: refreshing ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {refreshing ? '...' : '\u21BB'}
                </span>
              </FlexRow>
            </FlexCol>

            <Shadow lighter>
              <FlexCol gap='0.5rem' padding='0.75rem'>
                {name !== 'Unknown Asset' ? (
                  <FlexRow between>
                    <TextSecondary>Name</TextSecondary>
                    <Text bold>{name}</Text>
                  </FlexRow>
                ) : null}
                <FlexRow between>
                  <TextSecondary>Supply</TextSecondary>
                  <Text bold>{typeof supply === 'number' ? formatAssetAmount(supply, decimals) : 'Unknown'}</Text>
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
                {controlAssetId ? (
                  <FlexRow between>
                    <TextSecondary>Control Asset</TextSecondary>
                    <FlexRow gap='0.25rem' end>
                      {(() => {
                        const ctrl = assetMetadataCache.get(controlAssetId)?.metadata
                        const ctrlName = ctrl?.name ?? `${controlAssetId.slice(0, 8)}...${controlAssetId.slice(-8)}`
                        const label = ctrl?.ticker ? `${ctrlName} (${ctrl.ticker})` : ctrlName
                        return (
                          <>
                            <AssetAvatar icon={ctrl?.icon} ticker={ctrl?.ticker} size={20} />
                            <Text bold copy={controlAssetId}>
                              {label}
                            </Text>
                          </>
                        )
                      })()}
                    </FlexRow>
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
        <FlexRow gap='0.5rem'>
          <Button label='Reissue' onClick={handleReissue} secondary disabled={!holdsControlAsset} />
          {balance > 0 ? <Button label='Burn' onClick={handleBurn} secondary /> : null}
        </FlexRow>
        {canRemove ? <Button label='Remove' onClick={handleRemove} secondary /> : null}
      </ButtonsOnBottom>
    </>
  )
}
