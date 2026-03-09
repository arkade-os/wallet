import { ReactElement, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { AspContext } from '../../providers/asp'
import ErrorMessage from '../../components/Error'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Text from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { deriveKeyFromSeed } from '../../lib/wallet'
import SheetModal from '../../components/SheetModal'
import { defaultPassword } from '../../lib/constants'
import { OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { motion } from 'framer-motion'
import { onboardStaggerContainer, EASE_OUT_QUINT } from '../../lib/animations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import OnboardingLogo from '../../components/OnboardingLogo'
import PixelSunrise from '../../components/PixelSunrise'
import BoltOutlineIcon from '../../icons/BoltOutline'
import GlobeOutlineIcon from '../../icons/GlobeOutline'
import ShieldCheckOutlineIcon from '../../icons/ShieldCheckOutline'

const EASE_QUINT_TUPLE = EASE_OUT_QUINT as unknown as [number, number, number, number]

function SmallLogo() {
  return (
    <svg width={28} height={28} viewBox='0 0 35 35' fill='none'>
      <path d='M0 8.75L8.75 0H26.25L35 8.75V17.5H26.25V8.75H8.75V17.5H2.45431e-07L0 8.75Z' fill='var(--logo-color)' />
      <path d='M8.75 26.25V17.5H26.25V26.25H8.75Z' fill='var(--logo-color)' />
      <path d='M8.75 26.25H2.45431e-07V35H8.75V26.25Z' fill='var(--logo-color)' />
      <path d='M26.25 26.25V35H35V26.25H26.25Z' fill='var(--logo-color)' />
    </svg>
  )
}

function BulletPoint({ icon, text }: { icon: ReactElement; text: string }) {
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
        }}
      >
        {icon}
      </div>
      <Text color='dark80' thin wrap>
        {text}
      </Text>
    </div>
  )
}

export default function Init() {
  const { aspInfo } = useContext(AspContext)
  const { setInitInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const prefersReduced = useReducedMotion()
  const [error, setError] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [contentReady, setContentReady] = useState(prefersReduced)
  const [sunriseVisible, setSunriseVisible] = useState(prefersReduced)
  const [replayKey, setReplayKey] = useState(0)
  const logoTargetRef = useRef<HTMLDivElement>(null)

  const handleReplay = useCallback(() => {
    setContentReady(false)
    setSunriseVisible(false)
    setReplayKey((k) => k + 1)
  }, [])

  const handleFlyStart = useCallback(() => {
    setSunriseVisible(true)
  }, [])

  // Tint Safari status bar/toolbar to match gradient while on this screen
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const prev = meta?.getAttribute('content')

    function update() {
      if (!meta) return
      const isDark =
        document.documentElement.classList.contains('ion-palette-dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      meta.setAttribute('content', isDark ? '#2B1669' : '#8771BC')
    }

    update()

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', update)
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      mq.removeEventListener('change', update)
      observer.disconnect()
      if (meta && prev) meta.setAttribute('content', prev)
    }
  }, [])

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  const handleNewWallet = () => {
    const mnemonic = generateMnemonic(wordlist)
    const seed = mnemonicToSeedSync(mnemonic)
    const privateKey = deriveKeyFromSeed(seed)
    setInitInfo({ privateKey, password: defaultPassword, restoring: false })
    navigate(Pages.InitConnect)
  }

  const handleOldWallet = () => navigate(Pages.InitRestore)

  const handleLogoComplete = useCallback(() => {
    setContentReady(true)
  }, [])

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
        key={`logo-${replayKey}`}
        targetRef={logoTargetRef}
        onComplete={handleLogoComplete}
        onFlyStart={handleFlyStart}
        reducedMotion={prefersReduced}
      />
      <PixelSunrise key={`sunrise-${replayKey}`} show={sunriseVisible} reducedMotion={prefersReduced} />
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
              {/* Logo + title stacked — logo optically centered with bullet icons */}
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
                  animate={contentReady && !prefersReduced ? { opacity: 1, y: 0 } : prefersReduced && contentReady ? { opacity: 1 } : { opacity: 0, y: 6 }}
                  transition={{ duration: 0.3, ease: EASE_QUINT_TUPLE }}
                >
                  <h1 style={{ ...titleStyle, paddingLeft: 4 }}>Welcome to Arkade 👾</h1>
                </motion.div>
              </div>

              {/* Bullet points + error — always in DOM for stable layout, animated in when ready */}
              <motion.div
                variants={prefersReduced ? undefined : onboardStaggerContainer}
                initial={prefersReduced ? false : 'initial'}
                animate={contentReady ? (prefersReduced ? undefined : 'animate') : (prefersReduced ? undefined : 'initial')}
                exit={
                  prefersReduced ? undefined : { opacity: 0, transition: { duration: 0.15, ease: EASE_QUINT_TUPLE } }
                }
                style={{ width: '100%', visibility: contentReady ? 'visible' : 'hidden' }}
              >
                <OnboardStaggerChild>
                  <BulletPoint icon={<BoltOutlineIcon />} text='Fast payments, swaps, and more' />
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <BulletPoint
                    icon={<GlobeOutlineIcon />}
                    text='Access Lightning, DeFi, and more, all secured by Bitcoin'
                  />
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <BulletPoint
                    icon={<ShieldCheckOutlineIcon />}
                    text='Stay in control. Settle and withdraw on your terms'
                  />
                </OnboardStaggerChild>

                <OnboardStaggerChild>
                  <ErrorMessage error={error} text='Ark server unreachable' />
                </OnboardStaggerChild>
              </motion.div>
            </div>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={contentReady && !prefersReduced ? { opacity: 1, y: 0 } : prefersReduced && contentReady ? { opacity: 1 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.4, ease: EASE_QUINT_TUPLE, delay: 0.24 }}
          style={{ display: 'flex', flexDirection: 'column', width: '100%', pointerEvents: contentReady ? 'auto' : 'none' }}
        >
          <Button disabled={error} onClick={handleNewWallet} label='+ Create wallet' />
          <Button disabled={error} onClick={() => setShowOptions(true)} label='Other login options' clear />
        </motion.div>
      </ButtonsOnBottom>
      <SheetModal isOpen={showOptions} onClose={() => setShowOptions(false)}>
        <FlexCol gap='1rem'>
          <Text>Other login options</Text>
          <Button fancy disabled={error} onClick={handleOldWallet} label='Restore wallet' secondary />
        </FlexCol>
      </SheetModal>
      {/* TEMP: replay button for dev testing — remove before merge */}
      {contentReady ? (
        <button
          onClick={handleReplay}
          style={{
            position: 'fixed',
            bottom: 8,
            right: 8,
            zIndex: 999,
            padding: '4px 10px',
            fontSize: 11,
            background: '#eee',
            border: '1px solid #ccc',
            borderRadius: 4,
            cursor: 'pointer',
            opacity: 0.6,
          }}
        >
          Replay
        </button>
      ) : null}
    </>
  )
}
