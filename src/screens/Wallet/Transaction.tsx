import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import Padded from '../../components/Padded'
import { WalletContext } from '../../providers/wallet'
import { FlowContext } from '../../providers/flow'
import { prettyAgo, prettyDate, prettyDelta } from '../../lib/format'
import { defaultFee } from '../../lib/constants'
import ErrorMessage from '../../components/Error'
import { extractError } from '../../lib/error'
import Header from '../../components/Header'
import Content from '../../components/Content'
import Info from '../../components/Info'
import FlexCol from '../../components/FlexCol'
import WaitingForRound from '../../components/WaitingForRound'
import { sleep } from '../../lib/sleep'
import Text, { TextSecondary } from '../../components/Text'
import Details, { DetailsProps } from '../../components/Details'
import VtxosIcon from '../../icons/Vtxos'
import CheckMarkIcon from '../../icons/CheckMark'
import { AspContext } from '../../providers/asp'
import Reminder from '../../components/Reminder'
import { LimitsContext } from '../../providers/limits'

export default function Transaction() {
  const { navigate } = useContext(NavigationContext)
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { txInfo, setTxInfo } = useContext(FlowContext)
  const { aspInfo, calcBestMarketHour } = useContext(AspContext)
  const { settlePreconfirmed, txs, wallet } = useContext(WalletContext)

  const tx = txInfo
  const defaultButtonLabel = 'Settle transaction'
  const unconfirmedBoardingTx = tx?.boardingTxid && !tx?.createdAt

  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [amountAboveDust, setAmountAboveDust] = useState(false)
  const [canSettleOnMarketHour, setCanSettleOnMarketHour] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [reminderIsOpen, setReminderIsOpen] = useState(false)
  const [settleSuccess, setSettleSuccess] = useState(false)
  const [settling, setSettling] = useState(false)
  const [startTime, setStartTime] = useState(0)

  useEffect(() => {
    setButtonLabel(settling ? 'Settling...' : defaultButtonLabel)
  }, [settling])

  useEffect(() => {
    if (!tx) return
    const expiration = tx.createdAt + Number(aspInfo.vtxoTreeExpiry)
    const bestMarketHour = calcBestMarketHour(expiration)
    if (bestMarketHour) {
      // setCanSettleOnMarketHour(true) TODO remove after
      setCanSettleOnMarketHour(false)
      setStartTime(Number(bestMarketHour.nextStartTime))
      setDuration(bestMarketHour.duration)
    } else {
      setCanSettleOnMarketHour(false)
      setStartTime(wallet.nextRollover)
      setDuration(0)
    }
  }, [wallet.nextRollover])

  useEffect(() => {
    if (!txs?.length) return
    const totalAmount =
      txs
        .filter((tx) => tx.settled === false)
        .filter((tx) => tx.boardingTxid || tx.preconfirmed)
        .reduce((a, v) => a + v.amount, 0) || 0
    setAmountAboveDust(totalAmount > aspInfo.dust)
  }, [txs])

  const handleBack = () => navigate(Pages.Wallet)

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
    direction: tx.type === 'sent' ? 'Sent' : 'Received',
    when: tx.createdAt ? prettyAgo(tx.createdAt) : unconfirmedBoardingTx ? 'Unconfirmed' : 'Unknown',
    date: tx.createdAt ? prettyDate(tx.createdAt) : unconfirmedBoardingTx ? 'Unconfirmed' : 'Unknown',
    satoshis: tx.type === 'sent' ? tx.amount - defaultFee : tx.amount,
    fees: tx.type === 'sent' ? defaultFee : 0,
    total: tx.amount,
  }

  const bestMarketHourStr = `${prettyDate(startTime)} (${prettyAgo(startTime, true)}) for ${prettyDelta(duration)}`

  const Body = () => (
    <Content>
      <Padded>
        <FlexCol>
          <ErrorMessage error={Boolean(error)} text={error} />
          {tx.settled ? null : unconfirmedBoardingTx ? (
            <Info color='orange' icon={<VtxosIcon />} title='Unconfirmed'>
              <Text wrap>Onchain transaction unconfirmed. Please wait for confirmation.</Text>
            </Info>
          ) : (
            <Info color='orange' icon={<VtxosIcon />} title='Preconfirmed'>
              <Text wrap>Transaction preconfirmed. Funds will be non-reversible after settlement.</Text>
              {canSettleOnMarketHour ? (
                <TextSecondary>
                  Settlement during market hours offers lower fees.
                  <br />
                  Best market hour: {bestMarketHourStr}.
                </TextSecondary>
              ) : null}
            </Info>
          )}
          {settleSuccess ? (
            <Info color='green' icon={<CheckMarkIcon small />} title='Success'>
              <TextSecondary>Transaction settled successfully</TextSecondary>
            </Info>
          ) : null}
          <Details details={details} />
        </FlexCol>
      </Padded>
    </Content>
  )

  // if server defines that UTXO transactions are not allowed,
  // don't allow settlement since it is a UTXO transaction.
  const showButtons =
    utxoTxsAllowed() &&
    vtxoTxsAllowed() &&
    amountAboveDust &&
    !unconfirmedBoardingTx &&
    !tx.settled &&
    !settling &&
    !settleSuccess

  const Buttons = () =>
    showButtons ? (
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
