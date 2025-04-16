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
import WarningBox from '../../components/Warning'
import { ConfigContext } from '../../providers/config'
import { extractError } from '../../lib/error'
import Error from '../../components/Error'
import WaitingForRound from '../../components/WaitingForRound'
import { AspContext } from '../../providers/asp'
import Reminder from '../../components/Reminder'
import { settleVtxos } from '../../lib/asp'

const Box = ({ children }: { children: ReactNode }) => {
  const style = {
    backgroundColor: 'var(--dark10)',
    border: '1px solid var(--dark20)',
    borderRadius: '0.25rem',
    padding: '0.5rem',
    width: '100%',
  }
  return (
    <div style={style}>
      <FlexRow between>{children}</FlexRow>
    </div>
  )
}

const VtxoLine = ({ hide, vtxo }: { hide: boolean; vtxo: Vtxo }) => {
  const amount = hide ? prettyHide(vtxo.value) : prettyNumber(vtxo.value)
  return (
    <Box>
      <Text>{amount} SATS</Text>
      <Text>{prettyAgo(vtxo.createdAt.getTime())}</Text>
    </Box>
  )
}

export default function Vtxos() {
  const { aspInfo, calcBestMarketHour } = useContext(AspContext)
  const { config } = useContext(ConfigContext)
  const { vtxos, wallet, svcWallet } = useContext(WalletContext)

  const defaultLabel = 'Renew Virtual Coins'

  const [error, setError] = useState('')
  const [label, setLabel] = useState(defaultLabel)
  const [rollingover, setRollingover] = useState(false)
  const [reminderIsOpen, setReminderIsOpen] = useState(false)
  const [showList, setShowList] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
  }, [aspInfo.unreachable])

  useEffect(() => {
    setLabel(rollingover ? 'Renewing...' : defaultLabel)
  }, [rollingover])

  useEffect(() => {
    const bestMarketHour = calcBestMarketHour(wallet.nextRollover)
    if (bestMarketHour) {
      setStartTime(bestMarketHour.startTime)
      setDuration(bestMarketHour.duration)
    } else {
      setStartTime(wallet.nextRollover)
      setDuration(0)
    }
  }, [wallet.nextRollover])

  const handleRollover = async () => {
    try {
      setRollingover(true)
      await settleVtxos(svcWallet)
      setRollingover(false)
    } catch (err) {
      setError(extractError(err))
      setRollingover(false)
    }
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
              <Error error={Boolean(error)} text={error} />
              {vtxos.spendable?.length === 0 ? (
                <WarningBox red text='No virtual coins available' />
              ) : showList ? (
                <FlexCol gap='0.5rem'>
                  <Text capitalize color='dark50' smaller>
                    Your virtual coins with amount and expiration
                  </Text>
                  {vtxos.spendable?.map((v: Vtxo) => (
                    <VtxoLine key={v.txid} hide={!config.showBalance} vtxo={v} />
                  ))}
                </FlexCol>
              ) : (
                <>
                  <FlexCol gap='0.5rem' margin='0 0 1rem 0'>
                    <Error error={Boolean(error)} text={error} />
                    <Text capitalize color='dark50' smaller>
                      Next renewal
                    </Text>
                    <Box>
                      <Text>{prettyDate(wallet.nextRollover)}</Text>
                      <Text>{prettyAgo(wallet.nextRollover)}</Text>
                    </Box>
                  </FlexCol>
                  <FlexCol gap='0.5rem' margin='2rem 0 0 0'>
                    <TextSecondary>First virtual coin expiration: {prettyAgo(wallet.nextRollover)}.</TextSecondary>
                    <TextSecondary>
                      Your virtual coins have a lifetime of {prettyDelta(aspInfo.vtxoTreeExpiry)} and need renewal
                      before expiration.
                    </TextSecondary>
                    <TextSecondary>Automatic renewal occurs for virtual coins expiring within 24 hours.</TextSecondary>
                    {startTime ? (
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
      <ButtonsOnBottom>
        {vtxos.spendable.length > 0 ? <Button onClick={handleRollover} label={label} disabled={rollingover} /> : null}
        {wallet.nextRollover ? <Button onClick={() => setReminderIsOpen(true)} label='Add reminder' secondary /> : null}
      </ButtonsOnBottom>
      <Reminder
        callback={() => setReminderIsOpen(false)}
        duration={duration}
        isOpen={reminderIsOpen}
        name='Virtual Coin Renewal'
        startTime={wallet.nextRollover}
      />
    </>
  )
}
