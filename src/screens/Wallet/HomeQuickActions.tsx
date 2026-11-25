import { useContext } from 'react'
import { NavigationContext, Pages } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import { FlowContext, emptyRecvInfo, emptySendInfo } from '../../providers/flow'
import { useTranslation } from '../../providers/language'
import { hapticLight } from '../../lib/haptics'
import PixelArrow from '../../icons/PixelArrow'

export default function HomeQuickActions({
  onReceive,
  onSend,
  receiveDisabled,
  sendDisabled,
}: {
  onReceive?: () => void
  onSend?: () => void
  receiveDisabled?: boolean
  sendDisabled?: boolean
} = {}) {
  const { navigate } = useContext(NavigationContext)
  const { booting, dataReady } = useContext(WalletContext)
  const homeBusy = Boolean(booting) && !dataReady
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { t } = useTranslation()

  const handleReceive = () => {
    if (homeBusy) return
    hapticLight()
    if (onReceive) return onReceive()
    setRecvInfo(emptyRecvInfo)
    navigate(Pages.ReceiveQRCode)
  }

  const handleSend = () => {
    if (homeBusy) return
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
        disabled={receiveDisabled || homeBusy}
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
        disabled={sendDisabled || homeBusy}
      >
        <span className='home-actions__label'>
          {t('wallet.send')}
          <PixelArrow direction='upRight' />
        </span>
      </button>
    </div>
  )
}
