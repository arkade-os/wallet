import { useContext, useEffect, useState } from 'react'
import { AspContext } from '../../providers/asp'
import { aspErrorText } from '../../lib/asp'
import Header from './Header'
import Table, { TableData } from '../../components/Table'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { gitCommit } from '../../_gitCommit'
import { prettyDelta } from '../../lib/format'
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
    ['Network', aspInfo.network],
    [t('settings.dust'), `${aspInfo.dust} sats`],
    [t('settings.sessionDuration'), prettyDelta(Number(aspInfo.sessionDuration), true)],
    [t('settings.boardingExitDelay'), prettyDelta(Number(aspInfo.boardingExitDelay), true)],
    [t('settings.unilateralExitDelay'), prettyDelta(Number(aspInfo.unilateralExitDelay), true)],
    [t('settings.walletMode'), config.walletMode],
    [t('settings.gitCommitHash'), gitCommit],
  ]

  return (
    <>
      <Header text={t('settings.about')} back />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage error={error} text={aspErrorText(aspInfo, t('init.arkadeServerUnreachable'))} />
            <Table data={data} variant='receipt' />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
