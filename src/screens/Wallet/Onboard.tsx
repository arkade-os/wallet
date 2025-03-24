import { ReactNode, useContext, useState } from 'react'
import StepBars from '../../components/StepBars'
import { canInstallPWA } from '../../lib/pwaDetection'
import { NavigationContext, Pages } from '../../providers/navigation'
import { OnboardImage1, OnboardImage2, OnboardImage3, OnboardImage4 } from '../../icons/Onboard'
import Title from '../../components/Title'
import Text from '../../components/Text'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { IonIcon } from '@ionic/react'
import Bullet from '../../components/Bullet'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import Shadow from '../../components/Shadow'
import AddIcon from '../../icons/Add'
import ShareIcon from '../../icons/Share'

export default function Onboard() {
  const { navigate } = useContext(NavigationContext)
  const [step, setStep] = useState(1)

  const steps = canInstallPWA() ? 4 : 3

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
      width: '100%',
    }
    return (
      <div style={style}>
        <Image />
      </div>
    )
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
        title: 'Welcome to Arkade',
        text: 'Begin using Bitcoin in a faster, more efficient way. Arkade creates a private space where your transactions happen instantly without waiting for network confirmation.',
      })
    }
    if (step === 2) {
      return info({
        title: 'Stay in control',
        text: 'Your Bitcoin remains yours at all times. Choose when to move transactions to the main Bitcoin network to save on fees, with the freedom to withdraw whenever you want.',
      })
    }
    if (step === 3) {
      return info({
        title: 'Connect seamlessly',
        text: "Easily bundle your transactions for secure settlement on the Bitcoin network. Enjoy smart features and functions while maintaining Bitcoin's core security benefits.",
      })
    }
    if (step === 4) {
      return (
        <FlexCol gap='0.5rem'>
          <Title text='Install Arkade on Home' />
          <Text wrap>Adding Arkade to Home enable push notifications and better user experience.</Text>
          <Shadow>
            <FlexCol gap='1rem'>
              <FlexRow>
                <Bullet number={1} />
                <Text>Tap</Text>
                <Shadow flex inverted slim>
                  <ShareIcon reversed />
                </Shadow>
              </FlexRow>
              <FlexRow>
                <Bullet number={2} />
                <Text>Then</Text>
                <Shadow flex inverted slim>
                  <FlexRow>
                    <Text color='ion-background-color'>Add to Home Screen</Text>
                    <AddIcon reversed />
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
            <StepBars active={step} length={steps} />
            <ImageContainer />
            <InfoContainer />
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
