import { useContext, useEffect, useState } from 'react'
import Balance from '../../components/Balance'
import Error from '../../components/Error'
import TransactionsList from '../../components/TransactionsList'
import { WalletContext } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import LogoIcon from '../../icons/Logo'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { IframeContext } from '../../providers/iframe'
import Minimal from '../../components/Minimal'
import Text from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import Button from '../../components/Button'
import SendIcon from '../../icons/Send'
import ReceiveIcon from '../../icons/Receive'
import FlexRow from '../../components/FlexRow'
import { emptyRecvInfo, emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { EmptyList } from '../../components/Empty'
import { getAlert } from '../../lib/alerts'
import { InfoBox } from '../../components/AlertBox'
import { isRiga } from '../../lib/constants'

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { iframeUrl } = useContext(IframeContext)
  const { navigate } = useContext(NavigationContext)
  const { balance, txs } = useContext(WalletContext)

  const [alert, setAlert] = useState<string | undefined>()
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  useEffect(() => {
    getAlert().then(setAlert)
  }, [])

  const handleReceive = () => {
    setRecvInfo(emptyRecvInfo)
    navigate(Pages.ReceiveAmount)
  }

  const handleSend = () => {
    setSendInfo(emptySendInfo)
    navigate(Pages.SendForm)
  }

  if (iframeUrl)
    return (
      <Minimal>
        <FlexCol gap='0'>
          <Text capitalize color='dark50' tiny>
            Balance
          </Text>
          <Text small>{balance} SATS</Text>
        </FlexCol>
      </Minimal>
    )

  return (
    <Content>
      <Padded>
        <FlexCol>
          <FlexCol gap='0'>
            <LogoIcon small />
            <Balance amount={balance} />
            <Error error={error} text='Ark server unreachable' />
            <FlexRow padding='0 0 0.5rem 0'>
              <Button icon={<SendIcon />} label='Send' onClick={handleSend} />
              <Button icon={<ReceiveIcon />} label='Receive' onClick={handleReceive} disabled={isRiga} />
            </FlexRow>
            {alert && isRiga ? <InfoBox html={alert} /> : null}
          </FlexCol>
          {txs?.length === 0 ? (
            <div style={{ marginTop: '5rem', width: '100%' }}>
              <EmptyList text='No transactions yet' secondaryText='Make a transaction to get started.' />
            </div>
          ) : (
            <TransactionsList />
          )}
        </FlexCol>
      </Padded>
    </Content>
  )
}
