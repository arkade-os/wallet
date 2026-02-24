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
import { WalletStaggerContainer, WalletStaggerChild } from '../../components/WalletLoadIn'

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { announcement } = useContext(AnnouncementContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { isInitialLoad, navigate } = useContext(NavigationContext)
  const { balance, txs } = useContext(WalletContext)
  const { nudge } = useContext(NudgeContext)

  const [error, setError] = useState(false)
  const shouldStagger = isInitialLoad

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
          <WalletStaggerContainer animate={shouldStagger}>
            <FlexCol>
              <FlexCol gap='0'>
                <WalletStaggerChild animate={shouldStagger}>
                  <LogoIcon small />
                </WalletStaggerChild>
                <WalletStaggerChild animate={shouldStagger}>
                  <Balance amount={balance} />
                </WalletStaggerChild>
                <WalletStaggerChild animate={shouldStagger}>
                  <ErrorMessage error={error} text='Ark server unreachable' />
                </WalletStaggerChild>
                <WalletStaggerChild animate={shouldStagger}>
                  <FlexRow padding='0 0 0.5rem 0'>
                    <Button main icon={<SendIcon />} label='Send' onClick={handleSend} />
                    <Button main icon={<ReceiveIcon />} label='Receive' onClick={handleReceive} />
                  </FlexRow>
                </WalletStaggerChild>
                <WalletStaggerChild animate={shouldStagger}>
                  {nudge ? nudge : psaMessage ? <InfoBox html={psaMessage} /> : null}
                </WalletStaggerChild>
              </FlexCol>
              {txs?.length === 0 ? (
                <WalletStaggerChild animate={shouldStagger}>
                  <div style={{ marginTop: '5rem', width: '100%' }}>
                    <EmptyTxList />
                  </div>
                </WalletStaggerChild>
              ) : (
                <TransactionsList ItemWrapper={shouldStagger ? WalletStaggerChild : undefined} />
              )}
            </FlexCol>
          </WalletStaggerContainer>
        </Padded>
      </Content>
    </>
  )
}
