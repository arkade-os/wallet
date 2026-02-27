import { ReactNode, useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { WalletContext } from '../../providers/wallet'
import { prettyAgo, prettyDate, prettyDelta, prettyHide, prettyNumber } from '../../lib/format'
import Header from './Header'
import Text, { TextSecondary } from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { Vtxo } from '../../lib/types'
import FlexRow from '../../components/FlexRow'
import { ConfigContext } from '../../providers/config'
import { extractError } from '../../lib/error'
import ErrorMessage from '../../components/Error'
import WaitingForRound from '../../components/WaitingForRound'
import { AspContext } from '../../providers/asp'
import Reminder from '../../components/Reminder'
import { getInputsToSettle, settleVtxos } from '../../lib/asp'
import Loading from '../../components/Loading'
import { LimitsContext } from '../../providers/limits'
import { EmptyCoinsList } from '../../components/Empty'
import WarningBox from '../../components/Warning'
import { ExtendedCoin, ExtendedVirtualCoin, isVtxoExpiringSoon } from '@arkade-os/sdk'
import { consoleError } from '../../lib/logs'
import { IonCol, IonGrid, IonRow } from '@ionic/react'

export default function Vtxos() {
  const { aspInfo, calcBestMarketHour } = useContext(AspContext)
  const { config } = useContext(ConfigContext)
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { reloadWallet, vtxos, wallet, svcWallet } = useContext(WalletContext)

  const defaultLabel = 'Renew Virtual Coins'

  const [aboveDust, setAboveDust] = useState(false)
  const [allUtxos, setAllUtxos] = useState<ExtendedCoin[]>([])
  const [allVtxos, setAllVtxos] = useState<ExtendedVirtualCoin[]>([])
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [hasInputsToSettle, setHasInputsToSettle] = useState(false)
  const [hideUtxos, setHideUtxos] = useState(false)
  const [label, setLabel] = useState(defaultLabel)
  const [rollingover, setRollingover] = useState(false)
  const [reminderIsOpen, setReminderIsOpen] = useState(false)
  const [showList, setShowList] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [success, setSuccess] = useState(false)
  const [hasVtxosToSettle, setHasVtxosToSettle] = useState(false)
  const [hasBoardingUtxosToSettle, setHasBoardingUtxosToSettle] = useState(false)

  // Update error state if aspInfo.unreachable changes
  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
  }, [aspInfo.unreachable])

  // Update label based on rolling over state and dust status
  useEffect(() => {
    setLabel(
      !aboveDust
        ? 'Below dust limit'
        : hasVtxosToSettle && hasBoardingUtxosToSettle && !hideUtxos
          ? 'Complete boarding & renew'
          : hasVtxosToSettle
            ? 'Renew'
            : hasBoardingUtxosToSettle && !hideUtxos
              ? 'Complete boarding'
              : '',
    )
  }, [rollingover, aboveDust, hasVtxosToSettle, hasBoardingUtxosToSettle, hideUtxos])

  // Calculate best market hour when wallet.nextRollover changes
  useEffect(() => {
    const bestMarketHour = calcBestMarketHour(wallet.nextRollover)
    if (bestMarketHour) {
      setStartTime(Number(bestMarketHour.nextStartTime))
      setDuration(Number(bestMarketHour.duration))
    } else {
      setStartTime(wallet.nextRollover)
      setDuration(0)
    }
  }, [wallet.nextRollover])

  // Fetch all VTXOs and all UTXOs
  useEffect(() => {
    if (!aspInfo || !svcWallet) return
    // get all VTXOs including recoverable ones
    svcWallet
      .getVtxos({
        withRecoverable: true,
        withUnrolled: false,
      })
      .then(setAllVtxos)
      .catch(consoleError)
    // get all UTXOs
    svcWallet.getBoardingUtxos().then(setAllUtxos).catch(consoleError)
  }, [aspInfo, vtxos, svcWallet, wallet.thresholdMs])

  // Fetch inputs to settle
  useEffect(() => {
    if (!aspInfo || !svcWallet) return
    getInputsToSettle(svcWallet, wallet.thresholdMs).then(({ boardingUtxos, inputs, vtxos }) => {
      setHasBoardingUtxosToSettle(boardingUtxos.length > 0)
      setHasInputsToSettle(inputs.length > 0)
      setHasVtxosToSettle(vtxos.length > 0)
      const amount = inputs.reduce((a, v) => a + v.value, 0) || 0
      setAboveDust(amount > aspInfo.dust)
    })
  }, [allUtxos, allVtxos, aspInfo, svcWallet])

  // Automatically reset `success` after 5s, with cleanup on unmount or re-run
  useEffect(() => {
    if (!success) return
    setHideUtxos(true)
    const timeoutId = setTimeout(() => setSuccess(false), 5_000)
    return () => clearTimeout(timeoutId)
  }, [success])

  if (!svcWallet) return <Loading text='Loading...' />

  const listableVtxos = allVtxos.filter((vtxo) => vtxo.isSpent === false)

  const handleRollover = async () => {
    try {
      setRollingover(true)
      await settleVtxos(svcWallet, aspInfo.dust, wallet.thresholdMs)
      await reloadWallet()
      setRollingover(false)
      setSuccess(true)
    } catch (err) {
      setError(extractError(err))
      setRollingover(false)
    }
  }

  const Box = ({ children }: { children: ReactNode }) => {
    const style: React.CSSProperties = {
      backgroundColor: 'var(--dark10)',
      border: '1px solid var(--dark20)',
      borderRadius: '0.25rem',
      padding: '10px',
      width: '100%',
    }
    return (
      <div style={style}>
        <FlexRow between>{children}</FlexRow>
      </div>
    )
  }

  const Tags = {
    settled: (
      <Text color='green' smaller>
        settled
      </Text>
    ),
    subdust: (
      <Text color='orange' smaller>
        subdust
      </Text>
    ),
    swept: (
      <Text color='orange' smaller>
        swept
      </Text>
    ),
    unconfirmed: (
      <Text color='orange' smaller>
        unconfirmed
      </Text>
    ),
    expiring: (
      <Text color='red' smaller>
        expiring soon
      </Text>
    ),
  }

  const CoinLine = ({ amount, tags, expiry }: { amount: string; tags: React.ReactNode; expiry: string }) => {
    const style: React.CSSProperties = {
      backgroundColor: 'var(--dark10)',
      border: '1px solid var(--dark20)',
      borderRadius: '0.25rem',
      padding: '0',
      width: '100%',
    }
    return (
      <div style={style}>
        <FlexRow between>
          <IonGrid>
            <IonRow className='ion-align-items-end'>
              <IonCol size='4'>
                <Text>{amount}</Text>
              </IonCol>
              <IonCol size='4'>{tags}</IonCol>
              <IonCol size='4'>
                <Text right>{expiry}</Text>
              </IonCol>
            </IonRow>
          </IonGrid>
        </FlexRow>
      </div>
    )
  }

  const VtxoLine = ({ vtxo }: { vtxo: Vtxo }) => {
    const amount = config.showBalance ? prettyNumber(vtxo.value) : prettyHide(vtxo.value)
    const expiry = vtxo.virtualStatus?.batchExpiry ? prettyAgo(vtxo.virtualStatus.batchExpiry) : 'Unknown'
    const tags = (
      <FlexRow centered>
        {vtxo.value < aspInfo.dust
          ? Tags.subdust
          : vtxo.virtualStatus?.state === 'swept'
            ? Tags.swept
            : wallet.thresholdMs && isVtxoExpiringSoon(vtxo, wallet.thresholdMs)
              ? Tags.expiring
              : vtxo.virtualStatus?.state === 'settled'
                ? Tags.settled
                : null}
      </FlexRow>
    )
    return <CoinLine amount={`₿${amount}`} tags={tags} expiry={expiry} />
  }

  const UtxoLine = ({ utxo }: { utxo: ExtendedCoin }) => {
    const expiration = Number(aspInfo.boardingExitDelay)
    const amount = config.showBalance ? prettyNumber(utxo.value) : prettyHide(utxo.value)
    const expiry = utxo.status.block_time ? prettyAgo(utxo.status.block_time + expiration) : ''
    const tags = (
      <FlexRow centered>
        {!utxo.status.block_time ? Tags.unconfirmed : utxo.value < aspInfo.dust ? Tags.subdust : null}
      </FlexRow>
    )
    return <CoinLine amount={`₿${amount}`} tags={tags} expiry={expiry} />
  }

  return (
    <>
      <Header
        auxFunc={() => setShowList(!showList)}
        auxText={showList ? 'Date' : 'Coins'}
        back
        text={showList ? 'Virtual Coins' : 'Next Renewal'}
      />
      <Content>
        {rollingover ? (
          <WaitingForRound rollover />
        ) : (
          <Padded>
            <FlexCol>
              <ErrorMessage error={Boolean(error)} text={error} />
              {listableVtxos.length + allUtxos.length === 0 ? (
                <EmptyCoinsList />
              ) : showList ? (
                <FlexCol gap='2rem'>
                  {success ? <WarningBox green text='Coins renewed successfully' /> : null}
                  {listableVtxos.length > 0 ? (
                    <FlexCol gap='0.5rem'>
                      <Text capitalize color='dark50' smaller>
                        Your virtual coins with amount and expiration
                      </Text>
                      {listableVtxos.map((v: ExtendedVirtualCoin) => (
                        <VtxoLine key={v.txid} vtxo={v} />
                      ))}
                    </FlexCol>
                  ) : null}
                  {!hideUtxos && allUtxos.length > 0 ? (
                    <FlexCol gap='0.5rem'>
                      <Text capitalize color='dark50' smaller>
                        Your boarding utxos with amount and expiration
                      </Text>
                      {allUtxos.map((u: ExtendedCoin) => (
                        <UtxoLine key={u.txid} utxo={u} />
                      ))}
                    </FlexCol>
                  ) : null}
                </FlexCol>
              ) : (
                <>
                  <FlexCol gap='0.5rem' margin='0 0 1rem 0'>
                    <Text capitalize color='dark50' smaller>
                      Next renewal
                    </Text>
                    <Box>
                      <Text>{prettyDate(wallet.nextRollover)}</Text>
                      <Text>{prettyAgo(wallet.nextRollover)}</Text>
                    </Box>
                    {success ? <WarningBox green text='Coins renewed successfully' /> : null}
                  </FlexCol>
                  <FlexCol gap='0.5rem' margin='2rem 0 0 0'>
                    <TextSecondary>First virtual coin expiration: {prettyAgo(wallet.nextRollover)}.</TextSecondary>
                    {wallet.thresholdMs ? (
                      <TextSecondary>
                        Automatic renewal occurs for virtual coins expiring within{' '}
                        {prettyDelta(Math.floor(wallet.thresholdMs / 1_000))}.
                      </TextSecondary>
                    ) : null}
                    {startTime && duration ? (
                      <>
                        <TextSecondary>Settlement during market hours offers lower fees.</TextSecondary>
                        <TextSecondary>
                          Next market hour: {prettyDate(startTime)} ({prettyAgo(startTime, true)}) for{' '}
                          {prettyDelta(duration)}.
                        </TextSecondary>
                      </>
                    ) : null}
                  </FlexCol>
                </>
              )}
            </FlexCol>
          </Padded>
        )}
      </Content>
      {utxoTxsAllowed() && vtxoTxsAllowed() ? (
        <>
          <ButtonsOnBottom>
            {hasInputsToSettle && !hideUtxos ? (
              <Button onClick={handleRollover} label={label} disabled={rollingover || !aboveDust} />
            ) : null}
            {wallet.nextRollover ? (
              <Button onClick={() => setReminderIsOpen(true)} label='Add reminder' secondary />
            ) : null}
          </ButtonsOnBottom>
          <Reminder
            callback={() => setReminderIsOpen(false)}
            duration={duration}
            isOpen={reminderIsOpen}
            name='Virtual Coin Renewal'
            startTime={wallet.nextRollover}
          />
        </>
      ) : null}
    </>
  )
}
