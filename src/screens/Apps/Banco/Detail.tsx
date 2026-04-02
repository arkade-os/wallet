import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { hex } from '@scure/base'
import { banco } from '@arkade-os/sdk'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Shadow from '../../../components/Shadow'
import Text from '../../../components/Text'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { BancoContext } from '../../../providers/banco'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import { prettyDate } from '../../../lib/format'
import type { BancoSwap } from '../../../lib/banco'

const INTROSPECTOR_URL = import.meta.env.VITE_INTROSPECTOR_URL
const POLL_INTERVAL = 5000

function statusIcon(status: BancoSwap['status']): string {
  if (status === 'fulfilled') return '✓'
  if (status === 'cancelled') return '✕'
  return '⏳'
}

function statusColor(status: BancoSwap['status']): string {
  if (status === 'fulfilled') return 'green'
  if (status === 'cancelled') return 'red'
  return 'yellow'
}

function statusSubtitle(status: BancoSwap['status']): string {
  if (status === 'fulfilled') return 'Swap completed successfully'
  if (status === 'cancelled') return 'Swap cancelled'
  return 'Waiting for taker to fulfill'
}

function truncate(s: string, start = 6, end = 4): string {
  if (s.length <= start + end + 3) return s
  return s.slice(0, start) + '…' + s.slice(-end)
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AppBancoDetail() {
  const { navigate } = useContext(NavigationContext)
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  const { swaps, updateSwap, selectedSwapId } = useContext(BancoContext)

  const swap = swaps.find((s) => s.id === selectedSwapId)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const pollRef = useRef<ReturnType<typeof setInterval>>()
  const tickRef = useRef<ReturnType<typeof setInterval>>()

  // Tick every second for countdown
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  // Poll for fulfillment
  useEffect(() => {
    if (!swap || swap.status !== 'pending' || !svcWallet || !aspInfo.url || !INTROSPECTOR_URL) return

    const serverUrl = aspInfo.url.startsWith('http') ? aspInfo.url : 'http://' + aspInfo.url
    const poll = async () => {
      try {
        const maker = new banco.Maker(svcWallet, serverUrl, INTROSPECTOR_URL)
        const offers = await maker.getOffers(hex.decode(swap.swapPkScript))
        const stillPending = offers.some((o) => o.spendable)
        if (!stillPending) {
          updateSwap(swap.id, { status: 'fulfilled' })
        }
      } catch (err) {
        consoleError(err, 'error polling banco offer status')
      }
    }

    poll()
    pollRef.current = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [swap?.id, swap?.status])

  const canCancel = swap && swap.status === 'pending' && swap.cancelAt > 0 && now >= swap.cancelAt
  const cancelCountdown = swap && swap.cancelAt > 0 ? Math.max(0, swap.cancelAt - now) : 0

  const handleCancel = useCallback(async () => {
    if (!swap || !svcWallet || !aspInfo.url || !INTROSPECTOR_URL) return
    setCancelling(true)
    setCancelError('')
    try {
      const serverUrl = aspInfo.url.startsWith('http') ? aspInfo.url : 'http://' + aspInfo.url
      const maker = new banco.Maker(svcWallet, serverUrl, INTROSPECTOR_URL)
      await maker.cancelOffer(swap.offerHex)
      updateSwap(swap.id, { status: 'cancelled' })
    } catch (err) {
      consoleError(err, 'error cancelling banco swap')
      setCancelError(extractError(err))
    } finally {
      setCancelling(false)
    }
  }, [swap, svcWallet, aspInfo.url])

  if (!swap) {
    return (
      <>
        <Header text='Swap Detail' back />
        <Content>
          <Padded>
            <Text>Swap not found</Text>
          </Padded>
        </Content>
      </>
    )
  }

  const isPast = swap.status !== 'pending'
  const payLabel = isPast ? 'You paid' : 'You pay'
  const receiveLabel = isPast ? 'You received' : 'You receive'

  return (
    <>
      <Header text='Swap Detail' back />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            {/* Status hero */}
            <FlexCol centered gap='0.25rem'>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  background:
                    swap.status === 'fulfilled'
                      ? 'rgba(74, 222, 128, 0.15)'
                      : swap.status === 'cancelled'
                        ? 'rgba(248, 113, 113, 0.15)'
                        : 'rgba(250, 204, 21, 0.15)',
                }}
              >
                {statusIcon(swap.status)}
              </div>
              <Text big bold color={statusColor(swap.status)}>
                {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
              </Text>
              <Text smaller color='dark50'>
                {statusSubtitle(swap.status)}
              </Text>
            </FlexCol>

            {/* Summary card */}
            <Shadow lighter>
              <FlexCol padding='0.75rem' gap='0.5rem'>
                <FlexRow between>
                  <div style={{ flex: 1 }}>
                    <FlexCol centered>
                      <Text smaller color='dark50'>
                        {payLabel}
                      </Text>
                      <Text big bold>
                        {swap.payAmount}
                      </Text>
                      <Text smaller color='dark50'>
                        {swap.payAsset || 'sats'}
                      </Text>
                    </FlexCol>
                  </div>
                  <div style={{ padding: '0 0.5rem' }}>
                    <Text color='dark50'>→</Text>
                  </div>
                  <div style={{ flex: 1 }}>
                    <FlexCol centered>
                      <Text smaller color='dark50'>
                        {receiveLabel}
                      </Text>
                      <Text big bold color={swap.status === 'fulfilled' ? 'green' : undefined}>
                        {swap.receiveAmount}
                      </Text>
                      <Text smaller color='dark50'>
                        {swap.receiveAsset || 'sats'}
                      </Text>
                    </FlexCol>
                  </div>
                </FlexRow>
                <div style={{ borderTop: '1px solid var(--dark10)' }} />
                <FlexRow between>
                  <Text smaller color='dark50'>
                    Pair
                  </Text>
                  <Text smaller bold>
                    {swap.pair}
                  </Text>
                </FlexRow>
                <FlexRow between>
                  <Text smaller color='dark50'>
                    Created
                  </Text>
                  <Text smaller>{prettyDate(Math.floor(swap.createdAt / 1000))}</Text>
                </FlexRow>
                {swap.status === 'pending' && swap.cancelAt > 0 ? (
                  <FlexRow between>
                    <Text smaller color='dark50'>
                      Cancel available
                    </Text>
                    <Text smaller color={canCancel ? 'green' : 'yellow'}>
                      {canCancel ? 'Now' : `in ${formatCountdown(cancelCountdown)}`}
                    </Text>
                  </FlexRow>
                ) : null}
              </FlexCol>
            </Shadow>

            {/* Transaction info */}
            <Shadow lighter>
              <FlexCol padding='0.75rem' gap='0.25rem'>
                <FlexRow between>
                  <Text smaller color='dark50'>
                    Funding tx
                  </Text>
                  <Text smaller copy={swap.fundingTxid}>
                    {truncate(swap.fundingTxid)}
                  </Text>
                </FlexRow>
                <FlexRow between>
                  <Text smaller color='dark50'>
                    Swap address
                  </Text>
                  <Text smaller copy={swap.swapAddress}>
                    {truncate(swap.swapAddress, 8, 6)}
                  </Text>
                </FlexRow>
              </FlexCol>
            </Shadow>

            {cancelError ? (
              <Shadow>
                <FlexCol padding='0.5rem'>
                  <Text smaller color='red'>
                    {cancelError}
                  </Text>
                </FlexCol>
              </Shadow>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {swap.status === 'pending' ? (
          <Button
            label={
              canCancel
                ? cancelling
                  ? 'Cancelling...'
                  : 'Cancel Swap'
                : `Cancel Swap (${formatCountdown(cancelCountdown)})`
            }
            onClick={() => {
              if (canCancel) handleCancel()
            }}
            disabled={!canCancel || cancelling}
            secondary
          />
        ) : (
          <Button label='Done' onClick={() => navigate(Pages.AppBanco)} />
        )}
      </ButtonsOnBottom>
    </>
  )
}
