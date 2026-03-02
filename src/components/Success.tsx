import { OnboardStaggerContainer, OnboardStaggerChild } from '../components/OnboardLoadIn'
import SuccessIcon from '../icons/Success'
import CenterScreen from './CenterScreen'
import FlexCol from './FlexCol'
import Text from './Text'

interface SuccessProps {
  headline?: string
  text?: string
}

export default function Success({ headline, text }: SuccessProps) {
  return (
    <CenterScreen>
      <OnboardStaggerContainer>
        <OnboardStaggerChild>
          <FlexCol centered gap='1rem'>
            <SuccessIcon />
            {headline ? (
              <Text centered big medium heading wrap>
                {headline}
              </Text>
            ) : null}
            {text ? (
              <Text centered color='dark70' thin small wrap>
                {text}
              </Text>
            ) : null}
          </FlexCol>
        </OnboardStaggerChild>
      </OnboardStaggerContainer>
    </CenterScreen>
  )
}
