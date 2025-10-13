import { useContext, useEffect, useState } from 'react'
import Balance from '../../components/Balance'
import ErrorMessage from '../../components/Error'
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
import { NudgeContext } from '../../providers/nudge'
import { EmptyTxList } from '../../components/Empty'

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { iframeUrl } = useContext(IframeContext)
  const { navigate } = useContext(NavigationContext)
  const { nudge } = useContext(NudgeContext)
  const { balance, txs } = useContext(WalletContext)

  const [error, setError] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

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
            <ErrorMessage error={error} text='Ark server unreachable' />
            <FlexRow padding='0 0 0.5rem 0'>
              <Button icon={<SendIcon />} label='Send' onClick={handleSend} />
              <Button icon={<ReceiveIcon />} label='Receive' onClick={handleReceive} />
            </FlexRow>
            {nudge}
          </FlexCol>
          {txs?.length === 0 ? (
            <div style={{ marginTop: '5rem', width: '100%' }}>
              <EmptyTxList />
            </div>
          ) : (
            <TransactionsList />
          )}
        </FlexCol>
      </Padded>
    </Content>
  )
}
