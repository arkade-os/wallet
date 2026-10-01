import { useContext, useEffect, useState } from 'react'
import { AspContext } from '../../providers/asp'
import { aspErrorText } from '../../lib/asp'
import Header from './Header'
import Table, { TableData } from '../../components/Table'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { gitCommit } from '../../_gitCommit'
import { localizedDelta } from '../../lib/format'
import FlexCol from '../../components/FlexCol'
import ErrorMessage from '../../components/Error'
import { ConfigContext } from '@/providers/config'
import { useTranslation } from '../../providers/language'

export default function About() {
  const { aspInfo } = useContext(AspContext)
  const { config } = useContext(ConfigContext)
  const { t } = useTranslation()

  const [error, setError] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  const data: TableData = [
    [t('settings.serverUrl'), aspInfo.url],
    [t('settings.serverPubkey'), aspInfo.signerPubkey],
    [t('settings.forfeitAddress'), aspInfo.forfeitAddress],
    [t('common.network'), aspInfo.network],
    [t('settings.dust'), `${aspInfo.dust} sats`],
    [t('settings.sessionDuration'), localizedDelta(Number(aspInfo.sessionDuration), t)],
    [t('settings.boardingExitDelay'), localizedDelta(Number(aspInfo.boardingExitDelay), t)],
    [t('settings.unilateralExitDelay'), localizedDelta(Number(aspInfo.unilateralExitDelay), t)],
    [t('settings.walletMode'), config.walletMode],
    [t('settings.gitCommitHash'), gitCommit],
  ]

  return (
    <>
      <Header text={t('settings.about')} back />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage
              error={error}
              text={aspErrorText(aspInfo, t('init.arkadeServerUnreachable'), t('errors.outdatedWallet'))}
            />
            <Table data={data} variant='receipt' />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
