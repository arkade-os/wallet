import { ReactNode, useContext, useEffect, useRef, useState } from 'react'
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

const Passthrough = ({ children }: { children: ReactNode }) => <>{children}</>

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { announcement } = useContext(AnnouncementContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { isInitialLoad, navigate } = useContext(NavigationContext)
  const { balance, txs } = useContext(WalletContext)
  const { nudge } = useContext(NudgeContext)

  const [error, setError] = useState(false)
  const hasPlayedLoadIn = useRef(false)
  const shouldStagger = isInitialLoad && !hasPlayedLoadIn.current

  useEffect(() => {
    if (isInitialLoad) hasPlayedLoadIn.current = true
  }, [isInitialLoad])

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

  const Container = shouldStagger ? WalletStaggerContainer : Passthrough
  const Item = shouldStagger ? WalletStaggerChild : Passthrough

  return (
    <>
      {announcement}
      <Content>
        <Padded>
          <Container>
            <FlexCol>
              <FlexCol gap='0'>
                <Item>
                  <LogoIcon small />
                </Item>
                <Item>
                  <Balance amount={balance} />
                </Item>
                <Item>
                  <ErrorMessage error={error} text='Ark server unreachable' />
                </Item>
                <Item>
                  <FlexRow padding='0 0 0.5rem 0'>
                    <Button main icon={<SendIcon />} label='Send' onClick={handleSend} />
                    <Button main icon={<ReceiveIcon />} label='Receive' onClick={handleReceive} />
                  </FlexRow>
                </Item>
                <Item>{nudge ? nudge : psaMessage ? <InfoBox html={psaMessage} /> : null}</Item>
              </FlexCol>
              <Item>
                {txs?.length === 0 ? (
                  <div style={{ marginTop: '5rem', width: '100%' }}>
                    <EmptyTxList />
                  </div>
                ) : (
                  <TransactionsList />
                )}
              </Item>
            </FlexCol>
          </Container>
        </Padded>
      </Content>
    </>
  )
}
