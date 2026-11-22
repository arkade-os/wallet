import { useContext, useEffect, useMemo, useState } from 'react'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import Button from '../../../components/Button'
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
import { truncatedAssetId } from '../../../lib/assets'
import { normalizeAssetId, trackedAssetIds } from '../../../lib/assetLibrary'
import { rawAssetPresentation } from '../../../lib/accountAssets'
import { useTranslation } from '../../../providers/language'

export default function AppAssets() {
  const { navigate } = useContext(NavigationContext)
  const { assetBalances, balance, svcWallet, assetMetadataCache, setCacheEntry } = useContext(WalletContext)
  const { config } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { aspInfo } = useContext(AspContext)
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const ids = useMemo(
    () => trackedAssetIds([...assetBalances.map(({ assetId }) => assetId), ...config.importedAssets]),
    [assetBalances, config.importedAssets],
  )

  useEffect(() => {
    const missing = ids.filter((id) => !assetMetadataCache.has(id))
    if (!svcWallet || !missing.length) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    void Promise.allSettled(missing.map((id) => svcWallet.assetManager.getAssetDetails(id))).then((results) => {
      if (!active) return
      results.forEach((result, index) => {
        if (
          result.status === 'fulfilled' &&
          typeof result.value?.assetId === 'string' &&
          normalizeAssetId(result.value.assetId) === missing[index]
        ) {
          setCacheEntry(missing[index], result.value)
        }
        if (result.status === 'rejected') consoleError(result.reason, 'error loading asset metadata')
      })
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [svcWallet, ids, assetMetadataCache])

  const balances = new Map(assetBalances.map(({ assetId, amount }) => [normalizeAssetId(assetId), amount]))
  const owned = ids.filter((id) => (balances.get(id) ?? 0n) > 0n)
  const tracked = new Set(trackedAssetIds(config.importedAssets))
  const watching = ids.filter((id) => tracked.has(id) && (balances.get(id) ?? 0n) === 0n)

  const assetRow = (id: string) => {
    const details = assetMetadataCache.get(id)
    const meta = details?.metadata
    const presentation = rawAssetPresentation(meta, truncatedAssetId(id) || t('mint.unknownAsset'))
    return (
      <AssetCard
        key={id}
        assetId={id}
        balance={balances.get(id) ?? 0n}
        {...presentation}
        decimals={meta?.decimals}
        onClick={() => {
          setAssetInfo(details ?? { assetId: id, supply: 0n })
          navigate(Pages.AppAssetDetail)
        }}
      />
    )
  }

  return (
    <>
      <Header
        text={t('assets.title')}
        back
        auxAriaLabel={t('mint.settingsTitle')}
        auxFunc={() => navigate(Pages.AppAssetsSettings)}
        auxIcon={<SettingsIconLight />}
      />
      <Content>
        <Padded>
          <FlexCol>
            {balance > 0 || owned.length > 0 ? (
              <section className='home-section' aria-busy={loading}>
                <h2 className='home-section-label px-1'>{t('assets.held')}</h2>
                <div className='home-section__content'>
                  {balance > 0 ? (
                    <AssetCard
                      assetId=''
                      name='Bitcoin'
                      ticker='BTC'
                      balance={balance}
                      onClick={() => navigate(Pages.BitcoinDetail)}
                    />
                  ) : null}
                  {owned.map(assetRow)}
                </div>
              </section>
            ) : null}
            {watching.length > 0 ? (
              <section className='home-section' aria-busy={loading}>
                <h2 className='home-section-label px-1'>{t('assets.tracking')}</h2>
                <div className='home-section__content'>{watching.map(assetRow)}</div>
              </section>
            ) : null}
            {balance === 0 && owned.length === 0 && watching.length === 0 ? <EmptyAssetsList /> : null}
            <details>
              <summary className='min-h-11 cursor-pointer content-center text-sm text-muted-foreground'>
                {t('assets.advanced')}
              </summary>
              {config.apps.assets.enabled ? (
                <Button
                  label={t('mint.mint')}
                  onClick={() => navigate(Pages.AppAssetMint)}
                  disabled={balance < aspInfo.dust}
                  secondary
                />
              ) : (
                <FlexCol gap='0.5rem'>
                  <Text color='neutral-500'>{t('mint.arkadeMintDisabled')}</Text>
                  <Button
                    label={t('mint.enableArkadeMint')}
                    onClick={() => navigate(Pages.AppAssetsSettings)}
                    secondary
                  />
                </FlexCol>
              )}
            </details>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label={t('assets.add')} onClick={() => navigate(Pages.AppAssetImport)} />
      </ButtonsOnBottom>
    </>
  )
}
