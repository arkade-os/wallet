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

export default function AppAssetBurn() {
  const { navigate } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)
  const { assetBalances, svcWallet, reloadWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const name = assetInfo.metadata?.name ?? 'Unknown'
  const ticker = assetInfo.metadata?.ticker ?? assetInfo.assetId.slice(0, 8)
  const icon = assetInfo.metadata?.icon
  const decimals = assetInfo.metadata?.decimals ?? 8
  const balance = assetBalances.find((a) => a.assetId === assetInfo.assetId)?.amount ?? 0

  const handleMax = () => setAmount(formatAssetAmount(balance, decimals))

  const handleBurnRequest = () => {
    const parsedAmount = Decimal.mul(parseFloat(amount) || 0, Math.pow(10, decimals))
      .floor()
      .toNumber()
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }
    if (parsedAmount > balance) {
      setError(`Cannot burn more than your balance (${formatAssetAmount(balance, decimals)} ${ticker})`)
      return
    }
    setError('')
    setShowConfirm(true)
  }

  const handleBurnConfirm = async () => {
    if (!svcWallet) return
    const parsedAmount = Decimal.mul(parseFloat(amount) || 0, Math.pow(10, decimals))
      .floor()
      .toNumber()

    setShowConfirm(false)
    setProcessing(true)
    setError('')

    try {
      await svcWallet.assetManager.burn({ assetId: assetInfo.assetId, amount: parsedAmount })
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
      {showConfirm ? (
        <Modal>
          <FlexCol gap='1.5rem'>
            <FlexCol centered gap='0.5rem'>
              <Text big bold>
                Confirm Burn
              </Text>
              <Text centered wrap color='dark50'>
                You are about to burn {amount} {ticker || name}. This action is irreversible.
              </Text>
            </FlexCol>
            <FlexRow>
              <Button onClick={() => setShowConfirm(false)} label='Cancel' secondary />
              <Button onClick={handleBurnConfirm} label='Burn' />
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
              <FlexRow between>
                <Text smaller color='dark50'>
                  Amount to Burn
                </Text>
                <span onClick={handleMax} style={{ color: 'var(--purpletext)', fontSize: 13, cursor: 'pointer' }}>
                  Max
                </span>
              </FlexRow>
              <input
                style={assetInputStyle}
                type='number'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={formatAssetAmount(balance, decimals)}
              />
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Burn' onClick={handleBurnRequest} disabled={!amount} />
      </ButtonsOnBottom>
    </>
  )
}
