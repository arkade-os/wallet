import Header from './Header'
import ArrowIcon from '../../icons/Arrow'
import { prettyAgo } from '../../lib/format'
import Toggle from '../../components/Toggle'
import Shadow from '../../components/Shadow'
import Padded from '../../components/Padded'
import SuccessIcon from '../../icons/Success'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import { AspContext } from '../../providers/asp'
import WarningBox from '../../components/Warning'
import { SettingsOptions } from '../../lib/types'
import { WalletContext } from '../../providers/wallet'
import { ConfigContext } from '../../providers/config'
import { defaultDelegate } from '../../lib/constants'
import { useContext, useEffect, useState } from 'react'
import { OptionsContext } from '../../providers/options'
import Text, { TextSecondary } from '../../components/Text'
import { decodeArkAddress, isArkAddress } from '../../lib/address'

// format the URL to ensure it has the correct protocol and no trailing slashes
const formatUrl = (host: string, path: string): string => {
  host = host.replace(/\/+$/, '')
  path = path.replace(/^\/+/, '')
  const prefix = host.startsWith('http')
    ? ''
    : host.startsWith('localhost') || host.startsWith('127.0.0.1')
      ? 'http://'
      : 'https://'
  return `${prefix}${host}/${path}`
}

// test connection to delegate by fetching delegate info and validating the response
const testConnection = (url: string, expectedServerPubKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // ensure expected pubkey is in xonly format
    const expectedPubKey = expectedServerPubKey.length === 66 ? expectedServerPubKey.slice(2) : expectedServerPubKey
    if (expectedPubKey.length !== 64) return reject(new Error('Invalid expected server pubkey'))
    // fetch delegate info from the delegate server
    fetch(formatUrl(url, '/v1/delegator/info'))
      .then((res) => {
        if (!res.ok) return reject(new Error('Unable to connect'))
        res.json().then((data) => {
          if (!data?.delegatorAddress) return reject(new Error('Invalid delegate response'))
          if (!isArkAddress(data.delegatorAddress)) return reject(new Error('Invalid delegate address'))
          const { serverPubKey } = decodeArkAddress(data.delegatorAddress)
          if (serverPubKey !== expectedPubKey) return reject(new Error('Invalid delegate server key'))
          resolve()
        })
      })
      .catch(() => reject(new Error('Unable to connect')))
  })
}

// hero component to explain what delegates are
function Hero({ learnMore, setLearnMore }: { learnMore: boolean; setLearnMore: (value: boolean) => void }) {
  return (
    <FlexRow between>
      <FlexCol gap='0.5rem'>
        <Text bold>What is a Delegate?</Text>
        <Text small thin wrap>
          A delegate is a trusted third party you appoint to help keep your VTXOs safe and secure.
        </Text>
        {!learnMore ? (
          <div
            onClick={() => setLearnMore(true)}
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: '6px',
              color: '#040404',
              background: '#fbfbfb',
              textTransform: 'uppercase',
              width: 'fit-content',
              cursor: 'pointer',
            }}
          >
            <Text tiny thin>
              Learn more
            </Text>
          </div>
        ) : null}
      </FlexCol>
      <div style={{ transform: 'translateX(30px) translateY(40px) rotate(13deg)', width: '140px' }}>
        <SuccessIcon />
      </div>
    </FlexRow>
  )
}

// component with information about delegates and how they work
function LearnMore() {
  return (
    <FlexCol gap='1rem'>
      <TextSecondary>
        Delegation allows you to outsource VTXO renewal to a third-party delegate service. Instead of renewing VTXOs
        yourself, the delegate will automatically settle them before they expire, sending the funds back to your wallet
        address (minus a service fee). This is useful for wallets that cannot be online 24/7.
      </TextSecondary>
      <TextSecondary>🔸 Why do you need Delegates?</TextSecondary>
      <TextSecondary>
        In Arkade, VTXOs expire periodically (e.g., every week or month). To keep your balance usable, you must rotate
        (renew) your VTXOs before they expire. If you fail to renew them (because you're offline too long), your funds
        could become stuck or lost. A delegate prevents this by stepping in to rotate your VTXOs on your behalf.
      </TextSecondary>
      <TextSecondary>🔹 How do Delegates work technically?</TextSecondary>
      <TextSecondary>
        You generate a pre-signed transaction that lets the delegate renew your VTXO. This transaction is limited: it
        only allows rotating your funds, not spending them. The delegate holds this pre-signed transaction and can
        broadcast it if your wallet doesn't renew in time. This ensures your coins don't expire without giving the
        delegate full control over your funds.
      </TextSecondary>
    </FlexCol>
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
function DelegateCard({ active = true }: { active?: boolean }) {
  const { config } = useContext(ConfigContext)
  const { wallet } = useContext(WalletContext)
  const { setOption } = useContext(OptionsContext)

  if (!config.delegate) return null

  const delegate = defaultDelegate()

  const nextRolloverText = wallet.nextRollover
    ? `next renewal ${prettyAgo(wallet.nextRollover)}`
    : 'No upcoming renewal'

  return (
    <Shadow lighter fat>
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
      </FlexCol>
    </Shadow>
  )
}

export default function Delegates() {
  const { aspInfo } = useContext(AspContext)
  const { goBack } = useContext(OptionsContext)
  const { config, updateConfig } = useContext(ConfigContext)

  const [active, setActive] = useState(false)
  const [learnMore, setLearnMore] = useState(false)

  const delegate = defaultDelegate()

  // test connection to delegate when url changes
  useEffect(() => {
    if (!config.delegate) return
    testConnection(delegate.url, aspInfo.signerPubkey)
      .then(() => setActive(true))
      .catch(() => setActive(false))
  }, [config.delegate, aspInfo.signerPubkey])

  // handle back navigation
  const handleBack = () => {
    if (learnMore) {
      setLearnMore(false)
    } else {
      goBack()
    }
  }

  // toggle delegate
  const handleToggle = () => updateConfig({ ...config, delegate: !config.delegate })

  // text to show on warning box
  const warningText = "Delegates can only renew your VTXO's, they cannot spend your funds or control your wallet"

  return (
    <>
      <Header backFunc={handleBack} text='Delegates' />
      <Content>
        <Padded>
          {learnMore ? (
            <>
              <FlexCol gap='3rem'>
                <Hero learnMore={learnMore} setLearnMore={setLearnMore} />
                <LearnMore />
              </FlexCol>
            </>
          ) : (
            <FlexCol gap='1rem'>
              <Shadow fat purple>
                <Hero learnMore={learnMore} setLearnMore={setLearnMore} />
              </Shadow>
              <Toggle
                checked={config.delegate}
                onClick={handleToggle}
                testId='toggle-delegates'
                text='Use default Arkade delegate'
                subtext="Use Arkade's default delegate to manage renewals"
              />
              <WarningBox text={warningText} />
              <DelegateCard active={active} />
            </FlexCol>
          )}
        </Padded>
      </Content>
    </>
  )
}
