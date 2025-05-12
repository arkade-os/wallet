import { ReactNode, useContext, useState } from 'react'
import StepBars from '../../components/StepBars'
import { NavigationContext, Pages } from '../../providers/navigation'
import { OnboardImage1, OnboardImage2, OnboardImage3, OnboardImage4 } from '../../icons/Onboard'
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
import { usePwa } from '@dotmind/react-use-pwa'

export default function Onboard() {
  const { navigate } = useContext(NavigationContext)
  const [step, setStep] = useState(1)
  const { installPrompt, canInstall } = usePwa()
  const steps = canInstall ? 4 : 3

  const handleContinue = () => setStep(step + 1)

  const handleSkip = () => navigate(Pages.Init)

  const ImageContainer = () => {
    const Image = () => {
      if (step === 1) return <OnboardImage1 />
      if (step === 2) return <OnboardImage2 />
      if (step === 3) return <OnboardImage3 />
      return <OnboardImage4 />
    }
    const style: any = {
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'center',
      margin: '0 auto',
      maxHeight: '50%',
    }

    if (step === 4) {
      style.cursor = 'pointer'
      return (
        <div style={style} onClick={installPrompt}>
          <Image />
        </div>
      )
    } else {
      return (
        <div style={style}>
          <Image />
        </div>
      )
    }
  }

  const InfoContainer = (): ReactNode => {
    const info = ({ title, text }: { title: string; text: string }): ReactNode => {
      return (
        <FlexCol gap='0.5rem'>
          <Title text={title} />
          <Text wrap>{text}</Text>
        </FlexCol>
      )
    }
    if (step === 1) {
      return info({
        title: 'Greetings, Earthling! 👾',
        text: "Your Bitcoin has entered a new dimension.Send, receive, and swap in Arkade's virtual environment. Space-time limits don't apply. Experience the future of Bitcoin today.",
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
            {step < 4 ? <StepBars active={step} length={steps - 1} /> : <div />}
            <ImageContainer />
            <InfoContainer />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom bordered>
        {step < steps ? (
          <Button onClick={handleContinue} label='Continue' />
        ) : (
          <Button onClick={handleSkip} label='Skip for now' clear />
        )}
      </ButtonsOnBottom>
    </>
  )
}
