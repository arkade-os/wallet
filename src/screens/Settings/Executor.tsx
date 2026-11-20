import Header from './Header'
import { localizedAgo, prettyLongText } from '../../lib/format'
import Toggle from '../../components/Toggle'
import Shadow from '../../components/Shadow'
import Padded from '../../components/Padded'
import SuccessIcon from '../../icons/Success'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import WarningBox from '../../components/Warning'
import Text, { TextSecondary } from '../../components/Text'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { WalletContext } from '../../providers/wallet'
import { OptionsContext } from '../../providers/options'
import { BackupContext } from '@/providers/backup'
import { useTranslation } from '../../providers/language'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { getExecutorUrlForNetwork } from '../../lib/constants'
import { consoleError } from '../../lib/logs'
import { useContext, useEffect, useState } from 'react'
import {
  DELEGATION_EXPIRES_KEY,
  DELEGATION_STATUS_KEY,
  ExecutorContractHandler,
  RestExecutorProvider,
  getNetwork,
  type Contract,
  type NetworkName,
  type ServiceWorkerWallet,
} from '@arkade-os/sdk'

/** A watch the Executor registered, as the SDK records it on the contract. */
type Watch = { status: string; expiresAt?: number }

/** The displayed boarding watch, and the renewal watch of the contract it boards into. */
type Watches = { boarding: Watch & { address: string }; renewal?: Watch }

const xOnly = (key: string) => (key.length === 66 ? key.slice(2) : key).toLowerCase()

const watchOf = (row: Contract): Watch => {
  const expiresAt = Number(row.metadata?.[DELEGATION_EXPIRES_KEY] ?? 0)
  return {
    status: String(row.metadata?.[DELEGATION_STATUS_KEY] ?? ''),
    expiresAt: expiresAt > 0 ? expiresAt : undefined,
  }
}

// The newest boarding contract: its renewal companion is not an onchain address. The SDK records no address
// on the row, so it derives from the contract's params. The renewal row is the same key's.
const readWatches = async (svcWallet: ServiceWorkerWallet, network: NetworkName): Promise<Watches | undefined> => {
  const cm = await svcWallet.getContractManager()
  const rows = await cm.getContracts({ type: 'executor' })
  const [boarding] = rows
    .filter((c) => c.params.template === 'boarding')
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  if (!boarding?.metadata) return undefined
  const renewal = rows
    .filter((c) => c.params.template === 'renewal' && c.params.owner === boarding.params.owner)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0]
  return {
    boarding: {
      ...watchOf(boarding),
      address: ExecutorContractHandler.createScript(boarding.params).onchainAddress(getNetwork(network)),
    },
    renewal: renewal?.metadata ? watchOf(renewal) : undefined,
  }
}

function WatchStatus({ label, watch }: { label: string; watch: Watch }) {
  const { t } = useTranslation()
  return (
    <>
      <TextSecondary>{label}</TextSecondary>
      {watch.expiresAt ? (
        <TextSecondary>{t('executor.watchExpires', { time: localizedAgo(watch.expiresAt, t) })}</TextSecondary>
      ) : null}
    </>
  )
}

function Hero() {
  const { t } = useTranslation()
  return (
    <FlexRow between>
      <FlexCol gap='0.5rem'>
        <Text bold>{t('executor.whatIsTheExecutor')}</Text>
        <Text small thin wrap>
          {t('executor.description')}
        </Text>
      </FlexCol>
      <div style={{ transform: 'translateX(30px) translateY(40px) rotate(13deg)', width: '140px' }}>
        <SuccessIcon />
      </div>
    </FlexRow>
  )
}

function Middot({ ok = true }: { ok?: boolean }) {
  const color = ok ? '#60B18A' : '#E27D60'
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect width='14' height='14' rx='7' fill={color} fillOpacity='0.1' />
      <circle cx='7' cy='7' r='3' fill={color} />
    </svg>
  )
}

function ExecutorCard({ url }: { url: string }) {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  const copyToClipboard = useCopyToClipboard()
  const { t } = useTranslation()

  const [active, setActive] = useState(false)
  const [cosignerPubkey, setCosignerPubkey] = useState('')
  const [watches, setWatches] = useState<Watches>()

  const { network, signerPubkey } = aspInfo

  // reachable, and serving this wallet's network and Ark server
  useEffect(() => {
    let cancelled = false
    setActive(false)
    new RestExecutorProvider(url)
      .getInfo()
      .then((info) => {
        if (cancelled) return
        setCosignerPubkey(info.cosignerPubkey)
        setActive(info.network === network && xOnly(info.serverPubkey) === xOnly(signerPubkey))
      })
      .catch((error) => !cancelled && consoleError(error, 'Error reaching the Executor:'))
    return () => {
      cancelled = true
    }
  }, [url, network, signerPubkey])

  useEffect(() => {
    if (!svcWallet) return
    let cancelled = false
    readWatches(svcWallet, network as NetworkName)
      .then((w) => !cancelled && setWatches(w))
      .catch((error) => !cancelled && consoleError(error, 'Error reading the Executor watch:'))
    return () => {
      cancelled = true
    }
  }, [svcWallet, network])

  return (
    <Shadow lighter fat testId='executor-card'>
      <FlexCol gap='0.5rem'>
        <FlexRow between>
          <Shadow flex>
            <Text tiny>{url}</Text>
          </Shadow>
          <FlexRow end>
            <Middot ok={active} />
            <Text tiny>{active ? t('executor.active') : t('executor.inactive')}</Text>
          </FlexRow>
        </FlexRow>
        <hr className='dashed' />
        <FlexCol gap='0.25rem'>
          {cosignerPubkey ? (
            <FlexRow onClick={() => copyToClipboard(cosignerPubkey)}>
              <TextSecondary>
                {t('executor.cosignerKeyLabel', { value: prettyLongText(cosignerPubkey, 14) })}
              </TextSecondary>
            </FlexRow>
          ) : null}
          {watches ? (
            <>
              <FlexRow onClick={() => copyToClipboard(watches.boarding.address)}>
                <TextSecondary>
                  {t('executor.boardingAddressLabel', { value: prettyLongText(watches.boarding.address, 14) })}
                </TextSecondary>
              </FlexRow>
              <WatchStatus
                label={t('executor.boardingWatchLabel', { status: watches.boarding.status })}
                watch={watches.boarding}
              />
              {watches.renewal ? (
                <WatchStatus
                  label={t('executor.renewalWatchLabel', { status: watches.renewal.status })}
                  watch={watches.renewal}
                />
              ) : null}
            </>
          ) : (
            <TextSecondary>{t('executor.notRegistered')}</TextSecondary>
          )}
        </FlexCol>
      </FlexCol>
    </Shadow>
  )
}

export default function Executor() {
  const { aspInfo } = useContext(AspContext)
  const { goBack } = useContext(OptionsContext)
  const { config } = useContext(ConfigContext)
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { t } = useTranslation()

  const url = getExecutorUrlForNetwork(aspInfo.network as NetworkName)

  const handleToggle = () => {
    backupAndUpdateConfig({ ...config, executor: !config.executor })
    // Full page reload ensures service worker and wallet are re-instantiated with the new Executor setting.
    window.location.reload()
  }

  return (
    <>
      <Header backFunc={goBack} text={t('settings.executor')} />
      <Content>
        <Padded>
          <FlexCol gap='1rem' padding='0 0 24px 0'>
            <Shadow fat purple>
              <Hero />
            </Shadow>
            {url ? (
              <>
                <Toggle
                  checked={config.executor}
                  onClick={handleToggle}
                  testId='toggle-executor'
                  text={t('executor.useExecutor')}
                  subtext={t('executor.useExecutorSubtext')}
                />
                <TextSecondary>{t('executor.walletReloadToApply')}</TextSecondary>
                <WarningBox text={t('executor.cannotSpend')} />
                {config.executor ? <ExecutorCard url={url} /> : null}
              </>
            ) : (
              <WarningBox text={t('executor.noExecutorFound')} />
            )}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
