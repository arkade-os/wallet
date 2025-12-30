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
import { InfoBox } from '../../components/AlertBox'
import { psaMessage } from '../../lib/constants'
import { AnnouncementContext } from '../../providers/announcements'
import ReadonlyWallet from '../../components/ReadonlyWallet'

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { announcement } = useContext(AnnouncementContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { balance, txs, svcWallet, wallet } = useContext(WalletContext)
  const { nudge } = useContext(NudgeContext)

  const [error, setError] = useState(false)
  const isReadonly = !!wallet?.isReadonly

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

  return (
    <>
      {announcement}
      <Content>
        <Padded>
          <FlexCol>
            <FlexCol gap='0'>
              <LogoIcon small />
              <Balance amount={balance} />
              <ErrorMessage error={error} text='Ark server unreachable' />
              {!!isReadonly && <ReadonlyWallet />}
              <FlexRow padding='0 0 0.5rem 0'>
                {!isReadonly ? <Button main icon={<SendIcon />} label='Send' onClick={handleSend} /> : null}
                <Button main icon={<ReceiveIcon />} label='Receive' onClick={handleReceive} />
              </FlexRow>
              {nudge ? nudge : psaMessage ? <InfoBox html={psaMessage} /> : null}
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
    </>
  )
}
