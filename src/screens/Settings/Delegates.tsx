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
import { getDelegateForNetwork, getDelegateeUrlForNetwork } from '../../lib/constants'
import { useContext, useEffect, useState } from 'react'
import { OptionsContext } from '../../providers/options'
import Text, { TextSecondary } from '../../components/Text'
import { type NetworkName } from '@arkade-os/sdk'
import { copyToClipboard } from '../../lib/clipboard'
import { useToast } from '../../components/Toast'
import { consoleError } from '../../lib/logs'
import { BackupContext } from '@/providers/backup'
import Input from '../../components/Input'
import Button from '../../components/Button'

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

type DelegateConnectionInfo = Pick<AspInfo, 'deprecatedSigners' | 'network' | 'signerPubkey'> & {
  renewalWindow: number
  maxFee: number
}

// Test the delegatee endpoint and verify that its covenant is for this Ark server.
const testConnection = (aspInfo: DelegateConnectionInfo): Promise<Delegate | undefined> => {
  return new Promise((resolve, reject) => {
    // ensure expected pubkeys are in xonly format
    const now = Math.floor(Date.now() / 1000)
    const deprecatedSignerPubkeys = (aspInfo.deprecatedSigners || [])
      .filter((ds) => ds.cutoffDate > now)
      .map((ds) => ds.pubkey)
    const possibleXOnlyPubkeys = [...deprecatedSignerPubkeys, aspInfo.signerPubkey].map((pk) =>
      pk.length === 66 ? pk.slice(2) : pk,
    )
    if (possibleXOnlyPubkeys.some((pk) => pk.length !== 64)) return reject(new Error('Invalid expected server pubkey'))
    const delegate = getDelegateForNetwork(aspInfo.network as NetworkName)
    if (!delegate) return resolve(undefined)
    const query = new URLSearchParams({
      renewalWindow: String(aspInfo.renewalWindow),
      maxFee: String(aspInfo.maxFee),
    })
    fetch(formatUrl(delegate.url, `/v1/info?${query}`))
      .then((res) => {
        if (!res.ok) return reject(new Error('Unable to connect'))
        res
          .json()
          .then(
            (data: {
              network: string
              delegatePubkey: string
              serverPubkey: string
              emulatorPubkey: string
              emulatorTweakedPubkey: string
              arkadeScript: string
              delegateTapscript: string
              renewalWindow: string | number
              maxFee?: string | number
            }) => {
              if (!data || data.network !== aspInfo.network) return reject(new Error('Invalid delegatee network'))
              const validHex = (value: string | undefined, bytes?: number) =>
                !!value &&
                /^[0-9a-f]+$/i.test(value) &&
                value.length % 2 === 0 &&
                (!bytes || value.length === bytes * 2)
              if (!validHex(data.delegatePubkey, 33)) return reject(new Error('Invalid delegatee pubkey'))
              if (!validHex(data.serverPubkey, 33)) return reject(new Error('Invalid delegatee server pubkey'))
              if (!validHex(data.emulatorPubkey, 33)) return reject(new Error('Invalid emulator pubkey'))
              if (!validHex(data.emulatorTweakedPubkey, 33)) return reject(new Error('Invalid tweaked emulator pubkey'))
              if (!validHex(data.arkadeScript) || !validHex(data.delegateTapscript)) {
                return reject(new Error('Invalid delegatee covenant script'))
              }
              const serverKey = data.serverPubkey.slice(2).toLowerCase()
              if (!possibleXOnlyPubkeys.some((pk) => pk.toLowerCase() === serverKey)) {
                return reject(new Error('Invalid delegatee server key'))
              }
              const renewalWindow = Number(data.renewalWindow)
              const maxFee = Number(data.maxFee ?? 0)
              if (!Number.isSafeInteger(renewalWindow) || renewalWindow <= 0) {
                return reject(new Error('Invalid delegatee renewal window'))
              }
              if (!Number.isSafeInteger(maxFee) || maxFee < 0) return reject(new Error('Invalid delegatee max fee'))
              if (renewalWindow !== aspInfo.renewalWindow || maxFee !== aspInfo.maxFee) {
                return reject(new Error('Delegatee returned different renewal parameters'))
              }
              resolve({
                ...delegate,
                pubkey: data.delegatePubkey,
                emulatorPubkey: data.emulatorPubkey,
                renewalWindow,
                maxFee,
              })
            },
          )
          .catch(() => reject(new Error('Invalid json in delegatee response')))
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
            color: 'var(--fg)',
            background: 'var(--bg)',
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

  const { toast } = useToast()

  const [active, setActive] = useState(false)
  const [delegate, setDelegate] = useState<Delegate>()

  const { deprecatedSigners, network, signerPubkey } = aspInfo

  // populate delegate info, then test the connection once for the current network/ASP signer
  useEffect(() => {
    if (!config.delegate || !network) {
      setDelegate(undefined)
      setActive(false)
      return
    }

    const networkDelegate = getDelegateForNetwork(network as NetworkName)
    setDelegate(networkDelegate)
    setActive(false)

    if (!networkDelegate?.url || !signerPubkey) return

    let cancelled = false
    testConnection({
      deprecatedSigners,
      network,
      signerPubkey,
      renewalWindow: config.delegateRenewalWindow ?? 1024,
      maxFee: config.delegateMaxFee ?? 0,
    })
      .then((testedDelegate) => {
        if (cancelled || !testedDelegate) return
        setDelegate(testedDelegate)
        setActive(true)
      })
      .catch((error) => {
        if (cancelled) return
        consoleError(error, 'Error testing delegate connection:')
        setActive(false)
      })

    return () => {
      cancelled = true
    }
  }, [config.delegate, config.delegateRenewalWindow, config.delegateMaxFee, deprecatedSigners, network, signerPubkey])

  if (!config.delegate) return null

  const handleCopy = async (value: string) => {
    await copyToClipboard(value)
    toast('Copied to clipboard')
  }

  const nextRolloverText = wallet.nextRollover
    ? `next renewal ${prettyAgo(wallet.nextRollover)}`
    : 'No upcoming renewal'

  if (!delegate) return <></>

  return (
    <Shadow lighter fat testId='delegate-card'>
      <FlexCol gap='0.5rem'>
        <FlexRow between>
          <Text>{delegate.name}</Text>
          <FlexRow end onClick={() => setOption(SettingsOptions.Vtxos)}>
            <Text color='neutral-500' tiny>
              {nextRolloverText}
            </Text>
            <ArrowIcon small />
          </FlexRow>
        </FlexRow>
        <hr className='dashed' />
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
          <FlexRow onClick={() => handleCopy(delegate.pubkey)}>
            <TextSecondary>delegate key: {prettyLongText(delegate.pubkey, 14)}</TextSecondary>
          </FlexRow>
          {Boolean(delegate.emulatorPubkey) && (
            <FlexRow onClick={() => handleCopy(delegate.emulatorPubkey!)}>
              <TextSecondary>emulator key: {prettyLongText(delegate.emulatorPubkey, 14)}</TextSecondary>
            </FlexRow>
          )}
          <FlexRow>
            <TextSecondary>renewal window: {delegate.renewalWindow} seconds</TextSecondary>
          </FlexRow>
          <FlexRow>
            <TextSecondary>maximum renewal fee: {prettyAmount(delegate.maxFee ?? 0)}</TextSecondary>
          </FlexRow>
        </FlexCol>
      </FlexCol>
    </Shadow>
  )
}

export default function Delegates() {
  const { aspInfo } = useContext(AspContext)
  const { goBack } = useContext(OptionsContext)
  const { config } = useContext(ConfigContext)
  const { backupAndUpdateConfig } = useContext(BackupContext)

  const noDelegateFound = getDelegateeUrlForNetwork(aspInfo.network as NetworkName) === undefined
  const [renewalWindow, setRenewalWindow] = useState(String(config.delegateRenewalWindow ?? 1024))
  const [maxFee, setMaxFee] = useState(String(config.delegateMaxFee ?? 0))

  useEffect(() => {
    setRenewalWindow(String(config.delegateRenewalWindow ?? 1024))
    setMaxFee(String(config.delegateMaxFee ?? 0))
  }, [config.delegateRenewalWindow, config.delegateMaxFee])

  // toggle delegate
  const handleToggle = () => {
    const nextDelegate = !config.delegate
    backupAndUpdateConfig({ ...config, delegate: nextDelegate })
    // Full page reload ensures service worker and wallet are re-instantiated with the new delegator setting.
    window.location.reload()
  }

  const applyParameters = () => {
    const parsedWindow = Number(renewalWindow)
    const parsedMaxFee = Number(maxFee)
    if (!Number.isSafeInteger(parsedWindow) || parsedWindow < 1 || parsedWindow > 31_622_400) return
    if (!Number.isSafeInteger(parsedMaxFee) || parsedMaxFee < 0 || parsedMaxFee > 1_000_000) return
    backupAndUpdateConfig({
      ...config,
      delegateRenewalWindow: parsedWindow,
      delegateMaxFee: parsedMaxFee,
    })
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
            {noDelegateFound ? (
              <WarningBox text='No delegate found for this network.' />
            ) : (
              <>
                <Toggle
                  checked={config.delegate}
                  onClick={handleToggle}
                  testId='toggle-delegates'
                  text='Use default Arkade delegate'
                  subtext="Use Arkade's default delegate to manage renewals"
                />
                <TextSecondary>The wallet will reload to apply the change.</TextSecondary>
                <Shadow fat>
                  <FlexCol gap='0.75rem'>
                    <Text bold>Renewal settings</Text>
                    <TextSecondary>
                      Maximum sats the service may pay to Arkade per renewal. Set to zero to require free renewals.
                    </TextSecondary>
                    <Input
                      type='number'
                      min='1'
                      max='31622400'
                      step='1'
                      label='Renewal window (seconds)'
                      value={renewalWindow}
                      onChange={setRenewalWindow}
                    />
                    <Input
                      type='number'
                      min='0'
                      max='1000000'
                      step='1'
                      label='Maximum renewal fee (sats)'
                      value={maxFee}
                      onChange={setMaxFee}
                    />
                    <Button onClick={applyParameters}>Apply and reload</Button>
                  </FlexCol>
                </Shadow>
                <WarningBox text={warningText} />
                <DelegateCard />
              </>
            )}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
