import Header from '../../components/Header'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import FlexCol from '../../components/FlexCol'
import Text, { TextSecondary } from '../../components/Text'
import SwapIcon from '../../icons/Swap'

export default function Swap() {
  return (
    <>
      <Header back text='Swap' />
      <Content>
        <Padded>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: '60vh',
              gap: '1rem',
            }}
          >
            <div style={{ opacity: 0.4 }}>
              <SwapIcon />
            </div>
            <Text bigger heading medium>
              Coming soon
            </Text>
            <div style={{ maxWidth: '280px' }}>
              <FlexCol centered>
                <TextSecondary centered>
                  Swap between your assets — for example, bitcoin to a stablecoin you hold on Arkade.
                </TextSecondary>
              </FlexCol>
            </div>
          </div>
        </Padded>
      </Content>
    </>
  )
}
