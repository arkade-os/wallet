import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import { useContext } from 'react'
import { FlowContext } from '../providers/flow'
import { ConfigContext } from '../providers/config'
import Text, { TextLabel, TextSecondary } from './Text'
import { LightningContext } from '../providers/lightning'
import { NavigationContext, Pages } from '../providers/navigation'
import { prettyAmount, prettyDate, prettyHide } from '../lib/format'
import { SwapFailedIcon, SwapPendingIcon, SwapSuccessIcon } from '../icons/Swap'
import { BoltzSwapStatus, PendingReverseSwap, PendingSubmarineSwap } from '@arkade-os/boltz-swap'

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

const iconDict: Record<statusUI, React.JSX.Element> = {
  Failed: <SwapFailedIcon />,
  Successful: <SwapSuccessIcon />,
  Pending: <SwapPendingIcon />,
  Refunded: <SwapFailedIcon />,
}

const SwapLine = ({ swap }: { swap: PendingReverseSwap | PendingSubmarineSwap }) => {
  const { config } = useContext(ConfigContext)
  const { setSwapInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const sats = swap.type === 'reverse' ? swap.response.onchainAmount : swap.response.expectedAmount
  const direction = swap.type === 'reverse' ? 'Lightning to Arkade' : 'Arkade to Lightning'
  const status = statusDict[swap.status] || 'Pending'
  const color = colorDict[status]
  const prefix = swap.type === 'reverse' ? '+' : '-'
  const amount = `${prefix} ${config.showBalance ? prettyAmount(sats) : prettyHide(sats)}`

  const Icon = iconDict[status]
  const Kind = () => <Text thin>{direction}</Text>
  const When = () => <TextSecondary>{prettyDate(swap.createdAt)}</TextSecondary>
  const Sats = () => <Text color={color}>{amount}</Text>
  const Stat = () => <Text color={color}>{status}</Text>

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

  return (
    <div
      style={rowStyle}
      role='button'
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick()
      }}
    >
      <FlexRow>
        <Left />
        <Right />
      </FlexRow>
    </div>
  )
}

export default function SwapsList() {
  const { swapProvider } = useContext(LightningContext)

  const history = swapProvider?.getSwapHistory() ?? []

  return (
    <div style={{ width: 'calc(100% + 2rem)', margin: '0 -1rem' }}>
      <TextLabel>Swap history</TextLabel>
      <div style={{ borderBottom: border }}>
        {history.map((swap) => (
          <SwapLine key={swap.response.id} swap={swap} />
        ))}
      </div>
    </div>
  )
}
