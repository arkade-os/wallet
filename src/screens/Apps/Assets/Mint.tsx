import { useContext, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import Loading from '../../../components/Loading'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import type { IssuanceParams, KnownMetadata } from '@arkade-os/sdk'

export default function AppAssetMint() {
  const { navigate } = useContext(NavigationContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { svcWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [decimals, setDecimals] = useState('8')
  const [iconUrl, setIconUrl] = useState('')
  const [error, setError] = useState('')
  const [minting, setMinting] = useState(false)

  const inputStyle: React.CSSProperties = {
    background: 'var(--dark10)',
    border: '1px solid var(--dark20)',
    borderRadius: '0.25rem',
    color: 'var(--white)',
    fontSize: '16px',
    padding: '0.75rem',
    width: '100%',
  }

  const handleMint = async () => {
    if (!svcWallet) return
    const parsedAmount = parseInt(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }

    setMinting(true)
    setError('')

    try {
      const metadata: KnownMetadata = {}
      if (name) metadata.name = name
      if (ticker) metadata.ticker = ticker
      if (decimals != '' && decimals != null && decimals != undefined) metadata.decimals = parseInt(decimals)
      if (iconUrl) metadata.icon = iconUrl

      const params: IssuanceParams = { amount: parsedAmount, metadata }

      const result = await svcWallet.assetManager.issue(params)
      const newAssetId = result.assetId

      if (!config.importedAssets.includes(newAssetId)) {
        updateConfig({ ...config, importedAssets: [...config.importedAssets, newAssetId] })
      }

      setAssetInfo({ assetId: newAssetId })
      navigate(Pages.AppAssetMintSuccess)
    } catch (err) {
      consoleError(err, 'error minting asset')
      setError(extractError(err))
    } finally {
      setMinting(false)
    }
  }

  if (minting) return <Loading text='Minting asset...' />

  return (
    <>
      <Header text='Mint Asset' back={() => navigate(Pages.AppAssets)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />

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
                Icon URL
              </Text>
              <input
                style={inputStyle}
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
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
