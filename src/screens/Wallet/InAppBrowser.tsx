import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Text from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { onboardStaggerContainer, EASE_OUT_QUINT_TUPLE } from '../../lib/animations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import OnboardingLogo from '../../components/OnboardingLogo'
import PixelSunrise from '../../components/PixelSunrise'
import SmallLogo from '../../components/SmallLogo'
import { copyToClipboard } from '../../lib/clipboard'
import CopyIcon from '../../icons/Copy'
import CheckMarkIcon from '../../icons/CheckMark'
import { hapticTap } from '../../lib/haptics'

function NumberedBullet({ number, text }: { number: number; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--bullet-icon-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--logo-color)',
          fontFamily: 'var(--heading-font)',
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        {number}
      </div>
      <Text color='dark80' thin wrap>
        {text}
      </Text>
    </div>
  )
}

function TextMorph({ text, reducedMotion }: { text: string; reducedMotion: boolean }) {
  const chars = useMemo(() => {
    const counts: Record<string, number> = {}
    return text.split('').map((char) => {
      const count = (counts[char] = (counts[char] || 0) + 1)
      return { char, layoutId: `morph-${char}-${count}` }
    })
  }, [text])

  if (reducedMotion) return <span>{text}</span>

  return (
    <span style={{ display: 'flex', lineHeight: '20px' }}>
      <LayoutGroup>
        <AnimatePresence mode='popLayout'>
          {chars.map(({ char, layoutId }) => (
            <motion.span
              key={layoutId}
              layoutId={layoutId}
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{
                layout: { duration: 0.25, ease: EASE_OUT_QUINT_TUPLE },
                opacity: { duration: 0.15, ease: EASE_OUT_QUINT_TUPLE },
                filter: { duration: 0.15 },
              }}
              style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : undefined }}
            >
              {char}
            </motion.span>
          ))}
        </AnimatePresence>
      </LayoutGroup>
    </span>
  )
}

export default function InAppBrowser() {
  const prefersReduced = useReducedMotion()
  const [copied, setCopied] = useState(false)
  const [contentReady, setContentReady] = useState(prefersReduced)
  const [sunriseVisible, setSunriseVisible] = useState(prefersReduced)
  const logoTargetRef = useRef<HTMLDivElement>(null)
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current)
    }
  }, [])

  const handleFlyStart = useCallback(() => {
    setSunriseVisible(true)
  }, [])

  const handleLogoComplete = useCallback(() => {
    setContentReady(true)
  }, [])

  const handleCopy = async () => {
    try {
      await copyToClipboard(window.location.href)
      if (copyTimeout.current) clearTimeout(copyTimeout.current)
      setCopied(true)
      copyTimeout.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API may be unavailable in some in-app browsers
    }
  }

  const titleStyle = {
    margin: 0,
    fontFamily: 'var(--heading-font)',
    fontSize: '24px',
    fontWeight: 500,
    letterSpacing: '-0.5px',
    lineHeight: '1.2',
  }

  return (
    <>
      <OnboardingLogo
        targetRef={logoTargetRef}
        onComplete={handleLogoComplete}
        onFlyStart={handleFlyStart}
        reducedMotion={prefersReduced}
      />
      <PixelSunrise show={sunriseVisible} reducedMotion={prefersReduced} />
      <Content>
        <Padded>
          <FlexCol between>
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'flex-end',
                paddingBottom: 40,
              }}
            >
              {/* Logo + title stacked */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  padding: '0 0 1.5rem 0',
                }}
              >
                <div
                  ref={logoTargetRef}
                  style={{
                    width: 40,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {contentReady ? <SmallLogo /> : null}
                </div>
                <motion.div
                  initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                  animate={
                    contentReady && !prefersReduced
                      ? { opacity: 1, y: 0 }
                      : prefersReduced && contentReady
                        ? { opacity: 1 }
                        : { opacity: 0, y: 6 }
                  }
                  transition={{ duration: 0.3, ease: EASE_OUT_QUINT_TUPLE }}
                >
                  <h1 style={{ ...titleStyle, paddingLeft: 4 }}>Welcome to Arkade 👾</h1>
                  <Text color='dark50' thin wrap>
                    Won't work in this browser.
                  </Text>
                </motion.div>
              </div>

              {/* Bullet points — animated in when logo sequence completes */}
              <motion.div
                variants={prefersReduced ? undefined : onboardStaggerContainer}
                initial={prefersReduced ? false : 'initial'}
                animate={
                  contentReady ? (prefersReduced ? undefined : 'animate') : prefersReduced ? undefined : 'initial'
                }
                exit={
                  prefersReduced
                    ? undefined
                    : { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT_QUINT_TUPLE } }
                }
                style={{ width: '100%', visibility: contentReady ? 'visible' : 'hidden' }}
              >
                <OnboardStaggerChild>
                  <NumberedBullet number={1} text='Copy the link below' />
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <NumberedBullet number={2} text='Open Safari, Chrome, or your browser' />
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <NumberedBullet number={3} text='Paste the link and go' />
                </OnboardStaggerChild>
              </motion.div>
            </div>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={
            contentReady && !prefersReduced
              ? { opacity: 1, y: 0 }
              : prefersReduced && contentReady
                ? { opacity: 1 }
                : { opacity: 0, y: 16 }
          }
          transition={{ duration: 0.4, ease: EASE_OUT_QUINT_TUPLE, delay: 0.24 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            width: '100%',
            pointerEvents: contentReady ? 'auto' : 'none',
          }}
        >
          {/* URL display with inline copy icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--dark05)',
              boxShadow: '0 0 0 1px var(--dark10)',
              borderRadius: '0.75rem',
              minHeight: 48,
              padding: '0 0.25rem 0 0.875rem',
              width: '100%',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: '14px',
                color: 'var(--dark50)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
            >
              {window.location.href}
            </span>
            <button
              onClick={() => {
                hapticTap()
                handleCopy()
              }}
              aria-label={copied ? 'Copied' : 'Copy link'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                flexShrink: 0,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--dark50)',
                touchAction: 'manipulation',
                position: 'relative',
              }}
            >
              <AnimatePresence initial={false}>
                {copied ? (
                  <motion.div
                    key='check'
                    initial={prefersReduced ? false : { opacity: 0, scale: 0.5, rotate: -45, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }}
                    exit={prefersReduced ? undefined : { opacity: 0, scale: 0.5, rotate: 45, filter: 'blur(4px)' }}
                    transition={{ duration: 0.25, ease: EASE_OUT_QUINT_TUPLE }}
                    style={{ display: 'flex', color: 'var(--success)', position: 'absolute' }}
                  >
                    <CheckMarkIcon small />
                  </motion.div>
                ) : (
                  <motion.div
                    key='copy'
                    initial={prefersReduced ? false : { opacity: 0, scale: 0.5, rotate: 45, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }}
                    exit={prefersReduced ? undefined : { opacity: 0, scale: 0.5, rotate: -45, filter: 'blur(4px)' }}
                    transition={{ duration: 0.25, ease: EASE_OUT_QUINT_TUPLE }}
                    style={{ display: 'flex', position: 'absolute' }}
                  >
                    <CopyIcon />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          <Button onClick={handleCopy} label={copied ? 'Copied!' : 'Copy link'}>
            <TextMorph text={copied ? 'Copied!' : 'Copy link'} reducedMotion={prefersReduced} />
          </Button>
        </motion.div>
      </ButtonsOnBottom>
    </>
  )
}
