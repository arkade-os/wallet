import { ReactElement, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { generateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import type { ServiceWorkerWalletMode } from '@arkade-os/sdk'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { AspContext } from '../../providers/asp'
import { aspErrorText } from '../../lib/asp'
import ErrorMessage from '../../components/Error'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Text from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import SheetModal from '../../components/SheetModal'
import { defaultPassword } from '../../lib/constants'
import { isWebAuthnSupported, registerPasskey } from '../../lib/passkey'
import { consoleError } from '../../lib/logs'
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
import { WalletContext } from '../../providers/wallet'
import { DevModeContext } from '../../providers/devMode'
import Toggle from '../../components/Toggle'

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
      <Text color='neutral-800' thin wrap>
        {text}
      </Text>
    </div>
  )
}

export default function Init() {
  const { aspInfo } = useContext(AspContext)
  const { setInitInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { authState, wallet } = useContext(WalletContext)
  const { devMode, handleTap } = useContext(DevModeContext)

  const prefersReduced = useReducedMotion()
  const [error, setError] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showCreateOptions, setShowCreateOptions] = useState(false)
  const [showPasskeyFallback, setShowPasskeyFallback] = useState(false)
  const [creating, setCreating] = useState(false)
  const [hdRotation, setHdRotation] = useState(false)
  const pendingCreate = useRef<{ mnemonic: string; mode: ServiceWorkerWalletMode }>()
  const [contentReady, setContentReady] = useState(prefersReduced)
  const [sunriseVisible, setSunriseVisible] = useState(prefersReduced)
  const logoTargetRef = useRef<HTMLDivElement>(null)

  const handleFlyStart = useCallback(() => {
    setSunriseVisible(true)
  }, [])

  const aspReady = !!aspInfo.signerPubkey || aspInfo.unreachable

  useEffect(() => {
    if (wallet.pubkey && authState === 'authenticated') navigate(Pages.Wallet)
  }, [wallet.pubkey, authState])

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  // Passkeys-only by default: register a passkey with the PRF extension and
  // derive the vault key from its output. Authenticators without PRF silently
  // reuse the same credential with the legacy userHandle scheme. Only when the
  // passkey ceremony fails (unsupported browser, user cancel) do we offer an
  // explicit passwordless fallback.
  const createWallet = async (mode: ServiceWorkerWalletMode) => {
    const mnemonic = pendingCreate.current?.mnemonic ?? generateMnemonic(wordlist)
    pendingCreate.current = { mnemonic, mode }
    if (!isWebAuthnSupported()) return createWalletWithoutPasskey()
    setCreating(true)
    try {
      const reg = await registerPasskey()
      if (reg.kind === 'prf') {
        setInitInfo({
          mnemonic,
          prf: { credentialId: reg.credentialId, prfOutput: reg.prfOutput },
          restoring: false,
          walletMode: mode,
        })
      } else {
        setInitInfo({
          mnemonic,
          password: reg.legacySecret,
          legacyPasskey: { credentialId: reg.credentialId },
          restoring: false,
          walletMode: mode,
        })
      }
      setShowPasskeyFallback(false)
      navigate(Pages.InitConnect)
    } catch (err) {
      consoleError(err, 'Passkey registration failed')
      setShowPasskeyFallback(true)
    } finally {
      setCreating(false)
    }
  }

  const createWalletWithoutPasskey = () => {
    const pending = pendingCreate.current
    if (!pending) return
    setShowPasskeyFallback(false)
    setInitInfo({ mnemonic: pending.mnemonic, password: defaultPassword, restoring: false, walletMode: pending.mode })
    navigate(Pages.InitConnect)
  }

  const handleNewWallet = () => {
    if (devMode) return setShowCreateOptions(true)
    createWallet('static')
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
                  {/* Triple-tap the welcome heading to toggle devMode (hidden gesture) */}
                  <h1
                    onClick={handleTap}
                    data-testid='onboarding-devmode-tap'
                    style={{ ...titleStyle, paddingLeft: 4, cursor: 'default' }}
                  >
                    Welcome to Arkade 👾
                  </h1>
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
                  prefersReduced
                    ? undefined
                    : { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT_QUINT_TUPLE } }
                }
                style={{ width: '100%', visibility: contentReady ? 'visible' : 'hidden' }}
              >
                <OnboardStaggerChild>
                  <BulletPoint icon={<BoltOutlineIcon />} text='Fast payments, swaps, and more' />
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <BulletPoint
                    icon={<GlobeOutlineIcon />}
                    text='Access Lightning, mint assets, and more. All secured by Bitcoin'
                  />
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <BulletPoint
                    icon={<ShieldCheckOutlineIcon />}
                    text='Stay in control. Settle and withdraw on your terms'
                  />
                </OnboardStaggerChild>

                <OnboardStaggerChild>
                  <ErrorMessage error={error} text={aspErrorText(aspInfo, 'Arkade server unreachable')} />
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
          <Button disabled={error || !aspReady || creating} onClick={handleNewWallet} label='+ Create wallet' />
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
      <SheetModal isOpen={showCreateOptions} onClose={() => setShowCreateOptions(false)}>
        <FlexCol gap='1rem'>
          <Text>Create wallet</Text>
          <Toggle
            checked={hdRotation}
            onClick={() => setHdRotation((v) => !v)}
            text='Rotate receive addresses'
            subtext='Derive a fresh address for every incoming payment (HD wallet). Improves on-chain privacy. Best used with Nostr backup enabled so rotated addresses are recoverable on restore. For advanced users.'
            testId='toggle-hd-rotation'
          />
          <Button label='Create wallet' onClick={() => createWallet(hdRotation ? 'hd' : 'static')} />
        </FlexCol>
      </SheetModal>
      <SheetModal isOpen={showPasskeyFallback} onClose={() => setShowPasskeyFallback(false)}>
        <FlexCol gap='1rem'>
          <Text>Couldn&apos;t create a passkey</Text>
          <Text color='neutral-800' thin wrap>
            Passkeys keep your wallet locked with your device&apos;s biometrics. You can try again, or continue without
            one and protect your wallet later from Settings.
          </Text>
          <Button
            disabled={creating}
            onClick={() => pendingCreate.current && createWallet(pendingCreate.current.mode)}
            label='Try again'
          />
          <Button disabled={creating} onClick={createWalletWithoutPasskey} label='Continue without passkey' secondary />
        </FlexCol>
      </SheetModal>
    </>
  )
}
