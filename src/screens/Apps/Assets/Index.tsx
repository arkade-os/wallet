import { useContext, useEffect, useState } from 'react'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import Button from '../../../components/Button'
import LoadingLogo from '../../../components/LoadingLogo'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { consoleError } from '../../../lib/logs'
import { SettingsIconLight } from '../../../icons/Settings'
import { EmptyAssetsList } from '../../../components/Empty'
import { AspContext } from '../../../providers/asp'
import AssetCard from '../../../components/AssetCard'

interface AssetListItem {
  assetId: string
  balance: number
  name?: string
  ticker?: string
  icon?: string
  decimals?: number
}

export default function AppAssets() {
  const { navigate } = useContext(NavigationContext)
  const { assetBalances, balance, svcWallet, assetMetadataCache, setCacheEntry } = useContext(WalletContext)
  const { config } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { aspInfo } = useContext(AspContext)

  const [assets, setAssets] = useState<AssetListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAssets = async () => {
      if (!svcWallet) {
        setLoading(false)
        return
      }

      const allIds = new Set<string>()
      for (const ab of assetBalances) allIds.add(ab.assetId)
      for (const id of config.importedAssets) allIds.add(id)

      const missingIds = [...allIds].filter((id) => !assetMetadataCache.get(id))
      const results = await Promise.allSettled(missingIds.map((id) => svcWallet.assetManager.getAssetDetails(id)))
      for (let i = 0; i < missingIds.length; i++) {
        const r = results[i]
        if (r.status === 'fulfilled' && r.value) {
          setCacheEntry(missingIds[i], r.value)
        } else if (r.status === 'rejected') {
          consoleError(r.reason, `error fetching metadata for ${missingIds[i]}`)
        }
      }

      const items: AssetListItem[] = [...allIds].map((assetId) => {
        const bal = assetBalances.find((a) => a.assetId === assetId)
        const meta = assetMetadataCache.get(assetId)
        return {
          assetId,
          balance: bal?.amount ?? 0,
          name: meta?.metadata?.name,
          ticker: meta?.metadata?.ticker,
          icon: meta?.metadata?.icon,
          decimals: meta?.metadata?.decimals ?? 8,
        }
      })

      setAssets(items)
      setLoading(false)
    }

    loadAssets()
  }, [svcWallet, assetBalances, config.importedAssets])

  const handleAssetClick = (assetId: string) => {
    setAssetInfo({ assetId, supply: 0 })
    navigate(Pages.AppAssetDetail)
  }

  if (loading) return <LoadingLogo text='Loading assets...' />

  const goToSettings = () => navigate(Pages.AppAssetsSettings)

  return (
    <>
      <Header text='Arkade Mint' back auxFunc={goToSettings} auxIcon={<SettingsIconLight />} />
      <Content>
        <Padded>
          {config.apps.assets.enabled ? (
            <FlexCol gap='0.5rem' className='scroll-fade'>
              {assets.length === 0 ? (
                <EmptyAssetsList />
              ) : (
                assets.map((asset) => (
                  <AssetCard
                    key={asset.assetId}
                    assetId={asset.assetId}
                    balance={asset.balance}
                    name={asset.name}
                    ticker={asset.ticker}
                    icon={asset.icon}
                    decimals={asset.decimals}
                    onClick={() => handleAssetClick(asset.assetId)}
                  />
                ))
              )}
            </FlexCol>
          ) : (
            <FlexCol gap='0.5rem'>
              <Text color='dark50'>Arkade Mint is disabled.</Text>
              <Text color='dark50'>
                <a onClick={goToSettings}>Enable it</a> to view your assets.
              </Text>
            </FlexCol>
          )}
        </Padded>
      </Content>
      {config.apps.assets.enabled ? (
        <ButtonsOnBottom>
          <Button label='Import' onClick={() => navigate(Pages.AppAssetImport)} />
          <Button
            label='Mint'
            onClick={() => navigate(Pages.AppAssetMint)}
            disabled={balance < aspInfo.dust}
            secondary
          />
        </ButtonsOnBottom>
      ) : null}
    </>
  )
}
