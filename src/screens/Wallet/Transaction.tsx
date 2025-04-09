import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import Padded from '../../components/Padded'
import { WalletContext } from '../../providers/wallet'
import { FlowContext } from '../../providers/flow'
import { prettyAgo, prettyDate } from '../../lib/format'
import { defaultFee } from '../../lib/constants'
import Error from '../../components/Error'
import { extractError } from '../../lib/error'
import Header from '../../components/Header'
import Content from '../../components/Content'
import Info from '../../components/Info'
import FlexCol from '../../components/FlexCol'
import WaitingForRound from '../../components/WaitingForRound'
import { sleep } from '../../lib/sleep'
import Text, { TextSecondary } from '../../components/Text'
import Details, { DetailsProps } from '../../components/Details'
import VtxosIcon from '../../icons/Vtxos'
import CheckMarkIcon from '../../icons/CheckMark'

export default function Transaction() {
  const { txInfo, setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { settlePending } = useContext(WalletContext)

  const tx = txInfo
  const defaultButtonLabel = 'Settle Transaction'

  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [error, setError] = useState('')
  const [settleSuccess, setSettleSuccess] = useState(false)
  const [settling, setSettling] = useState(false)

  useEffect(() => {
    setButtonLabel(settling ? 'Settling...' : defaultButtonLabel)
  }, [settling])

  const handleBack = () => navigate(Pages.Wallet)

  const handleSettle = async () => {
    setError('')
    setSettling(true)
    try {
      await settlePending()
      await sleep(2000) // give time to read last message
      setSettleSuccess(true)
      if (tx) setTxInfo({ ...tx, pending: false, settled: true })
    } catch (err) {
      setError(extractError(err))
    }
    setSettling(false)
  }

  if (!tx) return <></>

  const details: DetailsProps = {
    direction: tx.type === 'sent' ? 'Sent' : 'Received',
    when: prettyAgo(tx.createdAt),
    date: prettyDate(tx.createdAt),
    satoshis: tx.type === 'sent' ? tx.amount - defaultFee : tx.amount,
    fees: tx.type === 'sent' ? defaultFee : 0,
    total: tx.amount,
  }

  return (
    <>
      <Header text='Transaction' back={handleBack} />
      <Content>
        {settling ? (
          <WaitingForRound settle />
        ) : (
          <Padded>
            <FlexCol>
              <Error error={Boolean(error)} text={error} />
              {tx.settled ? null : (
                <Info color='orange' icon={<VtxosIcon />} title='Pending'>
                  <Text wrap>Transaction pending. Funds will be non-reversible after settlement.</Text>
                </Info>
              )}
              {settleSuccess ? (
                <Info color='green' icon={<CheckMarkIcon small />} title='Success'>
                  <TextSecondary>Transaction settled successfully</TextSecondary>
                </Info>
              ) : null}
              <Details details={details} />
            </FlexCol>
          </Padded>
        )}
      </Content>
      {tx.settled ? null : (
        <ButtonsOnBottom>
          <Button onClick={handleSettle} label={buttonLabel} disabled={settling} />
        </ButtonsOnBottom>
      )}
    </>
  )
}
