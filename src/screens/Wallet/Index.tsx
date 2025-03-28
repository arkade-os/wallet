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

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { iframeUrl } = useContext(IframeContext)
  const { navigate } = useContext(NavigationContext)
  const { reloadWallet, wallet } = useContext(WalletContext)

  const [error, setError] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  const handleReceive = () => {
    reloadWallet()
    setRecvInfo(emptyRecvInfo)
    navigate(Pages.ReceiveAmount)
  }

  const handleSend = () => {
    reloadWallet()
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
          <Text small>{wallet.balance} sats</Text>
        </FlexCol>
      </Minimal>
    )

  return (
    <Content>
      <Padded>
        <LogoIcon />
        <Balance amount={wallet.balance} />
        <Error error={error} text='Ark server unreachable' />
        <FlexRow>
          <Button icon={<SendIcon />} label='Send' onClick={handleSend} />
          <Button icon={<ReceiveIcon />} label='Receive' onClick={handleReceive} />
        </FlexRow>
        <TransactionsList />
      </Padded>
    </Content>
  )
}
