import { useContext } from 'react'
import Scanner from '@/components/Scanner'
import { consoleError } from '@/lib/logs'
import { useTranslation } from '@/providers/language'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { emptySendInfo, emptyRecvInfo, FlowContext } from '@/providers/flow'
import { overlaySlideUp, overlayStyle } from '@/lib/animations'
import { NavigationContext, Pages } from '@/providers/navigation'
import { isArkNote } from '@/lib/arknote'
import { ArkNote } from '@arkade-os/sdk'

export default function WalletScan() {
  const { setNoteInfo, setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { replace, goBack } = useContext(NavigationContext)

  const prefersReducedMotion = useReducedMotion()
  const { t } = useTranslation()

  const handleData = (recipient: string) => {
    if (isArkNote(recipient)) {
      try {
        const { value } = ArkNote.fromString(recipient)
        setNoteInfo({ note: recipient, satoshis: value })
        return replace(Pages.NotesRedeem)
      } catch (err) {
        consoleError(err, 'error parsing ark note')
        setRecvInfo({ ...emptyRecvInfo, addressError: t('receive.invalidNote') })
      }
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
