import { ReactElement } from 'react'
import Content from '../components/Content'
import FlexRow from '../components/FlexRow'
import Padded from '../components/Padded'
import Header from '../components/Header'
import FlexCol from '../components/FlexCol'
import Text from '../components/Text'
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

function App({ desc, icon, link, name }: AppProps) {
  return (
    <Shadow onClick={() => link && window.open(link, '_blank')}>
      <FlexCol gap='.5rem'>
        <FlexRow>
          {icon}
          <FlexCol gap='0'>
            <Text>{name}</Text>
            <Text color='dark80' small>
              {link ?? 'COMING SOON'}
            </Text>
          </FlexCol>
        </FlexRow>
        <Text color='dark80' small>
          {desc}
        </Text>
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
            <App
              name='Ark Invaders'
              icon={<InvadersIcon />}
              desc='The classic arcade game'
              link='https://ark-invaders.pages.dev/'
            />
            <App
              name='Coinflip'
              icon={<CoinflipIcon />}
              desc='A fun game to play with your friends'
              link='https://coinflip.casino/'
            />
            <App
              name='Fuji Money'
              icon={<FujiMoneyIcon />}
              desc='Synthetic asset smart contract for the Liquid network'
              link='https://fuji.money/'
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
