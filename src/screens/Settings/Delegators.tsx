import Header from './Header'
import TrashIcon from '../../icons/Trash'
import ArrowIcon from '../../icons/Arrow'
import Input from '../../components/Input'
import { prettyAgo } from '../../lib/format'
import Toggle from '../../components/Toggle'
import Shadow from '../../components/Shadow'
import Padded from '../../components/Padded'
import Button from '../../components/Button'
import ReceiveIcon from '../../icons/Receive'
import SuccessIcon from '../../icons/Success'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import Scanner from '../../components/Scanner'
import InputUrl from '../../components/InputUrl'
import { AspContext } from '../../providers/asp'
import ErrorMessage from '../../components/Error'
import WarningBox from '../../components/Warning'
import { SettingsOptions } from '../../lib/types'
import { WalletContext } from '../../providers/wallet'
import { ConfigContext } from '../../providers/config'
import { defaultDelegator } from '../../lib/constants'
import { useContext, useEffect, useState } from 'react'
import { OptionsContext } from '../../providers/options'
import Text, { TextSecondary } from '../../components/Text'
import { decodeArkAddress, isArkAddress } from '../../lib/address'
import Modal from '../../components/Modal'

// test if the delegator URL is valid
const isValidUrl = (url: string): boolean => {
  if (url.startsWith('localhost') || url.startsWith('http://localhost')) return true
  if (url.startsWith('127.0.0.1') || url.startsWith('http://127.0.0.1')) return true
  const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/
  return urlPattern.test(url)
}

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

// test connection to delegator by fetching delegator info and validating the response
const testConnection = (url: string, expectedServerPubKey: string): Promise<void> => {
  // validate expected server pubkey format and length
  const expectedPubKey = expectedServerPubKey.length === 66 ? expectedServerPubKey.slice(2) : expectedServerPubKey
  if (expectedPubKey.length !== 64) return Promise.reject(new Error('Invalid expected server pubkey'))

  return new Promise((resolve, reject) => {
    fetch(formatUrl(url, '/v1/delegator/info'))
      .then((res) => {
        if (!res.ok) return reject(new Error('Unable to connect'))
        res.json().then((data) => {
          if (!data?.delegatorAddress) return reject(new Error('Invalid delegator'))
          if (!isArkAddress(data.delegatorAddress)) return reject(new Error('Invalid delegator address'))
          const { serverPubKey } = decodeArkAddress(data.delegatorAddress)
          if (serverPubKey !== expectedPubKey) return reject(new Error('Invalid server key'))
          resolve()
        })
      })
      .catch(() => reject(new Error('Unable to connect')))
  })
}

// component to confirm deletion of delegator
function Confirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal>
      <FlexCol centered>
        <TrashIcon big />
        <Text centered>Remove delegator?</Text>
        <TextSecondary centered>
          Are you sure you want to remove this delegator? This action can't be undone. It will no longer be able to
          assist with renewals.
        </TextSecondary>
        <FlexRow gap='1rem' between>
          <Button label='Cancel' secondary onClick={onCancel} />
          <Button label='Remove' red onClick={onConfirm} />
        </FlexRow>
      </FlexCol>
    </Modal>
  )
}

// hero component to explain what delegators are
function Hero({ learnMore, setLearnMore }: { learnMore: boolean; setLearnMore: (value: boolean) => void }) {
  return (
    <FlexRow between>
      <FlexCol gap='0.5rem'>
        <Text bold>What is a Delegator?</Text>
        <TextSecondary>
          A delegator is a trusted third party you appoint to help keep your VTXOs safe and secure.
        </TextSecondary>
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

// component with information about delegators and how they work
function LearnMore() {
  return (
    <FlexCol gap='1rem'>
      <TextSecondary>
        Delegation allows you to outsource VTXO renewal to a third-party delegator service. Instead of renewing VTXOs
        yourself, the delegator will automatically settle them before they expire, sending the funds back to your wallet
        address (minus a service fee). This is useful for wallets that cannot be online 24/7.
      </TextSecondary>
      <TextSecondary>🔸 Why do you need Delegators?</TextSecondary>
      <TextSecondary>
        In Arkade, VTXOs expire periodically (e.g., every week or month). To keep your balance usable, you must rotate
        (renew) your VTXOs before they expire. If you fail to renew them (because you're offline too long), your funds
        could become stuck or lost. A delegator prevents this by stepping in to rotate your VTXOs on your behalf.
      </TextSecondary>
      <TextSecondary>🔹 How do Delegators work technically?</TextSecondary>
      <TextSecondary>
        You generate a pre-signed transaction that lets the delegator renew your VTXO. This transaction is limited: it
        only allows rotating your funds, not spending them. The delegator holds this pre-signed transaction and can
        broadcast it if your wallet doesn't renew in time. This ensures your coins don't expire without giving the
        delegator full control over your funds.
      </TextSecondary>
    </FlexCol>
  )
}

// middle dot component to indicate status of delegator connection
function Middot({ ok = true }: { ok?: boolean }) {
  const color = ok ? '#60B18A' : '#E27D60'
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect width='14' height='14' rx='7' fill={color} fillOpacity='0.1' />
      <circle cx='7' cy='7' r='3' fill={color} />
    </svg>
  )
}

// card component to show current delegator information and status
function DelegatorCard({ active = true }: { active?: boolean }) {
  const { config } = useContext(ConfigContext)
  const { wallet } = useContext(WalletContext)
  const { setOption } = useContext(OptionsContext)

  if (!config.delegator) return null

  const nextRolloverText = wallet.nextRollover
    ? `next renewal in ${prettyAgo(wallet.nextRollover)}`
    : 'No upcoming renewal'

  return (
    <Shadow lighter fat>
      <FlexCol gap='0.5rem'>
        <FlexRow between>
          <Text>{config.delegator.name}</Text>
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
            <Text tiny>{config.delegator.url}</Text>
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

export default function Delegators() {
  const { aspInfo } = useContext(AspContext)
  const { goBack } = useContext(OptionsContext)
  const { config, updateConfig } = useContext(ConfigContext)

  const [error, setError] = useState('')
  const [scan, setScan] = useState(false)
  const [saved, setSaved] = useState(false)
  const [active, setActive] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [learnMore, setLearnMore] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [useDefault, setUseDefault] = useState(false)
  const [delegatorUrl, setDelegatorUrl] = useState('')
  const [delegatorName, setDelegatorName] = useState('')

  // test connection to delegator when url changes
  useEffect(() => {
    if (!delegatorUrl || !isValidUrl(delegatorUrl)) return setError('')
    testConnection(delegatorUrl, aspInfo.signerPubkey)
      .then(() => {
        setError('')
        setActive(true)
      })
      .catch((err) => {
        setError(err.message)
        setActive(false)
      })
  }, [delegatorUrl])

  // initialize form with current delegator config
  useEffect(() => {
    setDelegatorUrl(config.delegator?.url ?? '')
    setDelegatorName(config.delegator?.name ?? '')
    setUseDefault(config.delegator?.url === defaultDelegator().url)
  }, [config.delegator])

  // handle back navigation
  const handleBack = () => {
    if (updating) {
      setUpdating(false)
    } else if (learnMore) {
      setLearnMore(false)
    } else {
      goBack()
    }
  }

  // handle deletion of delegator config
  const handleDeleteDelegator = () => {
    updateConfig({ ...config, delegator: null })
    setTimeout(() => setDeleted(false), 2100)
    setConfirming(false)
    setUpdating(false)
    setDeleted(true)
  }

  // toggle between default delegator and custom delegator
  const handleToggle = () => {
    const delegator = useDefault ? null : defaultDelegator()
    updateConfig({ ...config, delegator })
    setUseDefault(!useDefault)
  }

  // update delegator config
  const handleUpdateDelegator = () => {
    const delegator = {
      name: delegatorName,
      url: delegatorUrl,
    }
    updateConfig({ ...config, delegator })
    setTimeout(() => setSaved(false), 2100)
    setUpdating(false)
    setSaved(true)
  }

  // text to show on warning box
  const warningText = "Delegators can only renew your VTXO's, they cannot spend your funds or control your wallet"

  // text to show on main button
  const mainButtonText = config.delegator && !useDefault ? 'Edit delegator' : 'Add delegator'

  // show trash icon if there's a custom delegator configured and we're in updating mode
  const trashIcon = updating && config.delegator && !useDefault ? <TrashIcon /> : undefined

  // function to call when trash icon is clicked
  const auxFunc = updating && config.delegator && !useDefault ? () => setConfirming(true) : undefined

  // if scan is true, show the scanner component to scan a delegator URL
  if (scan)
    return <Scanner close={() => setScan(false)} label='Server URL' onData={setDelegatorUrl} onError={setError} />

  return (
    <>
      <Header backFunc={handleBack} text='Delegators' auxIcon={trashIcon} auxFunc={auxFunc} />
      {confirming ? <Confirm onCancel={() => setConfirming(false)} onConfirm={handleDeleteDelegator} /> : null}
      <Content>
        <Padded>
          {updating ? (
            <FlexCol>
              <FlexCol>
                <Input label='Delegator name' onChange={setDelegatorName} value={delegatorName} />
                <InputUrl
                  label='Delegator URL'
                  onChange={setDelegatorUrl}
                  openScan={() => setScan(true)}
                  value={delegatorUrl}
                />
                <ErrorMessage error={Boolean(error)} text={error} />
                {active ? <WarningBox green text='Delegator found' /> : null}
              </FlexCol>
              <Button
                main
                icon={<ReceiveIcon />}
                label='Save delegator'
                onClick={handleUpdateDelegator}
                disabled={!(delegatorName.length > 0 && isValidUrl(delegatorUrl) && error.length === 0)}
              />
            </FlexCol>
          ) : learnMore ? (
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
              <Button
                main
                label={mainButtonText}
                icon={<ReceiveIcon />}
                onClick={() => setUpdating(true)}
                disabled={useDefault}
              />
              <Toggle
                checked={useDefault}
                onClick={handleToggle}
                testId='toggle-delegators'
                text='Use default Arkade delegator'
                subtext="Use Arkade's default delegator to manage renewals"
                disabled={!useDefault && config.delegator !== null}
              />
              <WarningBox text={warningText} />
              <DelegatorCard active={active} />
              {saved ? <WarningBox green text='Delegator saved' /> : null}
              {deleted ? <WarningBox green text='Delegator deleted' /> : null}
            </FlexCol>
          )}
        </Padded>
      </Content>
    </>
  )
}
