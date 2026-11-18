import { useContext } from 'react'
import { NavigationContext, Pages } from '../../providers/navigation'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../providers/flow'
import { useTranslation } from '../../providers/language'
import { hapticLight } from '../../lib/haptics'
import Glyph from '../../icons/Glyph'

/**
 * The two things a wallet is for, side by side under the balance. Swap sits
 * with the assets it acts on and Scan sits in the header.
 */
export default function HomeQuickActions() {
  const { navigate } = useContext(NavigationContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { t } = useTranslation()

  const handleReceive = () => {
    hapticLight()
    setRecvInfo(emptyRecvInfo)
    navigate(Pages.ReceiveQRCode)
  }

  const handleSend = () => {
    hapticLight()
    setSendInfo(emptySendInfo)
    navigate(Pages.SendForm)
  }

  return (
    <div className='home-actions' role='toolbar' aria-label={t('wallet.walletActions')}>
      <button type='button' className='button secondary' data-testid='home-action-receive' onClick={handleReceive}>
        <span className='home-actions__label'>
          <Glyph name='arrowDown' size={18} strokeWidth={2} />
          {t('wallet.receive')}
        </span>
      </button>
      <button type='button' className='button dark' data-testid='home-action-send' onClick={handleSend}>
        <span className='home-actions__label'>
          <Glyph name='arrowUp' size={18} strokeWidth={2} />
          {t('wallet.send')}
        </span>
      </button>
    </div>
  )
}
