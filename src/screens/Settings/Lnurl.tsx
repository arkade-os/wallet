import Header from './Header'
import { useContext, useEffect, useState } from 'react'
import Padded from '../../components/Padded'
import Toggle from '../../components/Toggle'
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
import { configuredLnurlServer, lnurlRailLimits, useLnurlRail } from '../../lib/receive/lnurlRail'
import { lnurlTokenRails, type LnurlTokenRail } from '../../lib/receive/lnurlTokenRails'
import { prettyNumber } from '../../lib/format'
import { consoleError } from '../../lib/logs'

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
  const [tokens, setTokens] = useState<LnurlTokenRail[]>([])
  const [explaining, setExplaining] = useState(false)

  useEffect(() => {
    if (!svcWallet) return
    Promise.all([svcWallet.getAddress(), svcWallet.getBoardingAddress().catch(() => undefined)])
      .then(([arkade, boarding]) => setAddresses({ arkade, boarding }))
      .catch(consoleError)
  }, [svcWallet])

  const rail = useLnurlRail({
    enabled: Boolean(server),
    identity: svcWallet?.identity,
    arkadeAddress: addresses?.arkade,
    boardingAddress: addresses?.boarding,
  })

  useEffect(() => {
    setLimits([])
    setTokens([])
    if (!rail.receiver) return
    let stale = false
    rail.receiver
      .payRequest()
      .then((payRequest) => {
        if (stale) return
        setLimits(lnurlRailLimits(payRequest))
        setTokens(lnurlTokenRails(payRequest))
      })
      .catch(consoleError)
    return () => {
      stale = true
    }
  }, [rail.receiver])

  const railLabels: Record<string, string> = {
    lightning: t('receive.methodLightning'),
    arkade: t('receive.methodArkade'),
    onchain: t('receive.methodBitcoin'),
  }
  const yours: TableData = [
    [t('settings.lightningAddress'), rail.receiver?.lightningAddress],
    ['LNURL', rail.receiver?.lnurl],
    [t('settings.lnurlServer'), server?.domain],
  ]
  const sendable: TableData = limits.map(({ type, min, max }) => [
    railLabels[type] ?? type,
    `${prettyNumber(min, 0)} – ${prettyNumber(max, 0)} sats`,
  ])
  const units = [...new Set(tokens.map((o) => o.unit.code))].join('/')
  const providers = [...new Set(tokens.map((o) => o.provider))].join(', ')

  const handleChange = async () => {
    backupAndUpdateConfig({ ...config, receiveViaLnurl: !config.receiveViaLnurl })
  }

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
                <Table data={yours} variant='receipt' />
              ) : (
                <TextSecondary>
                  {rail.status === 'onboarding'
                    ? t('settings.lnurlNone')
                    : rail.status === 'failed'
                      ? rail.error
                      : t('common.loading')}
                </TextSecondary>
              )}
            </section>
            {sendable.length ? (
              <section className='settings-section'>
                <p className='settings-section-label'>{t('settings.lnurlLimits')}</p>
                <Table data={sendable} variant='receipt' />
              </section>
            ) : null}
            <section className='settings-section'>
              <p className='settings-section-label'>{t('settings.receive')}</p>
              <Toggle
                checked={config.receiveViaLnurl}
                onClick={handleChange}
                text={t('settings.receiveViaLnurl')}
                subtext={t('settings.receiveViaLnurlSubtext')}
              />
              {config.receiveViaLnurl && tokens.length > 0 ? (
                <Toggle
                  checked={config.receiveViaTokens}
                  onClick={handleTokensChange}
                  text={t('settings.receiveViaTokens')}
                  subtext={t('settings.receiveViaTokensSubtext', { units })}
                  testId='receive-via-tokens'
                />
              ) : null}
            </section>
          </FlexCol>
        </Padded>
      </Content>

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
