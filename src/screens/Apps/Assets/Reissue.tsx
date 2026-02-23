import { useContext, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import Loading from '../../../components/Loading'
import Modal from '../../../components/Modal'
import Padded from '../../../components/Padded'
import Shadow from '../../../components/Shadow'
import Text from '../../../components/Text'
import AssetAvatar from '../../../components/AssetAvatar'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import { Decimal } from 'decimal.js'
import { formatAssetAmount } from '../../../lib/format'
import { assetInputStyle } from '../../../lib/styles'

export default function AppAssetReissue() {
  const { navigate } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)
  const { assetBalances, svcWallet, reloadWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const name = assetInfo.metadata?.name ?? 'Unknown'
  const ticker = assetInfo.metadata?.ticker ?? ''
  const icon = assetInfo.metadata?.icon
  const decimals = assetInfo.metadata?.decimals ?? 8
  const balance = assetBalances.find((a) => a.assetId === assetInfo.assetId)?.amount ?? 0

  const handleReissueRequest = () => {
    if (!assetInfo.assetId) {
      setError('Asset ID is required')
      return
    }
    const parsedAmount = Decimal.mul(parseFloat(amount) || 0, Math.pow(10, decimals))
      .floor()
      .toNumber()
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }
    setError('')
    setShowConfirm(true)
  }

  const handleReissueConfirm = async () => {
    if (!svcWallet) return
    const parsedAmount = Decimal.mul(parseFloat(amount) || 0, Math.pow(10, decimals))
      .floor()
      .toNumber()

    setShowConfirm(false)
    setProcessing(true)
    setError('')

    try {
      await svcWallet.assetManager.reissue({ assetId: assetInfo.assetId, amount: parsedAmount })
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
      {showConfirm ? (
        <Modal>
          <FlexCol gap='1.5rem'>
            <FlexCol centered gap='0.5rem'>
              <Text big bold>
                Confirm Reissue
              </Text>
              <Text centered wrap color='dark50'>
                You are about to mint {amount} additional {ticker || name}.
              </Text>
            </FlexCol>
            <FlexRow>
              <Button onClick={() => setShowConfirm(false)} label='Cancel' secondary />
              <Button onClick={handleReissueConfirm} label='Reissue' />
            </FlexRow>
          </FlexCol>
        </Modal>
      ) : null}
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />

            <Shadow border>
              <FlexRow between padding='0.75rem'>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <AssetAvatar icon={icon} ticker={ticker} size={32} />
                  <FlexCol gap='0'>
                    <Text bold>{name}</Text>
                    <Text color='dark50' smaller>
                      {ticker}
                    </Text>
                  </FlexCol>
                </div>
                <Text>
                  {formatAssetAmount(balance, decimals)} {ticker}
                </Text>
              </FlexRow>
            </Shadow>

            <FlexCol gap='0.25rem'>
              <Text smaller color='dark50'>
                Additional Amount
              </Text>
              <input
                style={assetInputStyle}
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
        <Button label='Reissue' onClick={handleReissueRequest} disabled={!amount} />
      </ButtonsOnBottom>
    </>
  )
}
