import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import { EmptySwapList } from './Empty'
import { FlowContext } from '../providers/flow'
import { ConfigContext } from '../providers/config'
import Text, { TextLabel, TextSecondary } from './Text'
import { useContext, useEffect, useRef, useState } from 'react'
import { LightningContext } from '../providers/lightning'
import { NavigationContext, Pages } from '../providers/navigation'
import { prettyAgo, prettyAmount, prettyDate, prettyHide } from '../lib/format'
import { SwapFailedIcon, SwapPendingIcon, SwapSuccessIcon } from '../icons/Swap'
import { BoltzSwapStatus, PendingReverseSwap, PendingSubmarineSwap } from '@arkade-os/boltz-swap'
import { consoleError } from '../lib/logs'

const border = '1px solid var(--dark20)'

type statusUI = 'Successful' | 'Pending' | 'Failed' | 'Refunded'

const statusDict = {
  'invoice.expired': 'Failed',
  'invoice.failedToPay': 'Failed',
  'invoice.paid': 'Successful',
  'invoice.pending': 'Pending',
  'invoice.set': 'Pending',
  'invoice.settled': 'Successful',
  'swap.created': 'Pending',
  'swap.expired': 'Failed',
  'transaction.claim.pending': 'Pending',
  'transaction.claimed': 'Successful',
  'transaction.confirmed': 'Successful',
  'transaction.failed': 'Failed',
  'transaction.lockupFailed': 'Failed',
  'transaction.mempool': 'Pending',
  'transaction.refunded': 'Refunded',
} satisfies Record<BoltzSwapStatus, statusUI>

const colorDict: Record<statusUI, string> = {
  Failed: 'red',
  Successful: 'green',
  Pending: 'yellow',
  Refunded: 'dark50',
}

const iconDict: Record<statusUI, JSX.Element> = {
  Failed: <SwapFailedIcon />,
  Successful: <SwapSuccessIcon />,
  Pending: <SwapPendingIcon />,
  Refunded: <SwapFailedIcon />,
}

const SwapLine = ({
  swap,
  focusable,
  unfocus,
}: {
  swap: PendingReverseSwap | PendingSubmarineSwap
  focusable: boolean
  unfocus: () => void
}) => {
  const { config } = useContext(ConfigContext)
  const { setSwapInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const sats = swap.type === 'reverse' ? swap.response.onchainAmount : swap.response.expectedAmount
  const direction = swap.type === 'reverse' ? 'Lightning to Arkade' : 'Arkade to Lightning'
  const status: statusUI = statusDict[swap.status] || 'Pending'
  const prefix = swap.type === 'reverse' ? '+' : '-'
  const amount = `${prefix} ${config.showBalance ? prettyAmount(sats) : prettyHide(sats)}`
  const when = window.innerWidth < 400 ? prettyAgo(swap.createdAt) : prettyDate(swap.createdAt)
  const refunded = swap.type === 'submarine' && swap.refunded
  const color = refunded ? colorDict['Refunded'] : colorDict[status]
  const tabindex = focusable ? 0 : -1

  const Icon = iconDict[status]
  const Kind = () => <Text thin>{direction}</Text>
  const When = () => <TextSecondary>{when}</TextSecondary>
  const Sats = () => <Text color={color}>{amount}</Text>
  const Stat = () => <Text color={color}>{refunded ? 'Refunded' : status}</Text>

  const handleClick = () => {
    setSwapInfo(swap)
    navigate(Pages.AppBoltzSwap)
  }

  const rowStyle = {
    alignItems: 'center',
    borderTop: border,
    cursor: 'pointer',
    padding: '0.5rem 1rem',
  }

  const Left = () => (
    <FlexRow>
      {Icon}
      <div>
        <Kind />
        <Sats />
      </div>
    </FlexRow>
  )

  const Right = () => (
    <FlexCol gap='0' end>
      <Stat />
      <When />
    </FlexCol>
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleClick()
    if (e.key === 'Escape') unfocus()
  }

  return (
    <div
      className='focusable'
      style={rowStyle}
      role='button'
      tabIndex={tabindex}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <FlexRow>
        <Left />
        <Right />
      </FlexRow>
    </div>
  )
}

export default function SwapsList() {
  const { arkadeLightning, swapManager, getSwapHistory } = useContext(LightningContext)

  const [focusable, setFocusable] = useState(false)
  const [swapHistory, setSwapHistory] = useState<(PendingReverseSwap | PendingSubmarineSwap)[]>([])

  const ref = useRef<HTMLDivElement>(null)

  // Load initial swap history
  useEffect(() => {
    const loadHistory = async () => {
      if (!arkadeLightning) return
      try {
        const history = await getSwapHistory()
        setSwapHistory(history)
      } catch (err) {
        consoleError(err, 'Error fetching swap history:')
      }
    }
    loadHistory()
  }, [arkadeLightning])

  // Subscribe to swap updates from SwapManager for real-time updates
  useEffect(() => {
    if (!swapManager) return

    const unsubscribe = swapManager.onSwapUpdate((swap) => {
      setSwapHistory((prev) => {
        const existingIndex = prev.findIndex((s) => s.id === swap.id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = swap
          return updated
        }
        // New swap, add to beginning
        return [swap, ...prev]
      })
    })

    return unsubscribe
  }, [swapManager])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'Space') {
      setFocusable(true)
    }
  }

  const handleUnfocus = () => {
    setFocusable(false)
    ref.current?.focus()
  }

  if (swapHistory.length === 0) return <EmptySwapList />

  return (
    <div style={{ width: 'calc(100% + 2rem)', margin: '0 -1rem' }}>
      <div className='focusable' tabIndex={0} onKeyDown={handleKeyDown} ref={ref}>
        <TextLabel>Swap history</TextLabel>
      </div>
      <div style={{ borderBottom: border }}>
        {swapHistory.map((swap) => (
          <SwapLine key={swap.response.id} focusable={focusable} swap={swap} unfocus={handleUnfocus} />
        ))}
      </div>
    </div>
  )
}
