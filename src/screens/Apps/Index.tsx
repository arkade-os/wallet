import { ReactElement, useContext } from 'react'
import Content from '../../components/Content'
import FlexRow from '../../components/FlexRow'
import Padded from '../../components/Padded'
import Header from '../../components/Header'
import FlexCol from '../../components/FlexCol'
import Text from '../../components/Text'
import Shadow from '../../components/Shadow'
import FujiMoneyIcon from '../../icons/FujiMoney'
import { IonText } from '@ionic/react'
import BoltzIcon from '../../icons/Boltz'
import { NavigationContext, Pages } from '../../providers/navigation'
import LendasatIcon from './Lendasat/LendasatIcon'
import LendaswapIcon from './Lendaswap/LendaswapIcon'

const Tag = ({ kind }: { kind: 'new' | 'coming soon' }) => {
  const style = {
    borderRadius: '4px',
    background: kind === 'coming soon' ? 'rgba(96, 177, 138, 0.10)' : 'rgba(163, 137, 241, 0.10)',
    color: kind === 'coming soon' ? 'var(--green)' : '#A389F1',
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
      <p style={style}>{kind.replace(' ', '\u00A0')}</p>
    </IonText>
  )
}

interface AppProps {
  desc: string
  icon: ReactElement
  name: string
  live?: boolean
  link?: string
  page?: Pages
}

function App({ desc, icon, link, name, live, page }: AppProps) {
  const { navigate } = useContext(NavigationContext)

  const style = {
    cursor: page || link ? 'pointer' : 'default',
  }

  const handleClick = () => {
    if (typeof page !== 'undefined') return navigate(page)
    if (link) window.open(link, '_blank')
  }

  return (
    <Shadow border>
      <div style={style} onClick={handleClick}>
        <FlexCol gap='0.75rem'>
          <FlexRow between>
            {icon}
            <FlexCol gap='0.25rem'>
              <FlexRow between>
                <Text bold>{name}</Text>
                <Tag kind={live ? 'new' : 'coming soon'} />
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
      </div>
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
              name='Boltz'
              icon={<BoltzIcon />}
              desc='Swap instantly between Arkade and Lightning'
              link='https://boltz.exchange/'
              page={Pages.AppBoltz}
              live
            />

            <App
              name='LendaSat'
              icon={<LendasatIcon />}
              desc='Borrow against your sats'
              link='https://lendasat.com'
              page={Pages.AppLendasat}
              live
            />

            <App
              name='LendaSwap'
              icon={<LendaswapIcon />}
              desc='Swap Bitcoin to USDC instantly'
              link='https://swap.lendasat.com'
              page={Pages.AppLendaswap}
              live
            />
            <App name='Fuji Money' icon={<FujiMoneyIcon />} desc='Synthetic Assets on the Bitcoin network' />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
