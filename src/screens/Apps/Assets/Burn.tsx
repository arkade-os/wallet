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
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import { Decimal } from 'decimal.js'
import { formatAssetAmount } from '../../../lib/format'

export default function AppAssetBurn() {
  const { navigate } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)
  const { assetBalances, svcWallet, reloadWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const assetId = assetInfo.assetId ?? ''
  const name = assetInfo.details?.metadata?.name ?? 'Asset'
  const ticker = assetInfo.details?.metadata?.ticker ?? ''
  const decimals = assetInfo.details?.metadata?.decimals ?? 8
  const balance = assetBalances.find((a) => a.assetId === assetId)?.amount ?? 0

  const inputStyle: React.CSSProperties = {
    background: 'var(--dark10)',
    border: '1px solid var(--dark20)',
    borderRadius: '0.25rem',
    color: 'var(--white)',
    fontSize: '16px',
    padding: '0.75rem',
    width: '100%',
  }

  const handleBurn = async () => {
    if (!svcWallet) return
    const parsedAmount = Decimal.mul(parseFloat(amount) || 0, Math.pow(10, decimals)).floor().toNumber()
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }
    if (parsedAmount > balance) {
      setError(`Cannot burn more than your balance (${formatAssetAmount(balance, decimals)} ${ticker})`)
      return
    }

    setProcessing(true)
    setError('')

    try {
      await svcWallet.assetManager.burn({ assetId, amount: parsedAmount })
      await reloadWallet()
      navigate(Pages.AppAssetDetail)
    } catch (err) {
      consoleError(err, 'error burning asset')
      setError(extractError(err))
    } finally {
      setProcessing(false)
    }
  }

  if (processing) return <Loading text='Burning...' />

  return (
    <>
      <Header text={`Burn ${name}`} back={() => navigate(Pages.AppAssetDetail)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            <Text color='dark50'>
              Current balance: {formatAssetAmount(balance, decimals)} {ticker}
            </Text>
            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>
                Amount to Burn
              </Text>
              <input
                style={inputStyle}
                type='number'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(balance)}
              />
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Burn' onClick={handleBurn} disabled={!amount} />
      </ButtonsOnBottom>
    </>
  )
}
