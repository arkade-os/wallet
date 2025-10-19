import { useContext, useEffect, useState } from 'react'
import Balance from '../../components/Balance'
import ErrorMessage from '../../components/Error'
import TransactionsList from '../../components/TransactionsList'
import { WalletContext } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import LogoIcon from '../../icons/Logo'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import Button from '../../components/Button'
import SendIcon from '../../icons/Send'
import ReceiveIcon from '../../icons/Receive'
import FlexRow from '../../components/FlexRow'
import { emptyRecvInfo, emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { NudgeContext } from '../../providers/nudge'
import { EmptyTxList } from '../../components/Empty'
import { getAlert } from '../../lib/alerts'
import { InfoBox } from '../../components/AlertBox'

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { nudge } = useContext(NudgeContext)
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

  return (
    <Content>
      <Padded>
        <FlexCol>
          <FlexCol gap='0'>
            <LogoIcon small />
            {alert ? (
              <FlexRow padding='2rem 0 0 0'>
                <InfoBox html={alert} />
              </FlexRow>
            ) : null}
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
