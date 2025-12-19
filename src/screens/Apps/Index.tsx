import { ReactElement, useContext } from 'react'
import Content from '../../components/Content'
import FlexRow from '../../components/FlexRow'
import Padded from '../../components/Padded'
import Header from '../../components/Header'
import FlexCol from '../../components/FlexCol'
import Text from '../../components/Text'
import Shadow from '../../components/Shadow'
import FujiMoneyIcon from '../../icons/FujiMoney'
import BoltzIcon from '../../icons/Boltz'
import { NavigationContext, Pages } from '../../providers/navigation'
import LendasatIcon from './Lendasat/LendasatIcon'
import LendaswapIcon from './Lendaswap/LendaswapIcon'

const Middot = () => (
  <svg width='6' height='6' viewBox='0 0 6 6' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
    <circle cx='3' cy='3' r='3' fill='white' />
  </svg>
)

const Tag = ({ kind }: { kind: 'new' | 'coming soon' }) => {
  const style: React.CSSProperties = {
    borderRadius: '4px',
    background: kind === 'coming soon' ? 'rgba(96, 177, 138, 0.10)' : 'rgba(57, 25, 152, 1)',
    color: kind === 'coming soon' ? 'var(--green)' : 'var(--white)',
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
    <div style={style}>
      <FlexRow centered gap='0.25rem'>
        {kind === 'new' ? <Middot /> : ''}
        <p>{kind.replace(' ', '\u00A0')}</p>
      </FlexRow>
    </div>
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

  const style: React.CSSProperties = {
    borderRadius: '0.5rem',
  }

  const handleClick = () => {
    if (typeof page !== 'undefined') return navigate(page)
    if (link) window.open(link, '_blank')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleClick()
  }

  return (
    <div
      tabIndex={0}
      style={style}
      className='focusable'
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={`app-${name}`}
    >
      <Shadow border borderPurple={live}>
        <FlexCol gap='0.75rem' padding='0.5rem'>
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
      </Shadow>
    </div>
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
