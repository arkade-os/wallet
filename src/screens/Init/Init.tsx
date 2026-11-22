import { useContext, useEffect, useState } from 'react'
import { generateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import type { ServiceWorkerWalletMode } from '@arkade-os/sdk'
import Button from '../../components/Button'
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
import Glyph, { type GlyphName } from '../../icons/Glyph'
import { hapticSubtle } from '../../lib/haptics'

function Choice({
  icon,
  title,
  hint,
  disabled,
  onClick,
  testId,
}: {
  icon: GlyphName
  title: string
  hint: string
  disabled: boolean
  onClick: () => void
  testId: string
}) {
  return (
    <button type='button' className='onboard__choice' disabled={disabled} onClick={onClick} data-testid={testId}>
      <span className='onboard__choice-well' aria-hidden='true'>
        <Glyph name={icon} size={18} />
      </span>
      <span className='onboard__choice-text'>
        <span className='onboard__choice-title'>{title}</span>
        <span className='onboard__choice-hint'>{hint}</span>
      </span>
      <Glyph name='chevronRight' size={16} strokeWidth={2.25} className='text-ink-3' />
    </button>
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
  const blocked = error || !aspReady
  const choose = (action: () => void) => () => {
    hapticSubtle()
    action()
  }

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
              {/* Triple-tap the heading to toggle devMode (hidden gesture) */}
              <h1 className='onboard__title' onClick={handleTap} data-testid='onboarding-devmode-tap'>
                {t('init.setUpWallet')}
              </h1>
            </OnboardStaggerChild>
            <OnboardStaggerChild>
              <div className='onboard__choices'>
                <Choice
                  icon='plus'
                  title={t('init.createChoice')}
                  hint={t('init.createChoiceHint')}
                  disabled={blocked}
                  onClick={choose(handleNewWallet)}
                  testId='onboarding-create'
                />
                <Choice
                  icon='restore'
                  title={t('init.restoreChoice')}
                  hint={t('init.restoreChoiceHint')}
                  disabled={blocked}
                  onClick={choose(handleOldWallet)}
                  testId='onboarding-restore'
                />
              </div>
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
