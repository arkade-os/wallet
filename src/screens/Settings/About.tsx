import { useContext } from 'react'
import { AspContext } from '../../providers/asp'
import Header from './Header'
import Table from '../../components/Table'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { gitCommit } from '../../_gitCommit'
import { prettyDelta } from '../../lib/format'

export default function About() {
  const { aspInfo } = useContext(AspContext)

  const data = [
    ['Dust', `${aspInfo.dust} sats`],
    ['Forfeit address', aspInfo.forfeitAddress],
    ['Network', aspInfo.network],
    ['Batch interval', `${aspInfo.roundInterval} secs`],
    ['VTXO tree expiry', prettyDelta(aspInfo.vtxoTreeExpiry, true)],
    ['Server pubkey', aspInfo.pubkey],
    ['Server URL', aspInfo.url],
    ['Unilateral exit delay', `${aspInfo.unilateralExitDelay} secs`],
    ['Git commit hash', gitCommit],
  ]

  return (
    <>
      <Header text='About' back />
      <Content>
        <Padded>
          <Table data={data} />
        </Padded>
      </Content>
    </>
  )
}
