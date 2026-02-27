import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import Loading from '../../../components/Loading'
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
import { Decimal } from 'decimal.js'
import type { IssuanceParams, KnownMetadata } from '@arkade-os/sdk'
import Input from '../../../components/Input'

interface KnownAssetOption {
  assetId: string
  name: string
  ticker: string
  icon?: string
}

export default function AppAssetMint() {
  const { navigate } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { svcWallet, assetBalances, assetMetadataCache, setCacheEntry, iconApprovalManager } = useContext(WalletContext)

  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [decimals, setDecimals] = useState('0')
  const [iconUrl, setIconUrl] = useState('')
  const [error, setError] = useState('')
  const [minting, setMinting] = useState(false)
  const [iconError, setIconError] = useState(false)

  const [controlAssetId, setControlAssetId] = useState('')
  const [showControlDropdown, setShowControlDropdown] = useState(false)
  const [knownAssets, setKnownAssets] = useState<KnownAssetOption[]>([])
  const [controlMode, setControlMode] = useState<'None' | 'Existing' | 'New'>('None')
  const [ctrlAmount, setCtrlAmount] = useState('1')
  const [ctrlDecimals, setCtrlDecimals] = useState('0')
  const [mintingText, setMintingText] = useState('Minting asset...')

  useEffect(() => {
    const load = async () => {
      if (!svcWallet) return
      const options: KnownAssetOption[] = []
      for (const ab of assetBalances) {
        let meta = assetMetadataCache.get(ab.assetId)
        if (!meta) {
          try {
            meta = await svcWallet.assetManager.getAssetDetails(ab.assetId)
            if (meta) setCacheEntry(ab.assetId, meta)
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

  const handleMint = async () => {
    if (!svcWallet) return
    const parsedUnits = parseFloat(amount)
    if (!parsedUnits || parsedUnits <= 0) {
      setError('Amount must be a positive number')
      return
    }
    const parsedDecimals = decimals !== '' ? parseInt(decimals) : 0
    if (!Number.isInteger(parsedDecimals) || parsedDecimals < 0 || parsedDecimals > 8) {
      setError('Decimals must be an integer between 0 and 8')
      return
    }

    setMinting(true)
    setError('')

    try {
      const metadata: KnownMetadata = {}
      if (name) metadata.name = name
      if (ticker) metadata.ticker = ticker
      metadata.decimals = parsedDecimals
      if (iconUrl) metadata.icon = iconUrl

      const rawAmount = Decimal.mul(parsedUnits, Math.pow(10, parsedDecimals)).floor().toNumber()

      let resolvedControlAssetId = controlMode === 'Existing' ? controlAssetId : ''

      if (controlMode === 'New') {
        setMintingText('Minting control asset...')
        const parsedCtrlDecimals = ctrlDecimals !== '' ? parseInt(ctrlDecimals) : 0
        const ctrlMeta: KnownMetadata = { decimals: parsedCtrlDecimals }
        if (name) ctrlMeta.name = `ctrl-${name}`
        if (ticker) ctrlMeta.ticker = `ctrl-${ticker}`
        const ctrlRawAmount = Decimal.mul(parseFloat(ctrlAmount), Math.pow(10, parsedCtrlDecimals)).floor().toNumber()

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
      }

      setMintingText('Minting asset...')
      const params: IssuanceParams = { amount: rawAmount, metadata }
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
        supply: rawAmount,
        metadata,
        controlAssetId: resolvedControlAssetId || undefined,
      }
      setCacheEntry(newAssetId, assetDetails)
      setAssetInfo(assetDetails)
      navigate(Pages.AppAssetMintSuccess)
    } catch (err) {
      consoleError(err, 'error minting asset')
      setError(extractError(err))
    } finally {
      setMinting(false)
    }
  }

  const selectedControl = knownAssets.find((a) => a.assetId === controlAssetId) ?? null

  const parsedUnits = parseFloat(amount)
  const parsedDecimals = decimals !== '' ? parseInt(decimals) : NaN
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
            : isNaN(parsedUnits) || parsedUnits <= 0
              ? 'Amount must be a positive number'
              : isNaN(parsedDecimals) || parsedDecimals < 0 || parsedDecimals > 8
                ? 'Decimals must be 0–8'
                : controlMode === 'New' && !ctrlAmount
                  ? 'Enter control asset amount'
                  : controlMode === 'New' && (isNaN(parseFloat(ctrlAmount)) || parseFloat(ctrlAmount) <= 0)
                    ? 'Control amount must be positive'
                    : ''

  if (minting) return <Loading text={mintingText} />

  return (
    <>
      <Header text='Mint Asset' back={() => navigate(Pages.AppAssets)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />

            <Shadow border>
              <FlexRow between padding='0.75rem'>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <AssetAvatar
                    icon={iconUrl && !iconError ? iconUrl : undefined}
                    ticker={ticker}
                    size={32}
                    onError={() => setIconError(true)}
                  />
                  <FlexCol gap='0'>
                    <Text bold>{name || 'Asset Name'}</Text>
                    <Text color='dark50' smaller>
                      {ticker || 'TKN'}
                    </Text>
                  </FlexCol>
                </div>
                <Text>{amount || '0'}</Text>
              </FlexRow>
            </Shadow>

            <FlexRow gap='0.5rem' alignItems='flex-end'>
              <div style={{ flex: 1 }}>
                <Input
                  label='Name *'
                  value={name}
                  onChange={(v: string) => setName(v.slice(0, 40))}
                  placeholder='My Token'
                  maxLength={40}
                  testId='asset-name'
                />
              </div>
              <div style={{ minWidth: '6rem' }}>
                <Input
                  label='Ticker *'
                  value={ticker}
                  onChange={(v: string) => setTicker(v.slice(0, 8))}
                  placeholder='TKN'
                  maxLength={8}
                  testId='asset-ticker'
                />
              </div>
            </FlexRow>

            <FlexRow gap='0.5rem' alignItems='flex-end'>
              <div style={{ flex: 1 }}>
                <Input
                  label='Amount *'
                  type='number'
                  value={amount}
                  onChange={setAmount}
                  placeholder='1000'
                  testId='asset-amount'
                />
              </div>
              <div style={{ minWidth: '6rem' }}>
                <Input
                  label='Decimals'
                  type='number'
                  min='0'
                  max='8'
                  step='1'
                  value={decimals}
                  onChange={(v: string) => {
                    if (v === '') {
                      setDecimals('')
                      return
                    }
                    const n = parseInt(v)
                    if (!isNaN(n) && n >= 0 && n <= 8) setDecimals(String(n))
                  }}
                  placeholder='0'
                  testId='asset-decimals'
                />
              </div>
            </FlexRow>

            <Input
              label='Icon URL'
              type='url'
              value={iconUrl}
              onChange={(v: string) => {
                setIconUrl(v)
                setIconError(false)
              }}
              placeholder='https://...'
              testId='asset-icon-url'
            />

            <FlexCol gap='0.5rem'>
              <Text smaller color='dark50'>
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
                              <Text color='dark50'>Select from wallet...</Text>
                            )}
                          </div>
                          <Text color='dark50' smaller>
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
                                  <Text color='dark50'>None</Text>
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
                  <Text smaller color='dark50'>
                    {name ? `ctrl-${name}` : 'ctrl-...'} {ticker ? `(ctrl-${ticker})` : ''}
                  </Text>
                  <Input
                    label='Control Amount'
                    type='number'
                    value={ctrlAmount}
                    onChange={setCtrlAmount}
                    placeholder='1'
                    testId='control-asset-amount'
                  />
                </FlexCol>
              ) : null}
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {disabledReason ? (
          <Text centered smaller color='dark50'>
            {disabledReason}
          </Text>
        ) : null}
        <Button label='Mint' onClick={handleMint} disabled={Boolean(disabledReason)} />
      </ButtonsOnBottom>
    </>
  )
}
