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
import Input from '../../../components/Input'
import AssetCard from '../../../components/AssetCard'
import { centsToUnits, prettyAssetAmount, unitsToCents } from '../../../lib/assets'

export default function AppAssetBurn() {
  const { replace } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)
  const { assetBalances, walletReady, assetManager, reloadWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState(BigInt(0))
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [opDone, setOpDone] = useState(false)
  const pendingNav = useRef<() => void>()
  const pendingConfirm = useRef(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const name = assetInfo.metadata?.name ?? 'Unknown'
  const ticker = assetInfo.metadata?.ticker ?? assetInfo.assetId.slice(0, 8)
  const icon = assetInfo.metadata?.icon
  const decimals = assetInfo.metadata?.decimals ?? 8
  const balance = assetBalances.find((a) => a.assetId === assetInfo.assetId)?.amount ?? BigInt(0)

  const handleAmountChange = (value: string) => {
    const cents = unitsToCents(value, decimals)
    setAmount(cents)
  }

  const handleBurnRequest = () => {
    if (!amount || amount <= 0) {
      setError('Amount must be a positive number')
      return
    }
    if (amount > balance) {
      setError(`Cannot burn more than your balance (${prettyAssetAmount(balance, decimals)} ${ticker})`)
      return
    }
    setError('')
    setShowConfirm(true)
  }

  const processBurn = async () => {
    if (!walletReady) return

    setProcessing(true)
    setError('')

    try {
      await assetManager.burn({ assetId: assetInfo.assetId, amount })
      await reloadWallet()
      pendingNav.current = () => replace(Pages.AppAssetDetail, Pages.AppAssets)
      setOpDone(true)
    } catch (err) {
      consoleError(err, 'error burning asset')
      setError(extractError(err))
      setProcessing(false)
    }
  }

  const handleBurnConfirm = () => {
    pendingConfirm.current = true
    setShowConfirm(false)
  }

  const handleConfirmExitComplete = () => {
    if (!pendingConfirm.current) return
    pendingConfirm.current = false
    void processBurn()
  }

  const handleExitComplete = useCallback(() => {
    pendingNav.current?.()
  }, [])

  const handleMax = () => setAmount(balance)

  if (processing || opDone)
    return <LoadingLogo text='Burning...' done={opDone} exitMode='fly-up' onExitComplete={handleExitComplete} />

  return (
    <>
      <Header text={`Burn ${ticker || name}`} back />
      <Modal open={showConfirm} onOpenChange={setShowConfirm} onExitComplete={handleConfirmExitComplete}>
        <FlexCol gap='1.5rem'>
          <FlexCol centered gap='0.5rem'>
            <Text big bold>
              Confirm Burn
            </Text>
            <Text centered wrap color='neutral-500'>
              You are about to burn {prettyAssetAmount(amount, decimals)} {ticker || name}. This action is irreversible.
            </Text>
          </FlexCol>
          <FlexRow>
            <Button onClick={() => setShowConfirm(false)} label='Cancel' secondary />
            <Button onClick={handleBurnConfirm} label='Burn' />
          </FlexRow>
        </FlexCol>
      </Modal>
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
              right={
                <span
                  onClick={handleMax}
                  data-testid='burn-max-button'
                  style={{ color: 'var(--purpletext)', fontSize: 13, cursor: 'pointer' }}
                >
                  Max
                </span>
              }
              min='0'
              step='1'
              type='number'
              placeholder='0'
              label='Amount to Burn'
              onChange={handleAmountChange}
              value={amount ? centsToUnits(amount, decimals) : ''}
            />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Burn' onClick={handleBurnRequest} disabled={amount <= 0} />
      </ButtonsOnBottom>
    </>
  )
}
