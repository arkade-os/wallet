import { ReactElement } from 'react'
import Content from '../components/Content'
import FlexRow from '../components/FlexRow'
import Padded from '../components/Padded'
import Header from '../components/Header'
import FlexCol from '../components/FlexCol'
import Text, { TextSecondary } from '../components/Text'
import Shadow from '../components/Shadow'
import InvadersIcon from '../icons/Invaders'
import CoinflipIcon from '../icons/Coinflip'
import FujiMoneyIcon from '../icons/FujiMoney'

interface AppProps {
  desc?: string
  icon: ReactElement
  link?: string
  name: string
}

function App({ desc, icon, name }: AppProps) {
  return (
    <Shadow>
      <FlexCol gap='0.75rem'>
        <FlexRow>
          {icon}
          <FlexCol gap='0'>
            <Text>{name}</Text>
            <TextSecondary>COMING SOON</TextSecondary>
          </FlexCol>
        </FlexRow>
        <TextSecondary>{desc}</TextSecondary>
      </FlexCol>
    </Shadow>
  )
}

export default function Apps() {
  return (
    <>
      <Header text='Apps' />
      <Content>
        <Padded>
          <FlexCol>
            <App name='Ark Invaders' icon={<InvadersIcon />} desc='The classic arcade game' />
            <App name='Coinflip' icon={<CoinflipIcon />} desc='Head or Tails? Place your bet!' />
            <App name='Fuji Money' icon={<FujiMoneyIcon />} desc='Synthetic Assets on the Bitcoin network' />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
