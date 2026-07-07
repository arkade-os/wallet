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
import Shadow from '../../../components/Shadow'
import Text from '../../../components/Text'
import AssetAvatar from '../../../components/AssetAvatar'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import { WalletContext } from '../../../providers/wallet'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import Input from '../../../components/Input'
import { prettyAssetAmount, unitsToCents } from '../../../lib/assets'

export default function AppAssetReissue() {
  const { replace } = useContext(NavigationContext)
  const { assetInfo } = useContext(FlowContext)
  const { assetBalances, svcWallet, reloadWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState(BigInt(0))
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [opDone, setOpDone] = useState(false)
  const pendingNav = useRef<() => void>()
  const pendingConfirm = useRef(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const name = assetInfo.metadata?.name ?? 'Unknown'
  const ticker = assetInfo.metadata?.ticker ?? ''
  const icon = assetInfo.metadata?.icon
  const decimals = assetInfo.metadata?.decimals ?? 8
  const balance = assetBalances.find((a) => a.assetId === assetInfo.assetId)?.amount ?? BigInt(0)

  const handleAmountChange = (value: string) => {
    const cents = unitsToCents(value, decimals)
    setAmount(cents)
  }

  const handleReissueRequest = () => {
    if (!assetInfo.assetId) {
      setError('Asset ID is required')
      return
    }
    if (!amount || amount <= 0) {
      setError('Amount must be a positive number')
      return
    }
    setError('')
    setShowConfirm(true)
  }

  const processReissue = async () => {
    if (!svcWallet) return
    setShowConfirm(false)
    setProcessing(true)
    setError('')

    try {
      await svcWallet.assetManager.reissue({ assetId: assetInfo.assetId, amount })
      await reloadWallet()
      pendingNav.current = () => replace(Pages.AppAssetDetail, Pages.AppAssets)
      setOpDone(true)
    } catch (err) {
      consoleError(err, 'error reissuing asset')
      setError(extractError(err))
      setProcessing(false)
    }
  }

  const handleReissueConfirm = () => {
    pendingConfirm.current = true
    setShowConfirm(false)
  }

  const handleConfirmExitComplete = () => {
    if (!pendingConfirm.current) return
    pendingConfirm.current = false
    void processReissue()
  }

  const handleExitComplete = useCallback(() => {
    pendingNav.current?.()
  }, [])

  if (processing || opDone)
    return <LoadingLogo text='Reissuing...' done={opDone} exitMode='fly-up' onExitComplete={handleExitComplete} />

  return (
    <>
      <Header text={`Reissue ${ticker || name}`} back />
      <Modal open={showConfirm} onOpenChange={setShowConfirm} onExitComplete={handleConfirmExitComplete}>
        <FlexCol gap='1.5rem'>
          <FlexCol centered gap='0.5rem'>
            <Text big bold>
              Confirm Reissue
            </Text>
            <Text centered wrap color='neutral-500'>
              You are about to mint {prettyAssetAmount(amount, decimals)} additional {ticker || name}.
            </Text>
          </FlexCol>
          <FlexRow>
            <Button onClick={() => setShowConfirm(false)} label='Cancel' secondary />
            <Button onClick={handleReissueConfirm} label='Reissue' />
          </FlexRow>
        </FlexCol>
      </Modal>
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
                    <Text color='neutral-500' smaller>
                      {ticker}
                    </Text>
                  </FlexCol>
                </div>
                <Text>
                  {prettyAssetAmount(balance, decimals)} {ticker}
                </Text>
              </FlexRow>
            </Shadow>
            <Input
              min='0'
              type='number'
              placeholder='1000'
              testId='asset-amount'
              label='Additional Amount'
              onChange={handleAmountChange}
            />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Reissue' onClick={handleReissueRequest} disabled={!amount} />
      </ButtonsOnBottom>
    </>
  )
}
