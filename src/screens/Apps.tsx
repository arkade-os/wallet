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

function App({ icon, name }: AppProps) {
  return (
    <Shadow>
      <FlexRow>
        {icon}
        <FlexCol gap='0'>
          <Text>{name}</Text>
          <TextSecondary>COMING SOON</TextSecondary>
        </FlexCol>
      </FlexRow>
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
            <App name='Coinflip' icon={<CoinflipIcon />} desc='A fun game to play with your friends' />
            <App
              name='Fuji Money'
              icon={<FujiMoneyIcon />}
              desc='Synthetic asset smart contract for the Liquid network'
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
