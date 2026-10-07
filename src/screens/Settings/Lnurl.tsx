import Header from './Header'
import { useContext, useEffect, useState } from 'react'
import Padded from '../../components/Padded'
import Toggle from '../../components/Toggle'
import Content from '../../components/Content'
import Table, { type TableData } from '../../components/Table'
import { TextSecondary } from '../../components/Text'
import { ConfigContext } from '../../providers/config'
import { WalletContext } from '../../providers/wallet'
import { BackupContext } from '@/providers/backup'
import { useTranslation } from '../../providers/language'
import { configuredLnurlServer, lnurlRailLimits, useLnurlRail } from '../../lib/receive/lnurlRail'
import { prettyNumber } from '../../lib/format'
import { consoleError } from '../../lib/logs'

export default function Lnurl() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { config } = useContext(ConfigContext)
  const { svcWallet } = useContext(WalletContext)
  const { t } = useTranslation()
  const server = configuredLnurlServer()
  const [addresses, setAddresses] = useState<{ arkade: string; boarding?: string }>()
  const [limits, setLimits] = useState<Awaited<ReturnType<typeof lnurlRailLimits>>>([])

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
    if (!rail.receiver) return
    let stale = false
    lnurlRailLimits(rail.receiver)
      .then((next) => {
        if (!stale) setLimits(next)
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

  const handleChange = async () => {
    backupAndUpdateConfig({ ...config, receiveViaLnurl: !config.receiveViaLnurl })
  }

  return (
    <>
      <Header text={t('settings.lightningAddress')} back />
      <Content>
        <Padded>
          <div className='settings-page'>
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
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
