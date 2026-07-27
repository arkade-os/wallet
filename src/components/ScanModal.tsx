import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button'
import ButtonsOnBottom from './ButtonsOnBottom'
import Content from './Content'
import FlexRow from './FlexRow'
import Focusable from './Focusable'
import Padded from './Padded'
import Scanner, { ScannerImplementation, nextScannerImplementation, scannerImplementationLabel } from './Scanner'
import Shadow from './Shadow'
import Text from './Text'
import CloseIcon from '../icons/Close'
import { hapticLight } from '../lib/haptics'
import { overlaySlideUp, overlayStyle } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface ScanModalProps {
  isOpen: boolean
  label: string
  onCapture: (arg0: string) => void
  onClose: () => void
  onError?: (arg0: string) => void
}

const dialogStyle = { ...overlayStyle, position: 'fixed' as const, zIndex: 50 }

// The camera lives on top of a modal, not on a page in the navigator stack:
// it opens over the invoking view, blocks interaction with it, and hands the
// sanitized capture back via onCapture so the invoker can fill a form or act.
export default function ScanModal({ isOpen, label, onCapture, onClose, onError }: ScanModalProps) {
  const [implementation, setImplementation] = useState<ScannerImplementation>('qr')
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!isOpen) return
    setImplementation('qr')
    // capture phase + stopPropagation keeps the app-wide Escape handler from
    // navigating the page away underneath the modal
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      handleClose()
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen])

  const handleClose = () => {
    hapticLight()
    onClose()
  }

  const handleData = (data: string) => {
    onCapture(data.trim())
    onClose()
  }

  const handleSwitch = () => {
    hapticLight()
    setImplementation(nextScannerImplementation(implementation))
  }

  const dialog = (
    <>
      <div className='header'>
        <FlexRow between>
          <div style={{ minWidth: '4rem', marginLeft: '0.5rem' }}>
            <Focusable onEnter={handleClose} fit round>
              <div onClick={handleClose} style={{ cursor: 'pointer' }} aria-label='Close scanner'>
                <CloseIcon />
              </div>
            </Focusable>
          </div>
          <p className='title'>{label}</p>
          <div
            style={{
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'flex-end',
              minWidth: '4rem',
              paddingRight: '1rem',
            }}
            onClick={handleSwitch}
            aria-label='Switch scanner implementation'
          >
            <Focusable onEnter={handleSwitch} fit round>
              <Shadow>
                <Text color='neutral-800' centered tiny wrap>
                  {scannerImplementationLabel[implementation]}
                </Text>
              </Shadow>
            </Focusable>
          </div>
        </FlexRow>
      </div>
      <Content noRefresh>
        <Padded>
          <Scanner implementation={implementation} onData={handleData} onError={onError ?? (() => {})} />
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleClose} label='Cancel' />
      </ButtonsOnBottom>
    </>
  )

  return createPortal(
    prefersReducedMotion ? (
      isOpen ? (
        <div role='dialog' aria-modal='true' aria-label={label} style={dialogStyle}>
          {dialog}
        </div>
      ) : null
    ) : (
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key='scan-modal'
            role='dialog'
            aria-modal='true'
            aria-label={label}
            variants={overlaySlideUp}
            initial='initial'
            animate='animate'
            exit='exit'
            style={dialogStyle}
          >
            {dialog}
          </motion.div>
        ) : null}
      </AnimatePresence>
    ),
    document.body,
  )
}
