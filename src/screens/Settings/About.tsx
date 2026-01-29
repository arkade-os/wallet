import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AspContext } from '../../providers/asp'
import Header from './Header'
import Table, { TableData } from '../../components/Table'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { gitCommit } from '../../_gitCommit'
import { prettyDelta } from '../../lib/format'
import FlexCol from '../../components/FlexCol'
import ErrorMessage from '../../components/Error'

export default function About() {
  const { t } = useTranslation()
  const { aspInfo } = useContext(AspContext)

  const [error, setError] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  const data: TableData = [
    [t('serverUrl'), aspInfo.url],
    [t('serverPubkey'), aspInfo.signerPubkey],
    [t('forfeitAddress'), aspInfo.forfeitAddress],
    [t('network'), aspInfo.network],
    [t('dust'), `${aspInfo.dust} SATS`],
    [t('sessionDuration'), prettyDelta(Number(aspInfo.sessionDuration), true)],
    [t('boardingExitDelay'), prettyDelta(Number(aspInfo.boardingExitDelay), true)],
    [t('unilateralExitDelay'), prettyDelta(Number(aspInfo.unilateralExitDelay), true)],
    [t('gitCommitHash'), gitCommit],
  ]

  return (
    <>
      <Header text={t('about')} back />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage error={error} text={t('arkServerUnreachable')} />
            <Table data={data} />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
