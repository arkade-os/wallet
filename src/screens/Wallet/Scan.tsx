import { useContext } from 'react'
import Scanner from '@/components/Scanner'
import { consoleError } from '@/lib/logs'
import { useTranslation } from '@/providers/language'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { emptySendInfo, FlowContext } from '@/providers/flow'
import { overlaySlideUp, overlayStyle } from '@/lib/animations'
import { NavigationContext, Pages } from '@/providers/navigation'

export default function WalletScan() {
  const { setSendInfo } = useContext(FlowContext)
  const { replace, goBack } = useContext(NavigationContext)

  const prefersReducedMotion = useReducedMotion()
  const { t } = useTranslation()

  const handleData = (recipient: string) => {
    if (/^t?arkadecash/.test(recipient)) {
      // TODO: claim cash
    } else {
      setSendInfo({ ...emptySendInfo, recipient })
      replace(Pages.SendForm)
    }
  }

  const sendOverlayStyle = { ...overlayStyle, position: 'fixed' as const, zIndex: 20 }

  const scanner = (
    <Scanner
      close={goBack}
      onData={handleData}
      label={t('components.scanQr')}
      onError={(err: string) => consoleError(err, 'WalletScan')}
    />
  )

  return prefersReducedMotion ? (
    <div style={sendOverlayStyle}>{scanner}</div>
  ) : (
    <AnimatePresence>
      <motion.div
        exit='exit'
        key='scanner'
        initial='initial'
        animate='animate'
        style={sendOverlayStyle}
        variants={overlaySlideUp}
      >
        {scanner}
      </motion.div>{' '}
    </AnimatePresence>
  )
}
