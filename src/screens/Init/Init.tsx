import { useContext, useEffect, useState } from 'react'
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
import { OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { motion } from 'framer-motion'
import { onboardStaggerContainer } from '../../lib/animations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { WalletContext } from '../../providers/wallet'
import { DevModeContext } from '../../providers/devMode'
import Toggle from '../../components/Toggle'
import { useTranslation } from '../../providers/language'
import { GlyphWell, type GlyphName } from '../../icons/Glyph'

function BulletPoint({ icon, text }: { icon: GlyphName; text: string }) {
  return (
    <div className='onboard__point'>
      <GlyphWell name={icon} />
      <p>{text}</p>
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
  const { t } = useTranslation()
  const [error, setError] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showCreateOptions, setShowCreateOptions] = useState(false)
  const [hdRotation, setHdRotation] = useState(false)

  const aspReady = !!aspInfo.signerPubkey || aspInfo.unreachable

  useEffect(() => {
    if (wallet.pubkey && authState === 'authenticated') navigate(Pages.Wallet)
  }, [wallet.pubkey, authState])

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  const createWallet = (mode: ServiceWorkerWalletMode) => {
    const mnemonic = generateMnemonic(wordlist)
    setInitInfo({ mnemonic, password: defaultPassword, restoring: false, walletMode: mode })
    navigate(Pages.InitConnect)
  }

  const handleNewWallet = () => {
    if (devMode) return setShowCreateOptions(true)
    createWallet('static')
  }

  const handleOldWallet = () => navigate(Pages.InitRestore)

  const stagger = prefersReduced ? undefined : onboardStaggerContainer

  return (
    <>
      <Content>
        <Padded>
          <motion.div
            className='onboard'
            variants={stagger}
            initial={prefersReduced ? false : 'initial'}
            animate={prefersReduced ? undefined : 'animate'}
          >
            <OnboardStaggerChild>
              {/* Triple-tap the welcome heading to toggle devMode (hidden gesture) */}
              <h1 className='onboard__title' onClick={handleTap} data-testid='onboarding-devmode-tap'>
                {t('browser.welcome')}
              </h1>
            </OnboardStaggerChild>
            <OnboardStaggerChild>
              <BulletPoint icon='bolt' text={t('init.tagline1')} />
            </OnboardStaggerChild>
            <OnboardStaggerChild>
              <BulletPoint icon='globe' text={t('init.tagline2')} />
            </OnboardStaggerChild>
            <OnboardStaggerChild>
              <BulletPoint icon='shield' text={t('init.tagline3')} />
            </OnboardStaggerChild>
            <OnboardStaggerChild>
              <ErrorMessage
                error={error}
                text={aspErrorText(aspInfo, t('init.arkadeServerUnreachable'), t('errors.outdatedWallet'))}
              />
            </OnboardStaggerChild>
          </motion.div>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button disabled={error || !aspReady} onClick={handleNewWallet} label={`+ ${t('init.createWallet')}`} />
        <Button
          disabled={error || !aspReady}
          onClick={() => setShowOptions(true)}
          label={t('init.otherLoginOptions')}
          clear
        />
      </ButtonsOnBottom>
      <SheetModal isOpen={showOptions} onClose={() => setShowOptions(false)}>
        <FlexCol gap='1rem'>
          <Text>{t('init.otherLoginOptions')}</Text>
          <Button fancy disabled={error} onClick={handleOldWallet} label={t('init.restoreWallet')} secondary />
        </FlexCol>
      </SheetModal>
      <SheetModal isOpen={showCreateOptions} onClose={() => setShowCreateOptions(false)}>
        <FlexCol gap='1rem'>
          <Text>{t('init.createWallet')}</Text>
          <Toggle
            checked={hdRotation}
            onClick={() => setHdRotation((v) => !v)}
            text={t('init.rotateReceiveAddresses')}
            subtext={t('init.rotateReceiveSubtext')}
            testId='toggle-hd-rotation'
          />
          <Button label={t('init.createWallet')} onClick={() => createWallet(hdRotation ? 'hd' : 'static')} />
        </FlexCol>
      </SheetModal>
    </>
  )
}
