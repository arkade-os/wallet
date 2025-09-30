import { ReactElement, useContext } from 'react'
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
import { IonText } from '@ionic/react'
import EscrowIcon from '../icons/Escrow'
import { NavigationContext, Pages } from '../providers/navigation'

const ComingSoon = () => {
  const style = {
    borderRadius: '4px',
    background: 'rgba(96, 177, 138, 0.10)',
    color: 'var(--green)',
    fontFamily: 'Geist Mono',
    fontSize: '12px',
    fontStyle: 'normal',
    fontWeight: 400,
    lineHeight: '150%',
    width: 'fit-content',
    padding: '2px 8px',
    textAlign: 'right' as const,
    textTransform: 'uppercase' as const,
  }
  return (
    <IonText>
      <p style={style}>Coming&nbsp;Soon</p>
    </IonText>
  )
}
interface AppProps {
  desc: string
  icon: ReactElement
  link: string
  name: string
  page?: Pages
}

function App({ desc, icon, link, name, page }: AppProps) {
  const { navigate } = useContext(NavigationContext)

  const handleClick = () => {
    if (typeof page !== 'undefined') return navigate(page)
    if (link) window.open(link, '_blank')
  }

  return (
    <Shadow border>
      <FlexCol gap='0.75rem'>
        <FlexRow between onClick={handleClick}>
          {icon}
          <FlexCol gap='0.25rem'>
            <FlexRow between>
              <Text bold>{name}</Text>
              <ComingSoon />
            </FlexRow>
            <Text color='dark80' small thin wrap>
              {link}
            </Text>
          </FlexCol>
        </FlexRow>
        <Text color='dark80' small thin wrap>
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
            <App name='Ark Invaders' icon={<InvadersIcon />} desc='The classic arcade game' link='' />
            <App name='Coinflip' icon={<CoinflipIcon />} desc='Head or Tails? Place your bet!' link='' />
            <App name='Fuji Money' icon={<FujiMoneyIcon />} desc='Synthetic Assets on the Bitcoin network' link='' />
            <App name='Escrow' icon={<EscrowIcon />} desc='Escrow system on Ark' link='' page={Pages.AppEscrow} />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
