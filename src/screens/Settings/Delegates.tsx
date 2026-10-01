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
import { RestDelegateeProvider, type NetworkName } from '@arkade-os/sdk'
import { copyToClipboard } from '../../lib/clipboard'
import { useToast } from '../../components/Toast'
import { consoleError } from '../../lib/logs'
import { BackupContext } from '@/providers/backup'
import { checkDelegateeKeys, DelegationStatus, getDelegationStatus, isCurrentDelegation } from '../../lib/delegatee'

// Test the delegatee and verify that it works for this Ark server and emulator.
const testConnection = async (aspInfo: Pick<AspInfo, 'network' | 'signerPubkey'>): Promise<Delegate | undefined> => {
  const delegate = getDelegateForNetwork(aspInfo.network as NetworkName)
  if (!delegate) return undefined
  const info = await new RestDelegateeProvider(delegate.url).getInfo()
  checkDelegateeKeys(info, aspInfo)
  return { ...delegate, pubkey: info.delegatePubkey, emulatorPubkey: info.emulatorPubkey }
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

  const [status, setStatus] = useState<DelegationStatus>()

  const { network, signerPubkey } = aspInfo
  const delegation = isCurrentDelegation(config.delegation) ? config.delegation : undefined

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
    testConnection({ network, signerPubkey })
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
    if (delegation) {
      getDelegationStatus(networkDelegate.url, delegation)
        .then((s) => !cancelled && setStatus(s))
        .catch((error) => consoleError(error, 'Error fetching delegation status:'))
    }

    return () => {
      cancelled = true
    }
  }, [config.delegate, delegation, network, signerPubkey])

  if (!config.delegate) return null

  const handleCopy = async (value: string) => {
    await copyToClipboard(value)
    toast('Copied to clipboard')
  }

  // the service's next renewal when it holds coins, else the wallet's own
  const nextRenewal = status?.nextRenewal ?? wallet.nextRollover
  const nextRolloverText = nextRenewal ? `next renewal ${prettyAgo(nextRenewal)}` : 'No upcoming renewal'

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
          {delegation ? (
            <>
              <FlexRow onClick={() => handleCopy(delegation.renewal.address)}>
                <TextSecondary>renewal address: {prettyLongText(delegation.renewal.address, 14)}</TextSecondary>
              </FlexRow>
              <FlexRow onClick={() => handleCopy(delegation.boarding.address)}>
                <TextSecondary>boarding address: {prettyLongText(delegation.boarding.address, 14)}</TextSecondary>
              </FlexRow>
            </>
          ) : null}
          {status ? (
            <>
              <TextSecondary>delegation: {status.renewal.delegation.status}</TextSecondary>
              <TextSecondary>delegated balance: {prettyAmount(status.delegated)}</TextSecondary>
            </>
          ) : null}
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

  // toggle delegate
  const handleToggle = () => {
    const nextDelegate = !config.delegate
    // enabling again registers the watches and moves the VTXOs again
    backupAndUpdateConfig({
      ...config,
      delegate: nextDelegate,
      delegation: nextDelegate ? undefined : config.delegation,
    })
    // Full page reload ensures service worker and wallet are re-instantiated with the new delegatee setting.
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
