import { useContext, useEffect, useRef, useState } from 'react'
import type { AssetDetails } from '@arkade-os/sdk'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { AssetsContext } from '../../../providers/assets'
import { AspContext } from '../../../providers/asp'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import InputAssetId from '../../../components/InputAssetId'
import Scanner from '../../../components/Scanner'
import { isValidAssetId, truncatedAssetId } from '../../../lib/assets'
import { normalizeAssetId, registryAssetMatches, trackedAssetIds } from '../../../lib/assetLibrary'
import { rawAssetPresentation } from '../../../lib/accountAssets'
import AssetAvatar from '../../../components/AssetAvatar'
import UnverifiedBadge from '../../../components/UnverifiedBadge'
import { BackupContext } from '@/providers/backup'
import { useTranslation } from '../../../providers/language'

export default function AppAssetImport() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { replace } = useContext(NavigationContext)
  const { config } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { svcWallet, assetBalances, assetMetadataCache, isVerifiedAsset, setCacheEntry } = useContext(WalletContext)
  const { registryAssetIds, registryStatus } = useContext(AssetsContext)
  const { aspInfo } = useContext(AspContext)
  const { t } = useTranslation()

  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scan, setScan] = useState(false)
  const [review, setReview] = useState<AssetDetails>()
  const [loadedRegistry, setLoadedRegistry] = useState<readonly string[]>()
  const requestVersion = useRef(0)

  useEffect(() => {
    setReview(undefined)
    setLoading(false)
    return () => {
      requestVersion.current++
    }
  }, [svcWallet, aspInfo.network])

  useEffect(() => {
    if (!svcWallet || !registryAssetIds) return
    let active = true
    const missing = registryAssetIds.filter((id) => !assetMetadataCache.has(id))
    void Promise.allSettled(missing.map((id) => svcWallet.assetManager.getAssetDetails(id))).then((results) => {
      if (!active) return
      results.forEach((result, index) => {
        const id = missing[index]
        if (
          result.status === 'fulfilled' &&
          typeof result.value?.assetId === 'string' &&
          normalizeAssetId(result.value.assetId) === id
        ) {
          setCacheEntry(id, result.value)
        }
      })
      setLoadedRegistry(registryAssetIds)
    })
    return () => {
      active = false
    }
  }, [svcWallet, registryAssetIds, assetMetadataCache])

  const assetId = normalizeAssetId(query)
  const exactId = isValidAssetId(assetId)
  const existing = new Set(
    trackedAssetIds([...config.importedAssets, ...assetBalances.map((balance) => balance.assetId)]),
  )
  const liveTracking = useRef({ config, existing })
  liveTracking.current = { config, existing }
  const registryPending =
    registryStatus === 'loading' || Boolean(registryAssetIds && registryAssetIds !== loadedRegistry)
  const matches =
    registryAssetIds?.filter((id) => registryAssetMatches(query, id, assetMetadataCache.get(id)?.metadata)) ?? []

  const showAsset = (details: AssetDetails) => {
    setAssetInfo({ ...details, assetId: normalizeAssetId(details.assetId) })
    replace(Pages.AppAssetDetail, Pages.AppAssets)
  }

  const trackAsset = (details: AssetDetails) => {
    const id = normalizeAssetId(details.assetId)
    const { config, existing } = liveTracking.current
    if (!existing.has(id)) {
      backupAndUpdateConfig({ ...config, importedAssets: [...trackedAssetIds(config.importedAssets), id] })
    }
    showAsset(details)
  }

  const lookUp = async (id: string) => {
    if (!svcWallet || loading || !isValidAssetId(id)) return
    const version = ++requestVersion.current
    setLoading(true)
    setError('')
    setReview(undefined)

    try {
      const cached = assetMetadataCache.get(id)
      const details = cached ?? (await svcWallet.assetManager.getAssetDetails(id))
      if (requestVersion.current !== version) return
      if (typeof details?.assetId !== 'string' || normalizeAssetId(details.assetId) !== id) {
        throw new Error(t('mint.assetNotFound'))
      }
      const moderated = cached ?? setCacheEntry(id, details)
      if (existing.has(id) || isVerifiedAsset(id)) trackAsset(moderated)
      else setReview(moderated)
    } catch (err) {
      if (requestVersion.current !== version) return
      consoleError(err, 'error loading asset ID')
      setError(extractError(err))
    } finally {
      if (requestVersion.current === version) setLoading(false)
    }
  }

  const changeQuery = (value: string) => {
    requestVersion.current++
    setQuery(value)
    setLoading(false)
    setError('')
    setReview(undefined)
  }

  if (scan) {
    return (
      <Scanner
        close={() => setScan(false)}
        label={t('mint.assetId')}
        onData={(data) => {
          changeQuery(data)
          setScan(false)
        }}
        onError={setError}
      />
    )
  }

  const identity = (id: string, details?: AssetDetails) => {
    const { name, ticker, icon } = rawAssetPresentation(
      details?.metadata,
      truncatedAssetId(id) || t('mint.unknownAsset'),
    )
    return (
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <AssetAvatar icon={icon} name={name} ticker={ticker} assetId={id} size={36} />
        <div className='min-w-0 flex-1'>
          <p className='break-words text-sm font-medium'>{name}</p>
          <div className='flex flex-wrap items-center text-xs text-muted-foreground'>
            {ticker}
            {isVerifiedAsset(id) ? null : <UnverifiedBadge />}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header text={t('assets.add')} back />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage error={Boolean(error)} text={error} />
            <InputAssetId
              name='asset-id'
              label={t('assets.searchLabel')}
              focus
              onChange={changeQuery}
              onEnter={() => {
                if (!review) void lookUp(assetId)
              }}
              openScan={() => setScan(true)}
              value={query}
            />
            {review ? (
              <div className='settings-row-group flex flex-col gap-3 p-4' aria-live='polite'>
                {identity(review.assetId, review)}
                <p className='text-sm text-muted-foreground'>{t('assets.reviewUnverified')}</p>
                <div>
                  <p className='text-sm font-medium'>{t('mint.assetId')}</p>
                  <code className='block select-all break-all text-xs text-muted-foreground'>{review.assetId}</code>
                </div>
                <dl className='flex justify-between gap-2 text-sm'>
                  <dt className='text-muted-foreground'>{t('common.network')}</dt>
                  <dd>{aspInfo.network === 'bitcoin' ? t('swap.bitcoinMainnet') : aspInfo.network}</dd>
                </dl>
              </div>
            ) : (
              <>
                {matches.length > 0 ? (
                  <div className='settings-row-group'>
                    {matches.map((id) => (
                      <div className='settings-row gap-3' key={id}>
                        {identity(id, assetMetadataCache.get(id))}
                        <button
                          type='button'
                          className='focusable min-h-11 shrink-0 px-2 text-sm text-[var(--purpletext)]'
                          disabled={loading || !svcWallet}
                          onClick={() => void lookUp(id)}
                        >
                          {t(existing.has(id) ? 'mint.viewAsset' : 'assets.track')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {!exactId && registryPending ? (
                  <p role='status' className='text-sm text-muted-foreground'>
                    {t('loading.loadingAssets')}
                  </p>
                ) : !exactId && registryStatus === 'unavailable' ? (
                  <p className='text-sm text-muted-foreground'>{t('assets.registryUnavailable')}</p>
                ) : !exactId && matches.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>{t('assets.noResults')}</p>
                ) : null}
              </>
            )}
          </FlexCol>
        </Padded>
      </Content>
      {review || (exactId && matches.length === 0) ? (
        <ButtonsOnBottom>
          {review ? (
            <Button label={t('assets.track')} onClick={() => trackAsset(review)} testId='confirm-track-asset' />
          ) : (
            <Button
              label={t('assets.lookup')}
              onClick={() => void lookUp(assetId)}
              disabled={loading || !svcWallet}
              loading={loading}
              testId='look-up-asset-id'
            />
          )}
        </ButtonsOnBottom>
      ) : null}
    </>
  )
}
