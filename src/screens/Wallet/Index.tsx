import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

export default function Wallet() {
  const { t } = useTranslation()
  const { aspInfo } = useContext(AspContext)
  const { announcement } = useContext(AnnouncementContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { balance, txs } = useContext(WalletContext)
  const { nudge } = useContext(NudgeContext)

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

  return (
    <>
      {announcement}
      <Content>
        <Padded>
          <FlexCol>
            <FlexCol gap='0'>
              <LogoIcon small />
              <Balance amount={balance} />
              <ErrorMessage error={error} text={t('arkServerUnreachable')} />
              <FlexRow padding='0 0 0.5rem 0'>
                <Button main icon={<SendIcon />} label={t('send')} onClick={handleSend} />
                <Button main icon={<ReceiveIcon />} label={t('receive')} onClick={handleReceive} />
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
