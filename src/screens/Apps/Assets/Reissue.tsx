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

export default function AppAssetReissue() {
  const { navigate } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)
  const { svcWallet, reloadWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const assetId = assetInfo.assetId ?? ''
  const name = assetInfo.details?.metadata?.name ?? 'Asset'
  const ticker = assetInfo.details?.metadata?.ticker ?? ''

  const inputStyle: React.CSSProperties = {
    background: 'var(--dark10)',
    border: '1px solid var(--dark20)',
    borderRadius: '0.25rem',
    color: 'var(--white)',
    fontSize: '16px',
    padding: '0.75rem',
    width: '100%',
  }

  const handleReissue = async () => {
    if (!svcWallet) return
    const parsedAmount = parseInt(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }

    setProcessing(true)
    setError('')

    try {
      await svcWallet.assetManager.reissue({ assetId, amount: parsedAmount })
      await reloadWallet()
      navigate(Pages.AppAssetDetail)
    } catch (err) {
      consoleError(err, 'error reissuing asset')
      setError(extractError(err))
    } finally {
      setProcessing(false)
    }
  }

  if (processing) return <Loading text='Reissuing...' />

  return (
    <>
      <Header text={`Reissue ${name}`} back={() => navigate(Pages.AppAssetDetail)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            <Text color='dark50'>
              Mint additional supply of {name}
              {ticker ? ` (${ticker})` : ''}
            </Text>
            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>
                Additional Amount
              </Text>
              <input
                style={inputStyle}
                type='number'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder='1000'
              />
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Reissue' onClick={handleReissue} disabled={!amount} />
      </ButtonsOnBottom>
    </>
  )
}
