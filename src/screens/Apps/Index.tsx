import { ReactElement, useContext, useState } from 'react'
import Content from '../../components/Content'
import FlexRow from '../../components/FlexRow'
import Padded from '../../components/Padded'
import Header from '../../components/Header'
import FlexCol from '../../components/FlexCol'
import Text from '../../components/Text'
import ArkadeMintIcon from '../../icons/ArkadeMintIcon'
import BoltzIcon from '../../icons/Boltz'
import { NavigationContext, Pages } from '../../providers/navigation'
import { ConfigContext } from '../../providers/config'
import { Themes } from '../../lib/types'
import LendasatIcon from './Lendasat/LendasatIcon'
import LendaswapIcon from './Lendaswap/LendaswapIcon'
import DfxIcon from './Dfx/DfxIcon'
import Focusable from '../../components/Focusable'
import { hapticSubtle } from '../../lib/haptics'

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
  isDark: boolean
  name: string
  live?: boolean
  link?: string
  page?: Pages
}

function App({ desc, icon, link, name, live, page, isDark }: AppProps) {
  const { navigate } = useContext(NavigationContext)
  const [pressed, setPressed] = useState(false)

  const handleClick = () => {
    hapticSubtle()
    if (typeof page !== 'undefined') return navigate(page)
    if (link) window.open(link, '_blank')
  }

  const handlePressStart = () => setPressed(true)
  const handlePressEnd = () => setPressed(false)

  const testId = `app-${name.toLowerCase().replace(/\s+/g, '-')}`

  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    WebkitTapHighlightColor: 'transparent',
    transform: pressed ? 'scale(0.97)' : 'scale(1)',
    transition: 'transform 0.12s ease-out',
  }

  const cardStyle: React.CSSProperties = {
    padding: '0.75rem',
    width: '100%',
    cursor: 'pointer',
    background: pressed
      ? isDark
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.06)'
      : isDark
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(0,0,0,0.03)',
    transition: 'background 0.12s ease-out',
  }

  return (
    <Focusable onEnter={handleClick} round ariaLabel={name}>
      <div
        style={wrapperStyle}
        onClick={handleClick}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressEnd}
      >
        <div style={cardStyle}>
          <FlexCol gap='0.75rem' testId={testId}>
            <FlexRow between alignItems='flex-start'>
              {icon}
              <FlexCol gap='0.25rem'>
                <FlexRow between>
                  <Text bold>{name}</Text>
                  <Tag kind={live ? 'new' : 'coming soon'} />
                </FlexRow>
                <Text color='dark80' small thin wrap>
                  {link}
                </Text>
                <Text color='dark80' small thin wrap>
                  {desc}
                </Text>
              </FlexCol>
            </FlexRow>
          </FlexCol>
        </div>
      </div>
    </Focusable>
  )
}

export default function Apps() {
  const { effectiveTheme } = useContext(ConfigContext)
  const isDark = effectiveTheme === Themes.Dark

  return (
    <>
      <Header text='Apps' />
      <Content>
        <Padded>
          <FlexCol>
            <App
              name='Arkade Mint'
              icon={<ArkadeMintIcon />}
              desc='Issue, send, and receive assets on Arkade'
              page={Pages.AppAssets}
              isDark={isDark}
              live
            />

            <App
              name='Boltz'
              icon={<BoltzIcon />}
              desc='Swap instantly between Arkade, Lightning and Bitcoin'
              link='https://boltz.exchange/'
              page={Pages.AppBoltz}
              isDark={isDark}
              live
            />

            <App
              name='DFX'
              icon={<DfxIcon />}
              desc='Buy Bitcoin natively on Arkade with EUR and CHF bank transfers'
              link='https://dfx.swiss'
              page={Pages.AppDfx}
              isDark={isDark}
              live
            />

            <App
              name='LendaSat'
              icon={<LendasatIcon />}
              desc='Take loans with Bitcoin as collateral. Receive USDC or USDT in 2 minutes'
              link='https://lendasat.com'
              page={Pages.AppLendasat}
              isDark={isDark}
              live
            />

            <App
              name='LendaSwap'
              icon={<LendaswapIcon />}
              desc='Swap Bitcoin to USDC or USDT instantly'
              link='https://swap.lendasat.com'
              page={Pages.AppLendaswap}
              isDark={isDark}
              live
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
