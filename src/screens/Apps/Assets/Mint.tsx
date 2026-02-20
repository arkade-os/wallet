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
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import { Decimal } from 'decimal.js'
import type { IssuanceParams, KnownMetadata } from '@arkade-os/sdk'

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
  const { svcWallet, assetBalances, assetMetadataCache } = useContext(WalletContext)

  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [decimals, setDecimals] = useState('8')
  const [iconUrl, setIconUrl] = useState('')
  const [error, setError] = useState('')
  const [minting, setMinting] = useState(false)
  const [iconError, setIconError] = useState(false)

  const [controlAssetId, setControlAssetId] = useState('')
  const [showControlDropdown, setShowControlDropdown] = useState(false)
  const [knownAssets, setKnownAssets] = useState<KnownAssetOption[]>([])

  const inputStyle: React.CSSProperties = {
    background: 'var(--dark10)',
    border: '1px solid var(--dark20)',
    borderRadius: '0.25rem',
    color: 'var(--white)',
    fontSize: '16px',
    padding: '0.75rem',
    width: '100%',
  }

  useEffect(() => {
    const load = async () => {
      if (!svcWallet) return
      const options: KnownAssetOption[] = []
      for (const ab of assetBalances) {
        let meta = assetMetadataCache.get(ab.assetId)
        if (!meta) {
          try {
            meta = await svcWallet.assetManager.getAssetDetails(ab.assetId)
            if (meta) assetMetadataCache.set(ab.assetId, meta)
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

    setMinting(true)
    setError('')

    try {
      const metadata: KnownMetadata = {}
      if (name) metadata.name = name
      if (ticker) metadata.ticker = ticker
      const parsedDecimals = decimals !== '' ? parseInt(decimals) : 0
      if (!isNaN(parsedDecimals)) metadata.decimals = parsedDecimals
      if (iconUrl) metadata.icon = iconUrl

      const rawAmount = Decimal.mul(parsedUnits, Math.pow(10, parsedDecimals)).floor().toNumber()
      const params: IssuanceParams = { amount: rawAmount, metadata }
      if (controlAssetId) params.controlAssetId = controlAssetId

      const result = await svcWallet.assetManager.issue(params)
      const newAssetId = result.assetId

      if (!config.importedAssets.includes(newAssetId)) {
        updateConfig({ ...config, importedAssets: [...config.importedAssets, newAssetId] })
      }

      const assetDetails = { assetId: newAssetId, supply: rawAmount, metadata }
      assetMetadataCache.set(newAssetId, assetDetails)
      setAssetInfo({ assetId: newAssetId, details: assetDetails })
      navigate(Pages.AppAssetMintSuccess)
    } catch (err) {
      consoleError(err, 'error minting asset')
      setError(extractError(err))
    } finally {
      setMinting(false)
    }
  }

  const selectedControl = knownAssets.find((a) => a.assetId === controlAssetId) ?? null

  if (minting) return <Loading text='Minting asset...' />

  return (
    <>
      <Header text='Mint Asset' back={() => navigate(Pages.AppAssets)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />

            <Shadow border>
              <FlexRow between padding='0.75rem'>
                <FlexRow>
                  {iconUrl && !iconError ? (
                    <img
                      src={iconUrl}
                      alt=''
                      width={32}
                      height={32}
                      style={{ borderRadius: '50%' }}
                      onError={() => setIconError(true)}
                    />
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
                      <Text smaller>{ticker?.[0] ?? 'A'}</Text>
                    </div>
                  )}
                  <FlexCol gap='0'>
                    <Text bold>{name || 'Asset Name'}</Text>
                    <Text color='dark50' smaller>
                      {ticker || 'TKN'}
                    </Text>
                  </FlexCol>
                </FlexRow>
                <Text>{amount || '0'}</Text>
              </FlexRow>
            </Shadow>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>
                Amount *
              </Text>
              <input
                style={inputStyle}
                type='number'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder='1000'
              />
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>
                Name
              </Text>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder='My Token' />
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>
                Ticker
              </Text>
              <input
                style={inputStyle}
                value={ticker}
                onChange={(e) => setTicker(e.target.value.slice(0, 5))}
                placeholder='TKN'
              />
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>
                Decimals
              </Text>
              <input
                style={inputStyle}
                type='number'
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
                placeholder='8'
              />
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>
                Control Asset (optional)
              </Text>
              <Shadow border onClick={() => setShowControlDropdown(!showControlDropdown)}>
                <FlexRow between padding='0.5rem'>
                  {selectedControl ? (
                    <FlexRow>
                      {selectedControl.icon ? (
                        <img src={selectedControl.icon} alt='' width={24} height={24} style={{ borderRadius: '50%' }} />
                      ) : (
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'var(--dark20)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text smaller>{selectedControl.ticker?.[0] ?? 'A'}</Text>
                        </div>
                      )}
                      <Text>
                        {selectedControl.name} {selectedControl.ticker ? `(${selectedControl.ticker})` : ''}
                      </Text>
                    </FlexRow>
                  ) : (
                    <Text color='dark50'>Select from wallet...</Text>
                  )}
                  <Text color='dark50' smaller>
                    {showControlDropdown ? '▲' : '▼'}
                  </Text>
                </FlexRow>
              </Shadow>
              {showControlDropdown && knownAssets.length > 0 ? (
                <div style={{ maxHeight: '30vh', overflowY: 'auto', width: '100%' }}>
                  <FlexCol gap='0.25rem'>
                    {controlAssetId ? (
                      <Shadow
                        onClick={() => {
                          setControlAssetId('')
                          setShowControlDropdown(false)
                        }}
                      >
                        <FlexRow padding='0.5rem'>
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
                        <FlexRow padding='0.5rem'>
                          {asset.icon ? (
                            <img src={asset.icon} alt='' width={24} height={24} style={{ borderRadius: '50%' }} />
                          ) : (
                            <div
                              style={{
                                width: 24,
                                height: 24,
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
                          <Text>
                            {asset.name} {asset.ticker ? `(${asset.ticker})` : ''}
                          </Text>
                        </FlexRow>
                      </Shadow>
                    ))}
                  </FlexCol>
                </div>
              ) : null}
              <input
                style={inputStyle}
                value={controlAssetId}
                onChange={(e) => setControlAssetId(e.target.value)}
                placeholder='Or paste asset ID...'
              />
            </FlexCol>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>
                Icon URL
              </Text>
              <input
                style={inputStyle}
                value={iconUrl}
                onChange={(e) => {
                  setIconUrl(e.target.value)
                  setIconError(false)
                }}
                placeholder='https://...'
              />
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Mint' onClick={handleMint} disabled={!amount} />
      </ButtonsOnBottom>
    </>
  )
}
