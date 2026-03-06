import { useContext, useEffect, useState } from 'react'
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
import Title from '../../components/Title'
import FlexCol from '../../components/FlexCol'
import { deriveKeyFromSeed } from '../../lib/wallet'
import SheetModal from '../../components/SheetModal'
import WalletNewIcon from '../../icons/WalletNew'
import { defaultPassword } from '../../lib/constants'
import { OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { motion } from 'framer-motion'
import { onboardStaggerContainer, onboardStaggerChild, EASE_OUT_QUINT } from '../../lib/animations'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export default function Init() {
  const { aspInfo } = useContext(AspContext)
  const { setInitInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const prefersReduced = useReducedMotion()
  const [error, setError] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

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

  return (
    <>
      <Content>
        <Padded>
          <FlexCol between>
            <motion.div
              variants={prefersReduced ? undefined : onboardStaggerContainer}
              initial={prefersReduced ? false : 'initial'}
              animate={prefersReduced ? undefined : 'animate'}
              exit={
                prefersReduced
                  ? undefined
                  : {
                      opacity: 0,
                      transition: {
                        duration: 0.15,
                        ease: EASE_OUT_QUINT as unknown as [number, number, number, number],
                      },
                    }
              }
              style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
            >
              <motion.div
                variants={prefersReduced ? undefined : onboardStaggerChild}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  maxWidth: '70%',
                  margin: '0 auto',
                  willChange: 'transform, opacity',
                }}
              >
                <WalletNewIcon />
              </motion.div>
              <OnboardStaggerChild>
                <FlexCol gap='0.5rem' padding='0 0 1.5rem 0'>
                  <Title text='Welcome to Arkade 👾' />
                  <Text color='dark80' thin wrap>
                    Your bitcoin has entered a new dimension. Send, receive, and swap in Arkade's virtual environment.
                  </Text>
                  <Text color='dark80' thin wrap>
                    Arkade is your gateway to a new generation of bitcoin-native applications. Access Lightning
                    payments, DeFi, assets, and more — all secured by bitcoin.
                  </Text>
                </FlexCol>
              </OnboardStaggerChild>
              <OnboardStaggerChild>
                <ErrorMessage error={error} text='Ark server unreachable' />
              </OnboardStaggerChild>
            </motion.div>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button disabled={error} onClick={handleNewWallet} label='+ Create wallet' />
        <Button disabled={error} onClick={() => setShowOptions(true)} label='Other login options' clear />
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
