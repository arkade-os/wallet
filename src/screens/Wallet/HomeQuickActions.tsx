import { useContext } from 'react'
import { NavigationContext, Pages } from '../../providers/navigation'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../providers/flow'
import { useTranslation } from '../../providers/language'
import { hapticLight } from '../../lib/haptics'
import PixelArrow from '../../icons/PixelArrow'

/**
 * The two things a wallet is for, side by side under the balance, set like
 * the buttons on arkadeos.com: the label in mono capitals and a pixel arrow at
 * the end. Swap sits with the assets it acts on and Scan sits in the header.
 */
export default function HomeQuickActions({
  onReceive,
  onSend,
  receiveDisabled,
  sendDisabled,
}: {
  /** An account or asset page passes its own, which open Receive and Send for that account. */
  onReceive?: () => void
  onSend?: () => void
  receiveDisabled?: boolean
  sendDisabled?: boolean
} = {}) {
  const { navigate } = useContext(NavigationContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { t } = useTranslation()

  const handleReceive = () => {
    hapticLight()
    if (onReceive) return onReceive()
    setRecvInfo(emptyRecvInfo)
    navigate(Pages.ReceiveQRCode)
  }

  const handleSend = () => {
    hapticLight()
    if (onSend) return onSend()
    setSendInfo(emptySendInfo)
    navigate(Pages.SendForm)
  }

  return (
    <div className='home-actions' role='toolbar' aria-label={t('wallet.walletActions')}>
      <button
        type='button'
        className='button outline'
        data-testid='home-action-receive'
        onClick={handleReceive}
        disabled={receiveDisabled}
      >
        <span className='home-actions__label'>
          {t('wallet.receive')}
          <PixelArrow direction='downLeft' />
        </span>
      </button>
      <button
        type='button'
        className='button dark'
        data-testid='home-action-send'
        onClick={handleSend}
        disabled={sendDisabled}
      >
        <span className='home-actions__label'>
          {t('wallet.send')}
          <PixelArrow direction='upRight' />
        </span>
      </button>
    </div>
  )
}
