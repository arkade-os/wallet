import { ReactNode, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StepBars from '../../components/StepBars'
import { NavigationContext, Pages } from '../../providers/navigation'
import { OnboardImage1 } from '../../icons/Onboard1'
import { OnboardImage2 } from '../../icons/Onboard2'
import { OnboardImage3 } from '../../icons/Onboard3'
import { OnboardImage4 } from '../../icons/Onboard4'
import Title from '../../components/Title'
import Text from '../../components/Text'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Bullet from '../../components/Bullet'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import Shadow from '../../components/Shadow'
import AddIcon from '../../icons/Add'
import ShareIcon from '../../icons/Share'
import { pwaCanInstall } from '../../lib/pwa'
import { OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { EASE_OUT_QUINT, onboardStaggerContainer } from '../../lib/animations'

export default function Onboard() {
  const { navigate } = useContext(NavigationContext)
  const prefersReduced = useReducedMotion()

  const [step, setStep] = useState(1)

  const steps = pwaCanInstall() ? 4 : 3

  const handleContinue = () => setStep(step + 1)

  const handleSkip = () => navigate(Pages.Init)

  const Image = () => {
    if (step === 1) return <OnboardImage1 />
    if (step === 2) return <OnboardImage2 />
    if (step === 3) return <OnboardImage3 />
    return <OnboardImage4 />
  }

  const imageStyle: any = {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    margin: '0 auto',
    maxHeight: '40vh',
    maxWidth: '70%',
  }

  const InfoContainer = (): ReactNode => {
    const info = ({ title, text }: { title: string; text: string }): ReactNode => {
      return (
        <FlexCol gap='0.5rem'>
          <Title text={title} />
          <Text color='dark80' thin wrap>
            {text}
          </Text>
        </FlexCol>
      )
    }
    if (step === 1) {
      return info({
        title: 'Greetings, Earthling! 👾',
        text: "Your Bitcoin has entered a new dimension. Send, receive, and swap in Arkade's virtual environment. Space-time limits don't apply. Experience the future of Bitcoin today.",
      })
    }
    if (step === 2) {
      return info({
        title: 'Leveling up',
        text: 'Arkade is your gateway to a new generation of Bitcoin-native applications. Access Lightning payments, DeFi, assets, and more—all secured by Bitcoin.',
      })
    }
    if (step === 3) {
      return info({
        title: 'Stay in control',
        text: 'Your Bitcoin remains yours at all times. Settle your balance at your convenience and save on fees with batched transactions. Maintain complete freedom to withdraw, always.',
      })
    }
    if (step === 4) {
      return (
        <FlexCol gap='0.5rem'>
          <Title text='Install Arkade on Home' />
          <Text wrap>Adding Arkade to Home enable push notifications and better user experience.</Text>
          <Shadow purple>
            <FlexCol gap='1rem'>
              <FlexRow>
                <Bullet number={1} />
                <Text>Tap</Text>
                <Shadow flex inverted slim>
                  <ShareIcon />
                </Shadow>
              </FlexRow>
              <FlexRow>
                <Bullet number={2} />
                <Text>Then</Text>
                <Shadow flex inverted slim>
                  <FlexRow>
                    <Text>Add to Home Screen</Text>
                    <AddIcon />
                  </FlexRow>
                </Shadow>
              </FlexRow>
            </FlexCol>
          </Shadow>
        </FlexCol>
      )
    }
  }

  return (
    <>
      <Content>
        <Padded>
          <FlexCol between>
            <AnimatePresence mode='wait'>
              <motion.div
                key={step}
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
                          ease: [EASE_OUT_QUINT[0], EASE_OUT_QUINT[1], EASE_OUT_QUINT[2], EASE_OUT_QUINT[3]],
                        },
                      }
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '2rem',
                  flex: 1,
                }}
              >
                <OnboardStaggerChild>
                  <StepBars active={step} length={steps} />
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <div style={imageStyle}>
                    <Image />
                  </div>
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <InfoContainer />
                </OnboardStaggerChild>
              </motion.div>
            </AnimatePresence>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom bordered>
        {step < steps ? (
          <Button onClick={handleContinue} label='Continue' />
        ) : (
          <Button onClick={handleSkip} label='Skip for now' secondary />
        )}
      </ButtonsOnBottom>
    </>
  )
}
