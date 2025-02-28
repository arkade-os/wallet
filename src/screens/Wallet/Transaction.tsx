import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import Padded from '../../components/Padded'
import { WalletContext } from '../../providers/wallet'
import { FlowContext } from '../../providers/flow'
import { prettyAgo, prettyDate, prettyDelta, prettyHide, prettyNumber } from '../../lib/format'
import { defaultFee } from '../../lib/constants'
import Table from '../../components/Table'
import Error from '../../components/Error'
import { extractError } from '../../lib/error'
import Header from '../../components/Header'
import Content from '../../components/Content'
import Info from '../../components/Info'
import FlexCol from '../../components/FlexCol'
import { ConfigContext } from '../../providers/config'
import WaitingForRound from '../../components/WaitingForRound'
import { sleep } from '../../lib/sleep'
import { AspContext } from '../../providers/asp'
import { TextSecondary } from '../../components/Text'
import Reminder from '../../components/Reminder'

export default function Transaction() {
  const { aspInfo, calcNextMarketHour } = useContext(AspContext)
  const { config } = useContext(ConfigContext)
  const { txInfo, setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { settlePending, wallet } = useContext(WalletContext)

  const tx = txInfo
  const defaultButtonLabel = 'Settle Transaction'

  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
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
    const expiration = tx?.createdAt + aspInfo.vtxoTreeExpiry
    const nextMarketHour = calcNextMarketHour(expiration)
    if (nextMarketHour) {
      setCanSettleOnMarketHour(true)
      setStartTime(nextMarketHour.startTime)
      setDuration(nextMarketHour.duration)
    } else {
      setCanSettleOnMarketHour(false)
      setStartTime(wallet.nextRollover)
      setDuration(0)
    }
  }, [wallet.nextRollover])

  const handleBack = () => navigate(Pages.Wallet)

  const handleSettle = async () => {
    setError('')
    setSettling(true)
    try {
      await settlePending()
      await sleep(2000) // give time to read last message
      setSettleSuccess(true)
      if (tx) setTxInfo({ ...tx, pending: false, settled: true })
    } catch (err) {
      setError(extractError(err))
    }
    setSettling(false)
  }

  if (!tx) return <></>

  const amount = tx.type === 'sent' ? tx.amount - defaultFee : tx.amount

  const data = [
    ['Direction', tx.type === 'sent' ? 'Sent' : 'Received'],
    ['When', prettyAgo(tx.createdAt)],
    ['Date', prettyDate(tx.createdAt)],
    ['Amount', `${config.showBalance ? prettyNumber(amount) : prettyHide(amount)} sats`],
    ['Network fees', `${prettyNumber(tx.type === 'sent' ? defaultFee : 0)} sats`],
    ['Total', `${config.showBalance ? prettyNumber(tx.amount) : prettyHide(tx.amount)} sats`],
  ].filter((l) => l[1])

  return (
    <>
      <Header text='Transaction' back={handleBack} />
      <Content>
        {settling ? (
          <WaitingForRound settle />
        ) : (
          <Padded>
            <FlexCol>
              <Error error={Boolean(error)} text={error} />
              {tx.settled ? null : (
                <Info color='yellowoutlier' title='Pending'>
                  <TextSecondary>
                    Transaction pending. Funds will be non-reversible after settlement.
                  </TextSecondary>
                  {canSettleOnMarketHour ? (
                    <TextSecondary>
                      Settlement during market hours offers lower fees. Next market hour: {' '}
                      {prettyDate(startTime)} ({prettyAgo(startTime, true)}) for {prettyDelta(duration)}.
                    </TextSecondary>
                  ) : null}
                </Info>
              )}
              {settleSuccess ? (
                <Info color='green' title='Success'>
                  <TextSecondary>Transaction settled successfully</TextSecondary>
                </Info>
              ) : null}
              <Table data={data} />
            </FlexCol>
          </Padded>
        )}
      </Content>
      {tx.settled ? null : (
        <ButtonsOnBottom>
          <Button onClick={handleSettle} label={buttonLabel} disabled={settling} />
          <Button onClick={() => setReminderIsOpen(true)} label='Add reminder' secondary />
        </ButtonsOnBottom>
      )}
      <Reminder
        isOpen={reminderIsOpen}
        callback={() => setReminderIsOpen(false)}
        duration={duration}
        name='Settle transaction'
        startTime={startTime}
      />
    </>
  )
}
