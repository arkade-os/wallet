import Header from './Header'
import { useContext, useEffect, useState } from 'react'
import Padded from '../../components/Padded'
import Toggle from '../../components/Toggle'
import Select from '../../components/Select'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import Table, { type TableData } from '../../components/Table'
import Text, { TextSecondary } from '../../components/Text'
import Button from '../../components/Button'
import SheetModal from '../../components/SheetModal'
import { ConfigContext } from '../../providers/config'
import { WalletContext } from '../../providers/wallet'
import { BackupContext } from '@/providers/backup'
import { useTranslation } from '../../providers/language'
import {
  configuredLnurlServer,
  lnurlRailLimits,
  useLnurlRail,
  type OnboardingChoice,
} from '../../lib/receive/lnurlRail'
import { lnurlTokenRails, type LnurlTokenRail } from '../../lib/receive/lnurlTokenRails'
import { prettyNumber } from '../../lib/format'
import { consoleError } from '../../lib/logs'
import { extractError } from '../../lib/error'
import ErrorMessage from '../../components/Error'
import { NameForm } from '../Wallet/Receive/LnurlRail'
import type { AddressListEntry } from '@arkade-os/lnurl-client'
import type { NameOptions } from '@arkade-os/lnurl-client/arkade'

// Kept in announcementsSeen: the explainer is a one-time notice, shown before the first opt-in only.
export const TOKEN_EXPLAINER = 'token rails explainer'

export default function Lnurl() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { config } = useContext(ConfigContext)
  const { svcWallet } = useContext(WalletContext)
  const { t } = useTranslation()
  const server = configuredLnurlServer()
  const [addresses, setAddresses] = useState<{ arkade: string; boarding?: string }>()
  const [limits, setLimits] = useState<ReturnType<typeof lnurlRailLimits>>([])
  const [limitsError, setLimitsError] = useState('')
  const [tokens, setTokens] = useState<LnurlTokenRail[]>([])
  const [explaining, setExplaining] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [owned, setOwned] = useState<AddressListEntry[]>([])
  const [addressesError, setAddressesError] = useState('')

  useEffect(() => {
    if (!svcWallet) return
    setAddressesError('')
    Promise.all([svcWallet.getAddress(), svcWallet.getBoardingAddress().catch(() => undefined)])
      .then(([arkade, boarding]) => setAddresses({ arkade, boarding }))
      .catch((err) => {
        consoleError(err)
        setAddressesError(extractError(err))
      })
  }, [svcWallet])

  const rail = useLnurlRail({
    enabled: Boolean(server),
    identity: svcWallet?.identity,
    arkadeAddress: addresses?.arkade,
    boardingAddress: addresses?.boarding,
    primary: config.lnurlPrimary,
  })

  useEffect(() => {
    setLimits([])
    setLimitsError('')
    setTokens([])
    setOwned([])
    if (!rail.receiver) return
    let stale = false
    rail.receiver
      .payRequest()
      .then((payRequest) => {
        if (stale) return
        setLimits(lnurlRailLimits(payRequest))
        setTokens(lnurlTokenRails(payRequest))
      })
      .catch((err) => {
        consoleError(err, 'lnurl payRequest failed')
        if (!stale) setLimitsError(extractError(err))
      })
    rail
      .addresses()
      .then((all) => !stale && setOwned(all))
      .catch(consoleError)
    return () => {
      stale = true
    }
  }, [rail.receiver])

  // A claim or rename that lands changes the address; a refused one leaves the sheet open on its reason.
  useEffect(() => setClaiming(false), [rail.receiver?.lightningAddress])

  const railLabels: Record<string, string> = {
    lightning: t('receive.methodLightning'),
    arkade: t('receive.methodArkade'),
    onchain: t('receive.methodBitcoin'),
  }
  // The wallet-id LNURL (sessionLnurl) is an address in its own right, beside any names.
  // The server's list may lag a registration made this second; the held receiver is always one of them.
  const listed = owned.length
    ? owned.map((a) => ({ address: a.lightningAddress, lnurl: a.sessionLnurl }))
    : rail.receiver
      ? [{ address: rail.receiver.lightningAddress ?? null, lnurl: rail.receiver.lnurl }]
      : []
  const yours: TableData = [
    ...listed.flatMap(
      ({ address, lnurl }): TableData => [
        ...(lnurl ? [['LNURL', lnurl] as [string, string]] : []),
        ...(address ? [[t('settings.lightningAddress'), address] as [string, string]] : []),
      ],
    ),
    ...(server ? [[t('settings.lnurlServer'), server.domain] as [string, string]] : []),
  ]
  const named = Boolean(rail.receiver?.lightningAddress)
  // A wallet that holds a name may still choose another, but never gets a random one.
  const namingChoices = named ? [] : rail.choices.filter((c) => c !== 'session' && !(c === 'random' && rail.ownsName))
  const naming = namingChoices.length > 0 && rail.status !== 'failed'
  // A named wallet can still redeem a code: it claims a further address, as upgrade only renames a nameless one.
  const sheetChoices: OnboardingChoice[] = named ? ['admin'] : namingChoices.filter((c) => c !== 'random')
  const name = async (opts: NameOptions) => {
    if (rail.receiver && !named) return rail.upgrade(opts)
    const claimed = await rail.claim(opts)
    // A further address is what the user just asked for, so it becomes the one the wallet receives on.
    if (claimed && named) backupAndUpdateConfig({ ...config, lnurlPrimary: claimed.handle })
  }
  const active = owned.filter((a) => a.status === 'active')
  const sendable: TableData = limits.map(({ type, min, max }) => [
    railLabels[type] ?? type,
    `${prettyNumber(min, 0)} – ${prettyNumber(max, 0)} sats`,
  ])
  const units = [...new Set(tokens.map((o) => o.unit.code))].join('/')
  const providers = [...new Set(tokens.map((o) => o.provider))].join(', ')

  const handleTokensChange = () => {
    if (!config.receiveViaTokens && !config.announcementsSeen.includes(TOKEN_EXPLAINER)) return setExplaining(true)
    backupAndUpdateConfig({ ...config, receiveViaTokens: !config.receiveViaTokens })
  }

  const acceptTokens = () => {
    setExplaining(false)
    backupAndUpdateConfig({
      ...config,
      receiveViaTokens: true,
      announcementsSeen: [...config.announcementsSeen, TOKEN_EXPLAINER],
    })
  }

  return (
    <>
      <Header text={t('settings.lightningAddress')} back />
      <Content>
        <Padded>
          <FlexCol gap='1.25rem' className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>{t('settings.lnurlYours')}</p>
              {rail.status === 'ready' ? (
                <>
                  <Table data={yours} variant='receipt' />
                  {named ? (
                    <TextSecondary>
                      <a
                        href='#'
                        onClick={(event) => {
                          event.preventDefault()
                          setClaiming(true)
                        }}
                      >
                        {t('receive.haveClaimCode')}
                      </a>
                    </TextSecondary>
                  ) : null}
                  {namingChoices.length ? null : <ErrorMessage error={Boolean(rail.error)} text={rail.error} />}
                </>
              ) : (
                <TextSecondary>
                  {rail.status === 'onboarding'
                    ? t('settings.lnurlNone')
                    : rail.status === 'failed'
                      ? rail.error
                      : addressesError || t('common.loading')}
                </TextSecondary>
              )}
            </section>
            {/* Hidden under the claim sheet: Select takes arrow keys page-wide, which the code field would feed it. */}
            {active.length > 1 && !claiming ? (
              <section className='settings-section'>
                <p className='settings-section-label'>{t('settings.lnurlPrimary')}</p>
                <Select
                  options={active.map((a) => a.handle)}
                  labels={active.map((a) => a.lightningAddress ?? 'LNURL')}
                  selected={rail.receiver?.handle ?? ''}
                  onChange={(handle) => backupAndUpdateConfig({ ...config, lnurlPrimary: handle })}
                />
              </section>
            ) : null}
            {naming ? (
              <section className='settings-section'>
                <p className='settings-section-label'>{t('settings.lnurlAddName')}</p>
                {namingChoices.some((c) => c !== 'random') ? (
                  <Button label={t('receive.claimName')} disabled={rail.busy} onClick={() => setClaiming(true)} />
                ) : null}
                {namingChoices.includes('random') ? (
                  <Button label={t('receive.pickForMe')} disabled={rail.busy} onClick={() => name({})} secondary />
                ) : null}
                <ErrorMessage error={Boolean(rail.error)} text={rail.error} />
              </section>
            ) : null}
            {sendable.length || limitsError ? (
              <section className='settings-section'>
                <p className='settings-section-label'>{t('settings.lnurlLimits')}</p>
                {sendable.length ? <Table data={sendable} variant='receipt' /> : null}
                <ErrorMessage error={Boolean(limitsError)} text={limitsError} />
              </section>
            ) : null}
            {tokens.length > 0 ? (
              <section className='settings-section'>
                <p className='settings-section-label'>{t('settings.receive')}</p>
                <Toggle
                  checked={config.receiveViaTokens}
                  onClick={handleTokensChange}
                  text={t('settings.receiveViaTokens')}
                  subtext={t('settings.receiveViaTokensSubtext', { units })}
                  testId='receive-via-tokens'
                />
              </section>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>

      <SheetModal
        isOpen={claiming ? sheetChoices.length > 0 && rail.status !== 'failed' : false}
        onClose={() => setClaiming(false)}
      >
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            {t('receive.claimName')}
          </Text>
          <NameForm choices={sheetChoices} busy={rail.busy} onName={name} />
          <ErrorMessage error={Boolean(rail.error)} text={rail.error} />
        </FlexCol>
      </SheetModal>

      <SheetModal isOpen={explaining} onClose={() => setExplaining(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            {t('settings.tokenExplainerTitle')}
          </Text>
          <TextSecondary>{t('settings.tokenExplainer', { provider: providers })}</TextSecondary>
          <Button label={t('settings.tokenExplainerConfirm')} onClick={acceptTokens} />
        </FlexCol>
      </SheetModal>
    </>
  )
}
