import { useContext, useEffect, useState } from 'react'
import { AspContext } from '../../providers/asp'
import Header from './Header'
import Table from '../../components/Table'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { gitCommit } from '../../_gitCommit'
import { prettyDelta } from '../../lib/format'
import FlexCol from '../../components/FlexCol'
import ErrorMessage from '../../components/Error'

export default function About() {
  const { aspInfo } = useContext(AspContext)

  const [error, setError] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  console.log('aspInfo', aspInfo)
  const data = [
    ['Server URL', aspInfo.url],
    ['Server pubkey', aspInfo.signerPubkey],
    ['Forfeit address', aspInfo.forfeitAddress],
    ['Network', aspInfo.network],
    ['Dust', `${aspInfo.dust} SATS`],
    ['Round interval', prettyDelta(Number(aspInfo.roundInterval), true)],
    ['VTXO tree expiry', prettyDelta(Number(aspInfo.vtxoTreeExpiry), true)],
    ['Boarding exit delay', prettyDelta(Number(aspInfo.boardingExitDelay), true)],
    ['Unilateral exit delay', prettyDelta(Number(aspInfo.unilateralExitDelay), true)],
    ['Git commit hash', gitCommit],
  ]

  return (
    <>
      <Header text='About' back />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage error={error} text='Ark server unreachable' />
            <Table data={data} />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
