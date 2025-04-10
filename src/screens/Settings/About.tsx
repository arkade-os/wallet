import { useContext, useEffect, useState } from 'react'
import { AspContext } from '../../providers/asp'
import Header from './Header'
import Table from '../../components/Table'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { WalletContext } from '../../providers/wallet'
import { gitCommit } from '../../_gitCommit'
import { prettyDelta } from '../../lib/format'
import FlexCol from '../../components/FlexCol'
import Error from '../../components/Error'

export default function About() {
  const { aspInfo } = useContext(AspContext)
  const { wallet } = useContext(WalletContext)

  const [error, setError] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  const data = [
    ['Dust', `${aspInfo.dust} SATS`],
    ['Forfeit address', aspInfo.forfeitAddress],
    ['Network', aspInfo.network],
    ['Round interval', `${aspInfo.roundInterval} secs`],
    ['VTXO tree expiry', prettyDelta(aspInfo.vtxoTreeExpiry, true)],
    ['Server pubkey', aspInfo.pubkey],
    ['Server URL', aspInfo.url],
    ['Unilateral exit delay', `${aspInfo.unilateralExitDelay} secs`],
    ['WASM version', wallet.wasmVersion],
    ['Git commit hash', gitCommit],
  ]

  return (
    <>
      <Header text='About' back />
      <Content>
        <Padded>
          <FlexCol>
            <Error error={error} text='Ark server unreachable' />
            <Table data={data} />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
