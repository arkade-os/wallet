import { useContext, useEffect, useState } from 'react'
import { OperatorContext } from '../../providers/operator'
import { operatorErrorText } from '../../lib/operator'
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
  const { operatorInfo } = useContext(OperatorContext)
  const { config } = useContext(ConfigContext)
  const { t } = useTranslation()

  const [error, setError] = useState(false)

  useEffect(() => {
    setError(operatorInfo.unreachable)
  }, [operatorInfo.unreachable])

  const data: TableData = [
    [t('settings.serverUrl'), operatorInfo.url],
    [t('settings.serverPubkey'), operatorInfo.signerPubkey],
    [t('settings.forfeitAddress'), operatorInfo.forfeitAddress],
    [t('common.network'), operatorInfo.network],
    [t('settings.dust'), `${operatorInfo.dust} sats`],
    [t('settings.sessionDuration'), localizedDelta(Number(operatorInfo.sessionDuration), t)],
    [t('settings.boardingExitDelay'), localizedDelta(Number(operatorInfo.boardingExitDelay), t)],
    [t('settings.unilateralExitDelay'), localizedDelta(Number(operatorInfo.unilateralExitDelay), t)],
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
              text={operatorErrorText(operatorInfo, t('init.arkadeServerUnreachable'), t('errors.outdatedWallet'))}
            />
            <Table data={data} variant='receipt' />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
