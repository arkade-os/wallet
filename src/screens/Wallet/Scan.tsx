import { useContext } from 'react'
import { ArkNote } from '@arkade-os/sdk'
import { isArkNote } from '@/lib/arknote'
import { consoleError } from '@/lib/logs'
import Scanner from '@/components/Scanner'
import { useTranslation } from '@/providers/language'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { emptySendInfo, FlowContext } from '@/providers/flow'
import { overlaySlideUp, overlayStyle } from '@/lib/animations'
import { NavigationContext, Pages } from '@/providers/navigation'

export default function WalletScan() {
  const { setNoteInfo, setSendInfo } = useContext(FlowContext)
  const { replace, goBack } = useContext(NavigationContext)

  const prefersReducedMotion = useReducedMotion()
  const { t } = useTranslation()

  const handleData = (recipient: string) => {
    if (isArkNote(recipient)) {
      try {
        const { value } = ArkNote.fromString(recipient)
        setNoteInfo({ note: recipient, satoshis: value })
      } catch (err) {
        consoleError(err, 'error parsing ark note')
        setNoteInfo({ note: recipient, satoshis: 0, error: t('receive.invalidNote') })
      }
      return replace(Pages.NotesRedeem)
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
      </motion.div>
    </AnimatePresence>
  )
}
