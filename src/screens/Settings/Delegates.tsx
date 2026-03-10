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
import { Delegate, SettingsOptions } from '../../lib/types'
import { ConfigContext } from '../../providers/config'
import { WalletContext } from '../../providers/wallet'
import { useContext, useEffect, useState } from 'react'
import { OptionsContext } from '../../providers/options'
import Text, { TextSecondary } from '../../components/Text'
import { decodeArkAddress, isArkAddress } from '../../lib/address'

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

type DelegateInfo = { fee?: string }

// test connection to delegate by fetching delegate info and validating the response
const testConnection = (url: string, expectedServerPubKey: string): Promise<DelegateInfo> => {
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
          resolve({ fee: data.fee })
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

// card component to show a single delegate entry
function DelegateCard({
  delegate,
  isActive,
  isSelected,
  fee,
  onSelect,
  onRemove,
}: {
  delegate: Delegate
  isActive: boolean
  isSelected: boolean
  fee: string | null
  onSelect: () => void
  onRemove: () => void
}) {
  return (
    <Shadow lighter fat testId='delegate-card'>
      <FlexCol gap='0.5rem'>
        <FlexRow between>
          <FlexRow onClick={onSelect}>
            <input
              type='radio'
              name='active-delegate'
              checked={isSelected}
              onChange={onSelect}
              style={{ accentColor: '#60B18A', marginRight: '0.5rem' }}
            />
            <Text tiny>{delegate.url}</Text>
          </FlexRow>
          <FlexRow end>
            <Middot ok={isActive} />
            <div onClick={onRemove} style={{ cursor: 'pointer' }}>
              <Text tiny color='dark50'>
                Remove
              </Text>
            </div>
          </FlexRow>
        </FlexRow>
        {fee !== null && (
          <Text tiny color='dark50'>
            Fee: {fee} sats
          </Text>
        )}
      </FlexCol>
    </Shadow>
  )
}

export default function Delegates() {
  const { aspInfo } = useContext(AspContext)
  const { goBack } = useContext(OptionsContext)
  const { wallet } = useContext(WalletContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { setOption } = useContext(OptionsContext)

  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({})
  const [delegateFees, setDelegateFees] = useState<Record<string, string>>({})
  const [learnMore, setLearnMore] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [addError, setAddError] = useState('')

  const delegates = config.delegates

  // test connection and fetch fee for all delegates
  useEffect(() => {
    if (!delegates.enabled) return
    for (const d of delegates.list) {
      testConnection(d.url, aspInfo.signerPubkey)
        .then((info) => {
          setConnectionStatus((prev) => ({ ...prev, [d.url]: true }))
          if (info.fee) setDelegateFees((prev) => ({ ...prev, [d.url]: info.fee! }))
        })
        .catch(() => setConnectionStatus((prev) => ({ ...prev, [d.url]: false })))
    }
  }, [delegates.enabled, delegates.list.map((d) => d.url).join(','), aspInfo.signerPubkey])

  // handle back navigation
  const handleBack = () => {
    if (learnMore) {
      setLearnMore(false)
    } else {
      goBack()
    }
  }

  // toggle delegation on/off
  const handleToggle = async () => {
    const nextEnabled = !delegates.enabled
    if (nextEnabled && delegates.list.length === 0) return
    await updateConfig({
      ...config,
      delegates: { ...delegates, enabled: nextEnabled },
    })
    window.location.reload()
  }

  // select a delegate as active
  const handleSelect = async (url: string) => {
    if (url === delegates.activeUrl) return
    await updateConfig({
      ...config,
      delegates: { ...delegates, activeUrl: url },
    })
    window.location.reload()
  }

  // remove a delegate from the list
  const handleRemove = async (url: string) => {
    const newList = delegates.list.filter((d) => d.url !== url)
    const newActiveUrl = delegates.activeUrl === url ? (newList[0]?.url ?? null) : delegates.activeUrl
    await updateConfig({
      ...config,
      delegates: {
        ...delegates,
        list: newList,
        activeUrl: newActiveUrl,
        enabled: newList.length > 0 ? delegates.enabled : false,
      },
    })
    if (delegates.activeUrl === url) {
      window.location.reload()
    }
  }

  // add a new delegate
  const handleAdd = async () => {
    setAddError('')
    const url = newUrl.trim()
    if (!url) return
    if (delegates.list.some((d) => d.url === url)) {
      setAddError('Already in list')
      return
    }
    let info: DelegateInfo
    try {
      info = await testConnection(url, aspInfo.signerPubkey)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Unable to connect')
      return
    }
    const newList = [...delegates.list, { url }]
    await updateConfig({
      ...config,
      delegates: {
        ...delegates,
        list: newList,
        activeUrl: delegates.activeUrl ?? url,
      },
    })
    setNewUrl('')
    setConnectionStatus((prev) => ({ ...prev, [url]: true }))
    if (info.fee) setDelegateFees((prev) => ({ ...prev, [url]: info.fee! }))
  }

  const nextRolloverText = wallet.nextRollover
    ? `next renewal ${prettyAgo(wallet.nextRollover)}`
    : 'No upcoming renewal'

  const warningText = 'Delegates can only renew your VTXOs, they cannot spend your funds or control your wallet'

  return (
    <>
      <Header backFunc={handleBack} text='Delegates' />
      <Content>
        <Padded>
          {learnMore ? (
            <FlexCol gap='3rem'>
              <Hero learnMore={learnMore} setLearnMore={setLearnMore} />
              <LearnMore />
            </FlexCol>
          ) : (
            <FlexCol gap='1rem'>
              <Shadow fat purple>
                <Hero learnMore={learnMore} setLearnMore={setLearnMore} />
              </Shadow>
              <Toggle
                checked={delegates.enabled}
                onClick={handleToggle}
                testId='toggle-delegates'
                text='Enable delegation'
                subtext='Outsource VTXO renewal to a delegate service'
              />
              <TextSecondary>The wallet will reload to apply changes.</TextSecondary>
              <WarningBox text={warningText} />
              {delegates.enabled ? (
                <>
                  <FlexRow between>
                    <Text bold>Delegates</Text>
                    <FlexRow end onClick={() => setOption(SettingsOptions.Vtxos)}>
                      <Text color='dark50' tiny>
                        {nextRolloverText}
                      </Text>
                      <ArrowIcon small />
                    </FlexRow>
                  </FlexRow>
                  {delegates.list.map((d) => (
                    <DelegateCard
                      key={d.url}
                      delegate={d}
                      isActive={connectionStatus[d.url] ?? false}
                      isSelected={d.url === delegates.activeUrl}
                      fee={delegateFees[d.url] ?? null}
                      onSelect={() => handleSelect(d.url)}
                      onRemove={() => handleRemove(d.url)}
                    />
                  ))}
                  <Shadow lighter fat>
                    <FlexCol gap='0.5rem'>
                      <Text tiny bold>
                        Add delegate
                      </Text>
                      <FlexRow gap='0.5rem'>
                        <input
                          type='text'
                          value={newUrl}
                          onChange={(e) => {
                            setNewUrl(e.target.value)
                            setAddError('')
                          }}
                          placeholder='delegate.example.com:7002'
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid var(--ion-color-medium)',
                            background: 'transparent',
                            color: 'inherit',
                            fontSize: '0.85rem',
                          }}
                        />
                        <div
                          onClick={handleAdd}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            background: '#60B18A',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Add
                        </div>
                      </FlexRow>
                      {addError ? (
                        <Text tiny color='danger'>
                          {addError}
                        </Text>
                      ) : null}
                    </FlexCol>
                  </Shadow>
                </>
              ) : null}
            </FlexCol>
          )}
        </Padded>
      </Content>
    </>
  )
}
