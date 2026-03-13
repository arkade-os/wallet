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
import { onboardStaggerContainer, EASE_OUT_QUINT_TUPLE } from '../../lib/animations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import OnboardingLogo from '../../components/OnboardingLogo'
import PixelSunrise from '../../components/PixelSunrise'
import SmallLogo from '../../components/SmallLogo'
import BoltOutlineIcon from '../../icons/BoltOutline'
import GlobeOutlineIcon from '../../icons/GlobeOutline'
import ShieldCheckOutlineIcon from '../../icons/ShieldCheckOutline'

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
  const logoTargetRef = useRef<HTMLDivElement>(null)

  const handleFlyStart = useCallback(() => {
    setSunriseVisible(true)
  }, [])

  const aspReady = !!aspInfo.signerPubkey || aspInfo.unreachable

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
                </motion.div>
              </div>

              {/* Bullet points + error — always in DOM for stable layout, animated in when ready */}
              <motion.div
                variants={prefersReduced ? undefined : onboardStaggerContainer}
                initial={prefersReduced ? false : 'initial'}
                animate={
                  contentReady ? (prefersReduced ? undefined : 'animate') : prefersReduced ? undefined : 'initial'
                }
                exit={
                  prefersReduced ? undefined : { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT_QUINT_TUPLE } }
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
            width: '100%',
            pointerEvents: contentReady ? 'auto' : 'none',
          }}
        >
          <Button disabled={error || !aspReady} onClick={handleNewWallet} label='+ Create wallet' />
          <Button
            disabled={error || !aspReady}
            onClick={() => setShowOptions(true)}
            label='Other login options'
            clear
          />
        </motion.div>
      </ButtonsOnBottom>
      <SheetModal isOpen={showOptions} onClose={() => setShowOptions(false)}>
        <FlexCol gap='1rem'>
          <Text>Other login options</Text>
          <Button fancy disabled={error} onClick={handleOldWallet} label='Restore wallet' secondary />
        </FlexCol>
      </SheetModal>
    </>
  )
}
