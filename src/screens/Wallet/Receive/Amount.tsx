import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import ErrorMessage from '../../../components/Error'
import { getReceivingAddresses } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import Header from '../../../components/Header'
import InputAmount from '../../../components/InputAmount'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Keyboard from '../../../components/Keyboard'
import { WalletContext } from '../../../providers/wallet'
import { callFaucet, pingFaucet } from '../../../lib/faucet'
import LoadingLogo from '../../../components/LoadingLogo'
import { prettyAmount, prettyNumber } from '../../../lib/format'
import Success from '../../../components/Success'
import { consoleError } from '../../../lib/logs'
import { AspContext } from '../../../providers/asp'
import { isMobileBrowser } from '../../../lib/browser'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { LimitsContext } from '../../../providers/limits'
import { SwapsContext } from '../../../providers/swaps'
import { InfoLine } from '../../../components/Info'
import FlexRow from '../../../components/FlexRow'
import { enableChainSwapsReceive } from '../../../lib/constants'
import { centsToUnits } from '../../../lib/assets'
import { AssetOption } from '../../../lib/types'

export default function ReceiveAmount() {
  const { aspInfo } = useContext(AspContext)
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat, fiatDecimals } = useContext(FiatContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { calcBtcToArkSwapFee, calcReverseSwapFee } = useContext(SwapsContext)
  const { amountIsAboveMaxLimit, amountIsBelowMinLimit, validBtcToArk, validLnSwap } = useContext(LimitsContext)
  const { navigate } = useContext(NavigationContext)
  const { assetMetadataCache, balance, svcWallet } = useContext(WalletContext)

  const assetId = recvInfo.assetId ?? ''
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const isAssetReceive = recvInfo.assetId && recvInfo.assetId !== ''

  const defaultButtonLabel = 'Skip'

  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [error, setError] = useState('')
  const [fauceting, setFauceting] = useState(false)
  const [faucetSuccess, setFaucetSuccess] = useState(false)
  const [faucetAvailable, setFaucetAvailable] = useState(false)
  const [satoshis, setSatoshis] = useState(0)
  const [showKeys, setShowKeys] = useState(false)
  const [textValue, setTextValue] = useState('')

  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
  }, [aspInfo.unreachable])

  useEffect(() => {
    pingFaucet(aspInfo)
      .then(setFaucetAvailable)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!svcWallet) return
    getReceivingAddresses(svcWallet)
      .then(({ offchainAddr, boardingAddr }) => {
        if (!offchainAddr) throw 'Unable to get offchain address'
        if (!boardingAddr) throw 'Unable to get boarding address'
        setRecvInfo({ ...recvInfo, boardingAddr, offchainAddr, satoshis: 0, addressError: undefined })
      })
      .catch((err) => {
        const error = extractError(err)
        consoleError(error, 'error getting addresses')
        setError(error)
        setRecvInfo({ ...recvInfo, addressError: error })
      })
  }, [svcWallet])

  useEffect(() => {
    setButtonLabel(
      !satoshis
        ? defaultButtonLabel
        : satoshis < 1
          ? 'Amount below 1 satoshi'
          : !isAssetReceive && amountIsAboveMaxLimit(satoshis)
            ? 'Amount above max limit'
            : !isAssetReceive && amountIsBelowMinLimit(satoshis)
              ? 'Amount below min limit'
              : 'Continue',
    )
  }, [satoshis])

  if (!svcWallet) return <LoadingLogo text='Loading...' />

  const handleChange = (sats: number) => {
    setSatoshis(sats)
    const value = assetMeta ? centsToUnits(sats, assetMeta.metadata?.decimals) : useFiat ? toFiat(sats) : sats
    const maximumFractionDigits = useFiat
      ? fiatDecimals()
      : assetMeta?.metadata?.decimals
        ? assetMeta?.metadata?.decimals
        : 0
    setTextValue(prettyNumber(value, maximumFractionDigits, false))
    setButtonLabel(sats ? 'Continue' : defaultButtonLabel)
  }

  const handleFaucet = async () => {
    try {
      if (!satoshis) throw 'Invalid amount'
      setFauceting(true)
      const ok = await callFaucet(recvInfo.offchainAddr, satoshis, aspInfo)
      if (!ok) throw 'Faucet failed'
      setFauceting(false)
      setFaucetSuccess(true)
    } catch (err) {
      consoleError(err, 'error fauceting')
      setError(extractError(err))
      setFauceting(false)
    }
  }

  const handleFocus = () => {
    if (isMobileBrowser) setShowKeys(true)
  }

  const handleProceed = async () => {
    setRecvInfo({ ...recvInfo, satoshis })
    navigate(Pages.ReceiveQRCode)
  }

  const showFaucetButton = balance === 0 && faucetAvailable && !isAssetReceive
  const reverseSwapFee = calcReverseSwapFee(satoshis)
  const showLightningFees = satoshis && validLnSwap(satoshis) && !isAssetReceive
  const lightningFeeText = `Lightning fees: ${prettyAmount(reverseSwapFee)}`

  const chainSwapFee = calcBtcToArkSwapFee(satoshis)
  const showChainSwapFees = satoshis && validBtcToArk(satoshis) && enableChainSwapsReceive
  const chainSwapFeeText = `Chain swap fees: ${prettyAmount(chainSwapFee)}`

  const assetOption: AssetOption = {
    assetId,
    name: assetMeta?.metadata?.name ?? '',
    ticker: assetMeta?.metadata?.ticker ?? '',
    balance: 0,
    decimals: assetMeta?.metadata?.decimals ?? 0,
    icon: assetMeta?.metadata?.icon,
  }

  const disabled = !satoshis
    ? false
    : satoshis < 1 || (!isAssetReceive && (amountIsAboveMaxLimit(satoshis) || amountIsBelowMinLimit(satoshis)))

  if (showKeys) {
    return <Keyboard back={() => setShowKeys(false)} hideBalance onSats={handleChange} value={satoshis} />
  }

  if (fauceting) {
    return (
      <>
        <Header text='Fauceting' />
        <Content>
          <LoadingLogo text='Getting sats from a faucet. This may take a few moments.' />
        </Content>
      </>
    )
  }

  if (faucetSuccess) {
    const displayAmount = useFiat
      ? prettyAmount(toFiat(satoshis), config.fiat, fiatDecimals())
      : prettyAmount(satoshis ?? 0)
    return (
      <>
        <Header text='Success' />
        <Content>
          <Success headline='Faucet completed!' text={`${displayAmount} received successfully`} />
        </Content>
      </>
    )
  }

  return (
    <>
      <Header text={isAssetReceive ? 'Receive Asset' : 'Receive'} back={() => navigate(Pages.Wallet)} />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage error={Boolean(error)} text={error} />
            <InputAmount
              name='receive-amount'
              focus={!isMobileBrowser}
              label='Amount'
              onSats={handleChange}
              onFocus={handleFocus}
              readOnly={isMobileBrowser}
              value={textValue ? Number(textValue) : undefined}
              sats={satoshis}
              asset={assetOption}
            />
            <FlexRow between>
              <div>{showLightningFees ? <InfoLine color='orange' text={lightningFeeText} /> : null}</div>
              <div>{showChainSwapFees ? <InfoLine color='orange' text={chainSwapFeeText} /> : null}</div>
            </FlexRow>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label={buttonLabel} onClick={handleProceed} disabled={disabled} />
        {showFaucetButton ? <Button disabled={!satoshis} label='Faucet' onClick={handleFaucet} secondary /> : null}
      </ButtonsOnBottom>
    </>
  )
}
