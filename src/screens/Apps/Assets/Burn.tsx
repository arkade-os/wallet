import { useCallback, useContext, useRef, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import LoadingLogo from '../../../components/LoadingLogo'
import Modal from '../../../components/Modal'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import { formatAssetAmount, prettyNumber } from '../../../lib/format'
import Input from '../../../components/Input'
import AssetCard from '../../../components/AssetCard'
import { centsToUnits, unitsToCents } from '../../../lib/assets'

export default function AppAssetBurn() {
  const { navigate } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)
  const { assetBalances, svcWallet, reloadWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState(0)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [opDone, setOpDone] = useState(false)
  const pendingNav = useRef<() => void>()
  const [showConfirm, setShowConfirm] = useState(false)

  const name = assetInfo.metadata?.name ?? 'Unknown'
  const ticker = assetInfo.metadata?.ticker ?? assetInfo.assetId.slice(0, 8)
  const icon = assetInfo.metadata?.icon
  const decimals = assetInfo.metadata?.decimals ?? 8
  const balance = assetBalances.find((a) => a.assetId === assetInfo.assetId)?.amount ?? 0

  const handleMax = () => setAmount(centsToUnits(balance, decimals))

  const handleBurnRequest = () => {
    const parsedAmount = unitsToCents(amount, decimals)
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
    const parsedAmount = unitsToCents(amount, decimals)

    setShowConfirm(false)
    setProcessing(true)
    setError('')

    try {
      await svcWallet.assetManager.burn({ assetId: assetInfo.assetId, amount: parsedAmount })
      await reloadWallet()
      pendingNav.current = () => navigate(Pages.AppAssetDetail)
      setOpDone(true)
    } catch (err) {
      consoleError(err, 'error burning asset')
      setError(extractError(err))
      setProcessing(false)
    }
  }

  const handleExitComplete = useCallback(() => {
    pendingNav.current?.()
  }, [])

  if (processing || opDone)
    return <LoadingLogo text='Burning...' done={opDone} exitMode='fly-up' onExitComplete={handleExitComplete} />

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
              <Text centered wrap color='neutral-500'>
                You are about to burn {prettyNumber(amount)} {ticker || name}. This action is irreversible.
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
            <AssetCard
              assetId={assetInfo.assetId}
              balance={balance}
              decimals={decimals}
              icon={icon}
              name={name}
              ticker={ticker}
            />
            <Input
              label='Amount to Burn'
              right={
                <span onClick={handleMax} style={{ color: 'var(--purpletext)', fontSize: 13, cursor: 'pointer' }}>
                  Max
                </span>
              }
              type='number'
              value={amount}
              onChange={setAmount}
              placeholder='0'
            />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Burn' onClick={handleBurnRequest} disabled={!amount} />
      </ButtonsOnBottom>
    </>
  )
}
