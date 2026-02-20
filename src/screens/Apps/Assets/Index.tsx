import { useContext, useEffect, useState } from 'react'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import Shadow from '../../../components/Shadow'
import Button from '../../../components/Button'
import Loading from '../../../components/Loading'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { consoleError } from '../../../lib/logs'

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
  const { assetBalances, svcWallet, assetMetadataCache } = useContext(WalletContext)
  const { config } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)

  const [assets, setAssets] = useState<AssetListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAssets = async () => {
      if (!svcWallet) return

      // Merge auto-discovered + imported asset IDs
      const allIds = new Set<string>()
      for (const ab of assetBalances) allIds.add(ab.assetId)
      for (const id of config.importedAssets) allIds.add(id)

      const items: AssetListItem[] = []
      for (const assetId of allIds) {
        const bal = assetBalances.find((a) => a.assetId === assetId)
        let meta = assetMetadataCache.get(assetId)

        if (!meta) {
          try {
            meta = await svcWallet.assetManager.getAssetDetails(assetId)
            if (meta) assetMetadataCache.set(assetId, meta)
          } catch (err) {
            consoleError(err, `error fetching metadata for ${assetId}`)
          }
        }

        items.push({
          assetId,
          balance: bal?.amount ?? 0,
          name: meta?.metadata?.name,
          ticker: meta?.metadata?.ticker,
          icon: meta?.metadata?.icon,
          decimals: meta?.metadata?.decimals ?? 8,
        })
      }

      setAssets(items)
      setLoading(false)
    }

    loadAssets()
  }, [svcWallet, assetBalances, config.importedAssets])

  const handleAssetClick = (assetId: string) => {
    setAssetInfo({ assetId })
    navigate(Pages.AppAssetDetail)
  }

  const truncateId = (id: string) => `${id.slice(0, 8)}...${id.slice(-8)}`

  if (loading) return <Loading text='Loading assets...' />

  return (
    <>
      <Header text='Assets' back={() => navigate(Pages.Apps)} />
      <Content>
        <Padded>
          <FlexCol gap='0.5rem'>
            {assets.length === 0 ? (
              <Text color='dark50'>No assets yet. Import or mint one to get started.</Text>
            ) : (
              assets.map((asset) => (
                <Shadow key={asset.assetId} border onClick={() => handleAssetClick(asset.assetId)}>
                  <FlexRow between padding='0.75rem'>
                    <FlexRow>
                      {asset.icon ? (
                        <img src={asset.icon} alt='' width={32} height={32} style={{ borderRadius: '50%' }} />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'var(--dark20)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text smaller>{asset.ticker?.[0] ?? 'A'}</Text>
                        </div>
                      )}
                      <FlexCol gap='0'>
                        <Text bold>{asset.name ?? truncateId(asset.assetId)}</Text>
                        {asset.ticker ? (
                          <Text color='dark50' smaller>
                            {asset.ticker}
                          </Text>
                        ) : null}
                      </FlexCol>
                    </FlexRow>
                    <Text>{asset.balance}</Text>
                  </FlexRow>
                </Shadow>
              ))
            )}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Import' onClick={() => navigate(Pages.AppAssetImport)} />
        <Button label='Mint' onClick={() => navigate(Pages.AppAssetMint)} secondary />
      </ButtonsOnBottom>
    </>
  )
}
