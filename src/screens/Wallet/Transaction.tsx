import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import Padded from '../../components/Padded'
import { WalletContext } from '../../providers/wallet'
import { FlowContext } from '../../providers/flow'
import { formatAssetAmount, isBurn, isIssuance, prettyAgo, prettyDate } from '../../lib/format'
import { defaultFee } from '../../lib/constants'
import ErrorMessage from '../../components/Error'
import { extractError } from '../../lib/error'
import Header from '../../components/Header'
import Content from '../../components/Content'
import Info from '../../components/Info'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import WaitingForRound from '../../components/WaitingForRound'
import { sleep } from '../../lib/sleep'
import Text, { TextSecondary } from '../../components/Text'
import AssetAvatar from '../../components/AssetAvatar'
import Details, { DetailsProps } from '../../components/Details'
import VtxosIcon from '../../icons/Vtxos'
import CheckMarkIcon from '../../icons/CheckMark'
import { AspContext } from '../../providers/asp'
import Reminder from '../../components/Reminder'
import { LimitsContext } from '../../providers/limits'
import { getInputsToSettle } from '../../lib/asp'

export default function Transaction() {
  const { navigate } = useContext(NavigationContext)
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { txInfo, setTxInfo } = useContext(FlowContext)
  const { aspInfo, calcBestMarketHour } = useContext(AspContext)
  const { assetMetadataCache, settlePreconfirmed, vtxos, wallet, svcWallet } = useContext(WalletContext)

  const tx = txInfo
  const issuanceTx = tx ? isIssuance(tx) : false
  const burnTx = tx ? isBurn(tx) : false
  const boardingTx = Boolean(tx?.boardingTxid)
  const defaultButtonLabel = boardingTx ? 'Complete boarding' : 'Settle transaction'
  const boardingExitDelay = Number(aspInfo?.boardingExitDelay || 0)
  const unconfirmedBoardingTx = boardingTx && !tx?.createdAt
  const expiredBoardingTx =
    !tx?.settled && boardingTx && tx?.createdAt && Date.now() / 1000 - tx?.createdAt > boardingExitDelay

  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [amountAboveDust, setAmountAboveDust] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [hasInputsToSettle, setHasInputsToSettle] = useState(false)
  const [reminderIsOpen, setReminderIsOpen] = useState(false)
  const [settleSuccess, setSettleSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const [settling, setSettling] = useState(false)
  const [startTime, setStartTime] = useState(0)

  useEffect(() => {
    setButtonLabel(settling ? 'Settling...' : defaultButtonLabel)
  }, [settling])

  useEffect(() => {
    if (!tx) return
    const bestMarketHour = calcBestMarketHour(wallet.nextRollover)
    if (bestMarketHour) {
      setStartTime(Number(bestMarketHour.nextStartTime))
      setDuration(Number(bestMarketHour.duration))
    } else {
      setStartTime(wallet.nextRollover)
      setDuration(0)
    }
  }, [wallet.nextRollover])

  useEffect(() => {
    if (!aspInfo || !svcWallet) return
    getInputsToSettle(svcWallet, wallet.thresholdMs).then(({ inputs }) => {
      setHasInputsToSettle(inputs.length > 0)
      const totalAmount = inputs.reduce((a, v) => a + v.value, 0) || 0
      setAmountAboveDust(totalAmount > aspInfo.dust)
    })
  }, [aspInfo, vtxos, svcWallet, wallet.thresholdMs])

  const handleBack = () => navigate(Pages.Wallet)

  // TODO implement resend
  //  - create new boarding tx
  //  - update txInfo with new boarding txid
  //  - show message that new boarding tx has been created
  //  - if error, show error message
  const handleResend = async () => {
    setResending(true)
  }

  const handleSettle = async () => {
    setError('')
    setSettling(true)
    try {
      await settlePreconfirmed()
      await sleep(2000) // give time to read last message
      setSettleSuccess(true)
      if (tx) setTxInfo({ ...tx, preconfirmed: false, settled: true })
    } catch (err) {
      setError(extractError(err))
    }
    setSettling(false)
  }

  if (!tx) return <></>

  const details: DetailsProps = {
    direction: issuanceTx ? 'Issuance' : burnTx ? 'Burn' : tx.type === 'sent' ? 'Sent' : 'Received',
    when: tx.createdAt ? prettyAgo(tx.createdAt) : !unconfirmedBoardingTx ? 'Unknown' : 'Unconfirmed',
    date: tx.createdAt ? prettyDate(tx.createdAt) : !unconfirmedBoardingTx ? 'Unknown' : 'Unconfirmed',
    status: expiredBoardingTx
      ? 'Expired'
      : unconfirmedBoardingTx
        ? 'Unconfirmed'
        : boardingTx && tx.preconfirmed
          ? 'Pending boarding'
          : tx.settled
            ? 'Settled'
            : 'Preconfirmed',
    type: boardingTx ? 'Boarding' : 'Offchain',
    txid: tx.boardingTxid || tx.redeemTxid || '',
    satoshis: tx.type === 'sent' ? tx.amount - defaultFee : tx.amount,
    fees: tx.type === 'sent' ? defaultFee : 0,
    total: tx.amount,
  }

  const Body = () => (
    <Content>
      <Padded>
        <FlexCol>
          <ErrorMessage error={Boolean(error)} text={error} />
          {expiredBoardingTx ? (
            <Info color='red' icon={<VtxosIcon />} title='Expired'>
              <Text wrap>Boarding transaction expired.</Text>
            </Info>
          ) : unconfirmedBoardingTx ? (
            <Info color='orange' icon={<VtxosIcon />} title='Unconfirmed'>
              <Text wrap>Onchain transaction unconfirmed. Please wait for confirmation.</Text>
            </Info>
          ) : tx.preconfirmed && tx.boardingTxid ? (
            <Info color='orange' icon={<VtxosIcon />} title='Pending boarding'>
              <Text wrap>Onboard transaction confirmed on-chain.</Text>
            </Info>
          ) : null}
          {settleSuccess ? (
            <Info color='green' icon={<CheckMarkIcon small />} title='Success'>
              <TextSecondary>Transaction settled successfully</TextSecondary>
            </Info>
          ) : null}
          {tx.assets?.length ? (
            <FlexCol gap='0.5rem'>
              {tx.assets.map((a) => {
                const meta = assetMetadataCache.get(a.assetId)?.metadata
                const ticker = meta?.ticker
                const name = meta?.name
                const icon = meta?.icon
                const decimals = meta?.decimals ?? 8
                const color = tx.type === 'received' || issuanceTx ? 'green' : ''
                const label = ticker ?? name ?? `${a.assetId.slice(0, 8)}...`
                return (
                  <FlexRow key={a.assetId} gap='0.5rem'>
                    <AssetAvatar icon={icon} ticker={ticker} size={32} />
                    <FlexCol gap='0'>
                      <Text color={color}>
                        {formatAssetAmount(a.amount, decimals)} {label}
                      </Text>
                      {name && ticker ? <TextSecondary>{name}</TextSecondary> : null}
                    </FlexCol>
                  </FlexRow>
                )
              })}
            </FlexCol>
          ) : null}
          <Details details={details} />
        </FlexCol>
      </Padded>
    </Content>
  )

  // if server defines that UTXO transactions are not allowed,
  // don't allow settlement since it is a UTXO transaction.
  const showSettleButtons =
    utxoTxsAllowed() &&
    vtxoTxsAllowed() &&
    !unconfirmedBoardingTx &&
    !expiredBoardingTx &&
    hasInputsToSettle &&
    amountAboveDust &&
    !settleSuccess &&
    !tx.settled &&
    !settling

  const Buttons = () =>
    expiredBoardingTx ? (
      <ButtonsOnBottom>
        <Button onClick={handleResend} label='Resend' disabled={resending || true} />
      </ButtonsOnBottom>
    ) : showSettleButtons ? (
      <>
        <ButtonsOnBottom>
          <Button onClick={handleSettle} label={buttonLabel} disabled={settling} />
          <Button onClick={() => setReminderIsOpen(true)} label='Add reminder' secondary />
        </ButtonsOnBottom>
        <Reminder
          isOpen={reminderIsOpen}
          callback={() => setReminderIsOpen(false)}
          duration={duration}
          name='Settle transaction'
          startTime={startTime}
        />
      </>
    ) : null

  return (
    <>
      <Header text='Transaction' back={handleBack} />
      {settling ? <WaitingForRound settle /> : <Body />}
      <Buttons />
    </>
  )
}
