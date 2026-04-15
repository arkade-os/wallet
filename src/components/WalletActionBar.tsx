import Button from './Button'
import SendIcon from '../icons/Send'
import SwapIcon from '../icons/Swap'
import ReceiveIcon from '../icons/Receive'

interface WalletActionBarProps {
  onSendClick: () => void
  onSwapClick: () => void
  onReceiveClick: () => void
}

/**
 * Full-width purple primary action buttons (Send | Swap | Receive).
 * Rendered inside WalletActionBarOverlay which supplies the fixed positioning
 * and gradient haze behind the buttons.
 */
export default function WalletActionBar({ onSendClick, onSwapClick, onReceiveClick }: WalletActionBarProps) {
  return (
    <div
      role='toolbar'
      aria-label='Wallet actions'
      style={{
        display: 'flex',
        gap: '0.5rem',
        width: '100%',
      }}
    >
      <div style={buttonWrap} data-testid='action-send'>
        <Button main icon={<SendIcon />} label='Send' onClick={onSendClick} />
      </div>
      <div style={buttonWrap} data-testid='action-swap'>
        <Button main icon={<SwapIcon />} label='Swap' onClick={onSwapClick} />
      </div>
      <div style={buttonWrap} data-testid='action-receive'>
        <Button main icon={<ReceiveIcon />} label='Receive' onClick={onReceiveClick} />
      </div>
    </div>
  )
}

const buttonWrap: React.CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
}
