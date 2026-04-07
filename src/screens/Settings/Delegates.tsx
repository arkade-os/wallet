import Header from './Header'
import ArrowIcon from '../../icons/Arrow'
import { prettyAgo, prettyAmount, prettyLongText } from '../../lib/format'
import Toggle from '../../components/Toggle'
import Shadow from '../../components/Shadow'
import Padded from '../../components/Padded'
import SuccessIcon from '../../icons/Success'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import { AspContext, AspInfo } from '../../providers/asp'
import WarningBox from '../../components/Warning'
import { Delegate, SettingsOptions } from '../../lib/types'
import { ConfigContext } from '../../providers/config'
import { WalletContext } from '../../providers/wallet'
import { getDelegateUrlForNetwork } from '../../lib/constants'
import { useContext, useEffect, useState } from 'react'
import { OptionsContext } from '../../providers/options'
import Text, { TextSecondary } from '../../components/Text'
import { decodeArkAddress, isArkAddress } from '../../lib/address'
import { Network } from '@arkade-os/boltz-swap'
import { copyToClipboard } from '../../lib/clipboard'
import { copiedToClipboard } from '../../lib/toast'
import { useIonToast } from '@ionic/react'

// format the URL to ensure it has the correct protocol and no trailing slashes
const formatUrl = (host: string, path: string): string => {
  host = host.replace(/\/+$/, '')
  path = path.replace(/^\/+/, '')
  const prefix =
    host.startsWith('http://') || host.startsWith('https://')
      ? ''
      : host.startsWith('localhost') || host.startsWith('127.0.0.1')
        ? 'http://'
        : 'https://'
  return `${prefix}${host}/${path}`
}

// test connection to delegate by fetching delegate info and validating the response
const testConnection = (aspInfo: AspInfo): Promise<Delegate> => {
  return new Promise((resolve, reject) => {
    // ensure expected pubkey is in xonly format
    const expectedPubKey = aspInfo.signerPubkey.length === 66 ? aspInfo.signerPubkey.slice(2) : aspInfo.signerPubkey
    if (expectedPubKey.length !== 64) return reject(new Error('Invalid expected server pubkey'))
    const delegate = getDelegateUrlForNetwork(aspInfo.network as Network)
    // fetch delegate info from the delegate server
    fetch(formatUrl(delegate.url, '/v1/delegator/info'))
      .then((res) => {
        if (!res.ok) return reject(new Error('Unable to connect'))
        res.json().then((data: { delegatorAddress: string; pubkey: string; fee: string }) => {
          if (!data) return reject(new Error('Invalid delegate response'))
          if (!data.fee) return reject(new Error('Missing delegate fee'))
          if (isNaN(parseInt(data.fee))) return reject(new Error('Invalid delegate fee'))
          if (parseInt(data.fee) < 0) return reject(new Error("Delegate fee can't be negative"))
          if (!data.pubkey) return reject(new Error('Missing delegate pubkey'))
          if (data.pubkey.length !== 66) return reject(new Error('Invalid delegate pubkey'))
          if (!data.delegatorAddress) return reject(new Error('Missing delegate address'))
          if (!isArkAddress(data.delegatorAddress)) return reject(new Error('Invalid delegate address'))
          const { serverPubKey } = decodeArkAddress(data.delegatorAddress)
          if (serverPubKey !== expectedPubKey) return reject(new Error('Invalid delegate server key'))
          resolve({ ...delegate, address: data.delegatorAddress, pubkey: data.pubkey, fee: parseInt(data.fee) })
        })
      })
      .catch(() => reject(new Error('Unable to connect')))
  })
}

// hero component to explain what delegates are
function Hero() {
  return (
    <FlexRow between>
      <FlexCol gap='0.5rem'>
        <Text bold>What is a Delegate?</Text>
        <Text small thin wrap>
          A delegate is a trusted third party you appoint to help keep your VTXOs safe and secure.
        </Text>
        <a
          href='https://docs.arkadeos.com/learn/pillars/batch-expiry#delegation-solutions'
          target='_blank'
          rel='noopener noreferrer'
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '6px',
            color: '#040404',
            background: '#fbfbfb',
            textTransform: 'uppercase',
            width: 'fit-content',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          <Text tiny thin>
            Learn more
          </Text>
        </a>
      </FlexCol>
      <div style={{ transform: 'translateX(30px) translateY(40px) rotate(13deg)', width: '140px' }}>
        <SuccessIcon />
      </div>
    </FlexRow>
  )
}

// middle dot component to indicate status of delegate connection
function Middot({ ok = true }: { ok?: boolean }) {
  const color = ok ? '#60B18A' : '#E27D60'
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect width='14' height='14' rx='7' fill={color} fillOpacity='0.1' />
      <circle cx='7' cy='7' r='3' fill={color} />
    </svg>
  )
}

// card component to show current delegate information and status
function DelegateCard() {
  const { aspInfo } = useContext(AspContext)
  const { config } = useContext(ConfigContext)
  const { wallet } = useContext(WalletContext)
  const { setOption } = useContext(OptionsContext)

  const [present] = useIonToast()

  const [active, setActive] = useState(false)
  const [delegate, setDelegate] = useState<Delegate>(getDelegateUrlForNetwork(aspInfo.network as Network))

  // test connection to delegate when url changes
  useEffect(() => {
    if (!config.delegate) return
    testConnection(aspInfo)
      .then((delegate) => {
        setDelegate(delegate)
        setActive(true)
      })
      .catch(() => setActive(false))
  }, [config.delegate, aspInfo.signerPubkey])

  if (!config.delegate) return null

  const handleCopy = async (value: string) => {
    await copyToClipboard(value)
    present(copiedToClipboard)
  }

  const nextRolloverText = wallet.nextRollover
    ? `next renewal ${prettyAgo(wallet.nextRollover)}`
    : 'No upcoming renewal'

  return (
    <Shadow lighter fat testId='delegate-card'>
      <FlexCol gap='0.5rem'>
        <FlexRow between>
          <Text>{delegate.name}</Text>
          <FlexRow end onClick={() => setOption(SettingsOptions.Vtxos)}>
            <Text color='dark50' tiny>
              {nextRolloverText}
            </Text>
            <ArrowIcon small />
          </FlexRow>
        </FlexRow>
        <hr className='dashed-hr' />
        <FlexRow between>
          <Shadow flex>
            <Text tiny>{delegate.url}</Text>
          </Shadow>
          <FlexRow end>
            <Middot ok={active} />
            <Text tiny>{active ? 'Active' : 'Inactive'}</Text>
          </FlexRow>
        </FlexRow>
        <FlexCol gap='0.25rem'>
          <FlexRow onClick={() => handleCopy(delegate.address)}>
            <TextSecondary>address: {prettyLongText(delegate.address, 14)}</TextSecondary>
          </FlexRow>
          <FlexRow onClick={() => handleCopy(delegate.pubkey)}>
            <TextSecondary>pubkey: {prettyLongText(delegate.pubkey, 14)}</TextSecondary>
          </FlexRow>
          <FlexRow onClick={() => handleCopy(delegate.fee.toString())}>
            <TextSecondary>fee: {prettyAmount(delegate.fee)}</TextSecondary>
          </FlexRow>
        </FlexCol>
      </FlexCol>
    </Shadow>
  )
}

export default function Delegates() {
  const { goBack } = useContext(OptionsContext)
  const { config, updateConfig } = useContext(ConfigContext)

  // toggle delegate
  const handleToggle = () => {
    const nextDelegate = !config.delegate
    updateConfig({ ...config, delegate: nextDelegate })
    // Full page reload ensures service worker and wallet are re-instantiated with the new delegator setting.
    window.location.reload()
  }

  // text to show on warning box
  const warningText = 'Delegates can only renew your VTXOs, they cannot spend your funds or control your wallet'

  return (
    <>
      <Header backFunc={goBack} text='Delegates' />
      <Content>
        <Padded>
          <FlexCol gap='1rem' padding='0 0 24px 0'>
            <Shadow fat purple>
              <Hero />
            </Shadow>
            <Toggle
              checked={config.delegate}
              onClick={handleToggle}
              testId='toggle-delegates'
              text='Use default Arkade delegate'
              subtext="Use Arkade's default delegate to manage renewals"
            />
            <TextSecondary>The wallet will reload to apply the change.</TextSecondary>
            <WarningBox text={warningText} />
            <DelegateCard />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
