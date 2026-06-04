import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import LoadingLogo from '../../../components/LoadingLogo'
import Padded from '../../../components/Padded'
import Shadow from '../../../components/Shadow'
import Text from '../../../components/Text'
import AssetAvatar from '../../../components/AssetAvatar'
import SegmentedControl from '../../../components/SegmentedControl'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import type { AssetDetails, IssuanceParams, KnownMetadata } from '@arkade-os/sdk'
import Input from '../../../components/Input'
import AssetCard from '../../../components/AssetCard'
import { MAX_DECIMALS, unitsToCents } from '../../../lib/assets'

interface KnownAssetOption {
  assetId: string
  name: string
  ticker: string
  icon?: string
}

export default function AppAssetMint() {
  const { replace } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { svcWallet, assetBalances, assetMetadataCache, setCacheEntry, iconApprovalManager } = useContext(WalletContext)

  const [amountTextValue, setAmountTextValue] = useState('')
  const [amount, setAmount] = useState(BigInt(0))
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [decimals, setDecimals] = useState<number | undefined>(0)
  const [iconUrl, setIconUrl] = useState('')
  const [error, setError] = useState('')
  const [minting, setMinting] = useState(false)
  const [iconError, setIconError] = useState(false)

  const [controlAssetId, setControlAssetId] = useState('')
  const [showControlDropdown, setShowControlDropdown] = useState(false)
  const [knownAssets, setKnownAssets] = useState<KnownAssetOption[]>([])
  const [controlMode, setControlMode] = useState<'None' | 'Existing' | 'New'>('None')
  const [ctrlAmount, setCtrlAmount] = useState(1)
  const [mintingText, setMintingText] = useState('Minting asset...')
  const [mintDone, setMintDone] = useState(false)
  const pendingNav = useRef<() => void>()

  useEffect(() => {
    const load = async () => {
      if (!svcWallet) return
      const options: KnownAssetOption[] = []
      for (const ab of assetBalances) {
        let meta = assetMetadataCache.get(ab.assetId) as AssetDetails | undefined
        if (!meta) {
          try {
            const fetched = await svcWallet.assetManager.getAssetDetails(ab.assetId)
            if (fetched) meta = setCacheEntry(ab.assetId, fetched)
          } catch {
            // skip assets we can't fetch metadata for
          }
        }
        options.push({
          assetId: ab.assetId,
          name: meta?.metadata?.name ?? `${ab.assetId.slice(0, 8)}...`,
          ticker: meta?.metadata?.ticker ?? '',
          icon: meta?.metadata?.icon,
        })
      }
      setKnownAssets(options)
    }
    load()
  }, [svcWallet, assetBalances, assetMetadataCache])

  useEffect(() => {
    if (decimals === undefined) return
    const cents = unitsToCents(amountTextValue, decimals)
    if (cents.toString().length > 19) return setError('Amount is too large')
    setAmount(cents)
    setError('')
  }, [amountTextValue, decimals])

  const handleMint = async () => {
    if (!svcWallet) return

    if (!amount || amount <= 0) {
      return setError('Amount must be a positive number')
    }

    if (decimals === undefined || !Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
      return setError(`Decimals must be an integer between 0 and ${MAX_DECIMALS}`)
    }

    const supply = amount

    setMinting(true)
    setError('')

    try {
      const metadata: KnownMetadata = {}
      if (name) metadata.name = name
      if (ticker) metadata.ticker = ticker
      metadata.decimals = decimals
      if (iconUrl) metadata.icon = iconUrl

      let resolvedControlAssetId = controlMode === 'Existing' ? controlAssetId : ''

      if (controlMode === 'New') {
        setMintingText('Minting control asset...')
        const ctrlMeta: KnownMetadata = { decimals: 0 }
        if (name) ctrlMeta.name = `ctrl-${name}`
        if (ticker) ctrlMeta.ticker = `ctrl-${ticker}`
        const ctrlRawAmount = BigInt(ctrlAmount)

        const ctrlResult = await svcWallet.assetManager.issue({
          amount: ctrlRawAmount,
          metadata: ctrlMeta,
        })
        resolvedControlAssetId = ctrlResult.assetId
        iconApprovalManager.approve(resolvedControlAssetId)

        setCacheEntry(ctrlResult.assetId, {
          assetId: ctrlResult.assetId,
          supply: ctrlRawAmount,
          metadata: ctrlMeta,
        })
        await new Promise<boolean>((resolve) => {
          const listenNewVtxos = (event: MessageEvent) => {
            if (event.data && event.data.type === 'VTXO_UPDATE') resolve(true)
          }
          navigator.serviceWorker.addEventListener('message', listenNewVtxos)
        })
      }

      setMintingText('Minting asset...')
      const params: IssuanceParams = { amount: supply, metadata }
      if (resolvedControlAssetId) params.controlAssetId = resolvedControlAssetId

      const result = await svcWallet.assetManager.issue(params)
      const newAssetId = result.assetId
      iconApprovalManager.approve(newAssetId)

      const importedAssets = [...config.importedAssets]
      if (resolvedControlAssetId && !importedAssets.includes(resolvedControlAssetId)) {
        importedAssets.push(resolvedControlAssetId)
      }
      if (!importedAssets.includes(newAssetId)) {
        importedAssets.push(newAssetId)
      }
      updateConfig({ ...config, importedAssets })

      const assetDetails = {
        assetId: newAssetId,
        supply,
        metadata,
        controlAssetId: resolvedControlAssetId || undefined,
      }
      setCacheEntry(newAssetId, assetDetails)
      setAssetInfo(assetDetails)
      pendingNav.current = () => replace(Pages.AppAssetMintSuccess, Pages.AppAssets)
      setMintDone(true)
    } catch (err) {
      consoleError(err, 'error minting asset')
      setError(extractError(err))
      setMinting(false)
    }
  }

  const selectedControl = knownAssets.find((a) => a.assetId === controlAssetId) ?? null

  const disabledReason = !name
    ? 'Enter a name'
    : name.length > 40
      ? 'Name must be 40 characters or less'
      : !ticker
        ? 'Enter a ticker'
        : ticker.length > 8
          ? 'Ticker must be 8 characters or less'
          : !amount
            ? 'Enter an amount'
            : amount <= 0
              ? 'Amount must be a positive number'
              : decimals === undefined || isNaN(decimals) || decimals < 0 || decimals > MAX_DECIMALS
                ? `Decimals must be 0-${MAX_DECIMALS}`
                : controlMode === 'New' && !ctrlAmount
                  ? 'Enter control asset amount'
                  : controlMode === 'New' && (isNaN(ctrlAmount) || ctrlAmount <= 0)
                    ? 'Control amount must be positive'
                    : ''

  const handleExitComplete = useCallback(() => {
    pendingNav.current?.()
  }, [])

  if (minting || mintDone)
    return <LoadingLogo text={mintingText} done={mintDone} exitMode='fly-up' onExitComplete={handleExitComplete} />

  return (
    <>
      <Header text='Mint Asset' back />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            <AssetCard
              assetId='preview'
              balance={amount}
              name={name}
              ticker={ticker}
              icon={iconUrl && !iconError ? iconUrl : undefined}
              decimals={decimals}
            />
            <FlexRow gap='0.5rem' alignItems='flex-end'>
              <div style={{ flex: 1 }}>
                <Input
                  label='Name *'
                  maxLength={40}
                  testId='asset-name'
                  placeholder='My Token'
                  onChange={(v: string) => setName(v.slice(0, 40))}
                />
              </div>
              <div style={{ width: '6rem' }}>
                <Input
                  maxLength={8}
                  label='Ticker *'
                  placeholder='TKN'
                  testId='asset-ticker'
                  onChange={(v: string) => setTicker(v.slice(0, 8))}
                />
              </div>
            </FlexRow>

            <FlexRow gap='0.5rem' alignItems='flex-end'>
              <div style={{ flex: 1 }}>
                <Input
                  min='0'
                  type='number'
                  label='Amount *'
                  placeholder='1000'
                  testId='asset-amount'
                  onChange={setAmountTextValue}
                />
              </div>
              <div style={{ minWidth: '6rem' }}>
                <Input
                  min='0'
                  max='8'
                  step='1'
                  type='number'
                  placeholder='0'
                  label='Decimals'
                  testId='asset-decimals'
                  onChange={(value: string) => setDecimals(value ? Number(value) : undefined)}
                />
              </div>
            </FlexRow>

            <Input
              type='url'
              label='Icon URL'
              value={iconUrl}
              testId='asset-icon-url'
              placeholder='https://...'
              onChange={(v: string) => {
                setIconUrl(v)
                setIconError(false)
              }}
            />

            <FlexCol gap='0.5rem'>
              <Text smaller color='neutral-500'>
                Control Asset
              </Text>
              <SegmentedControl
                options={['None', 'Existing', 'New']}
                selected={controlMode}
                onChange={(v) => {
                  setControlMode(v as 'None' | 'Existing' | 'New')
                  if (v === 'None') setControlAssetId('')
                }}
              />

              {controlMode === 'Existing' ? (
                <FlexCol gap='0.25rem'>
                  {knownAssets.length > 0 ? (
                    <>
                      <Shadow border onClick={() => setShowControlDropdown(!showControlDropdown)}>
                        <FlexRow between padding='0.625rem 0.5rem'>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', minWidth: 0, flex: 1 }}>
                            {selectedControl ? (
                              <>
                                <AssetAvatar icon={selectedControl.icon} ticker={selectedControl.ticker} size={24} />
                                <Text>
                                  {selectedControl.name} {selectedControl.ticker ? `(${selectedControl.ticker})` : ''}
                                </Text>
                              </>
                            ) : (
                              <Text color='neutral-500'>Select from wallet...</Text>
                            )}
                          </div>
                          <Text color='neutral-500' smaller>
                            {showControlDropdown ? '▲' : '▼'}
                          </Text>
                        </FlexRow>
                      </Shadow>
                      {showControlDropdown ? (
                        <div style={{ maxHeight: '30vh', overflowY: 'auto', width: '100%' }}>
                          <FlexCol gap='0.25rem'>
                            {controlAssetId ? (
                              <Shadow
                                onClick={() => {
                                  setControlAssetId('')
                                  setShowControlDropdown(false)
                                }}
                              >
                                <FlexRow padding='0.625rem 0.5rem'>
                                  <Text color='neutral-500'>None</Text>
                                </FlexRow>
                              </Shadow>
                            ) : null}
                            {knownAssets.map((asset) => (
                              <Shadow
                                key={asset.assetId}
                                onClick={() => {
                                  setControlAssetId(asset.assetId)
                                  setShowControlDropdown(false)
                                }}
                              >
                                <FlexRow padding='0.625rem 0.5rem'>
                                  <AssetAvatar icon={asset.icon} ticker={asset.ticker} size={24} />
                                  <Text>
                                    {asset.name} {asset.ticker ? `(${asset.ticker})` : ''}
                                  </Text>
                                </FlexRow>
                              </Shadow>
                            ))}
                          </FlexCol>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  <Input
                    value={controlAssetId}
                    onChange={setControlAssetId}
                    placeholder='Paste asset ID...'
                    testId='control-asset-id'
                  />
                </FlexCol>
              ) : null}

              {controlMode === 'New' ? (
                <FlexCol gap='0.5rem'>
                  <Text smaller color='neutral-500'>
                    {name ? `ctrl-${name}` : 'ctrl-...'} {ticker ? `(ctrl-${ticker})` : ''}
                  </Text>
                  <Input
                    min='0'
                    step='1'
                    type='number'
                    label='Control Amount'
                    testId='control-asset-amount'
                    onChange={(v: string) => setCtrlAmount(Number(v))}
                  />
                </FlexCol>
              ) : null}
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {disabledReason ? (
          <Text centered smaller color='neutral-500'>
            {disabledReason}
          </Text>
        ) : null}
        <Button label='Mint' onClick={handleMint} disabled={Boolean(disabledReason)} />
      </ButtonsOnBottom>
    </>
  )
}
