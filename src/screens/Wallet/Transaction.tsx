import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Padded from '../../components/Padded'
import { WalletContext } from '../../providers/wallet'
import { FlowContext } from '../../providers/flow'
import { isBurn, isIssuance, prettyAgo, prettyCurrencyAssetAmount, prettyDate } from '../../lib/format'
import { defaultFee } from '../../lib/constants'
import ErrorMessage from '../../components/Error'
import { extractError } from '../../lib/error'
import Header from '../../components/Header'
import Content from '../../components/Content'
import Info from '../../components/Info'
import FlexCol from '../../components/FlexCol'
import WaitingForRound from '../../components/WaitingForRound'
import { sleep } from '../../lib/sleep'
import Text, { TextSecondary } from '../../components/Text'
import AssetAvatar from '../../components/AssetAvatar'
import Details, { DetailsProps } from '../../components/Details'
import TokenLogo, { accountTickerForAssetTicker, tokenLogoTickerForTicker } from '../../components/TokenLogo'
import VtxosIcon from '../../icons/Vtxos'
import CheckMarkIcon from '../../icons/CheckMark'
import { AspContext } from '../../providers/asp'
import Reminder from '../../components/Reminder'
import { LimitsContext } from '../../providers/limits'
import { getInputsToSettle } from '../../lib/asp'

export default function Transaction() {
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { txInfo } = useContext(FlowContext)
  const { aspInfo, calcBestMarketHour } = useContext(AspContext)
  const { assetMetadataCache, settlePreconfirmed, vtxos, vtxoManager, wallet, svcWallet } = useContext(WalletContext)

  const tx = txInfo
  const issuanceTx = tx ? isIssuance(tx) : false
  const burnTx = tx ? isBurn(tx) : false
  const boardingTx = Boolean(tx?.boardingTxid)
  const defaultButtonLabel = 'Settle transaction'
  const boardingExitDelay = Number(aspInfo?.boardingExitDelay || 0)
  const unconfirmedBoardingTx = boardingTx && !tx?.createdAt
  const expiredBoardingTx =
    !tx?.settled && boardingTx && tx?.createdAt && Date.now() / 1000 - tx?.createdAt > boardingExitDelay

  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [amountAboveDust, setAmountAboveDust] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [hasInputsToSettle, setHasInputsToSettle] = useState(false)
  const [reminderIsOpen, setReminderIsOpen] = useState(false)
  const [settleSuccess, setSettleSuccess] = useState(false)
  const [settling, setSettling] = useState(false)
  const [startTime, setStartTime] = useState(0)

  useEffect(() => {
    setButtonLabel(settling ? 'Settling...' : defaultButtonLabel)
  }, [settling, defaultButtonLabel])

  useEffect(() => {
    if (!tx) return
    const bestMarketHour = calcBestMarketHour(wallet.nextRollover)
    if (bestMarketHour) {
      setStartTime(Number(bestMarketHour.nextStartTime))
      setDuration(Number(bestMarketHour.duration))
    } else {
      setStartTime(wallet.nextRollover)
      setDuration(0)
    }
  }, [wallet.nextRollover])

  useEffect(() => {
    if (!aspInfo || !svcWallet || !vtxoManager) return
    getInputsToSettle(svcWallet, vtxoManager, wallet.thresholdMs).then(({ inputs }) => {
      setHasInputsToSettle(inputs.length > 0)
      const totalAmount = inputs.reduce((a, v) => a + v.value, 0) || 0
      setAmountAboveDust(totalAmount > aspInfo.dust)
    })
  }, [aspInfo, vtxos, svcWallet, vtxoManager, wallet.thresholdMs])

  const handleSettle = async () => {
    setError('')
    setSettling(true)
    try {
      await settlePreconfirmed()
      await sleep(2000) // give time to read last message
      setSettleSuccess(true)
    } catch (err) {
      setError(extractError(err))
    }
    setSettling(false)
  }

  if (!tx) return <></>

  const status = expiredBoardingTx
    ? 'Expired'
    : unconfirmedBoardingTx
      ? 'Unconfirmed'
      : boardingTx && tx.preconfirmed
        ? 'Pending boarding'
        : settleSuccess || tx.settled
          ? 'Settled'
          : 'Preconfirmed'

  const details: DetailsProps = {
    direction: issuanceTx ? 'Issuance' : burnTx ? 'Burn' : tx.type === 'sent' ? 'Sent' : 'Received',
    when: tx.createdAt ? prettyAgo(tx.createdAt) : !unconfirmedBoardingTx ? 'Unknown' : 'Unconfirmed',
    date: tx.createdAt ? prettyDate(tx.createdAt) : !unconfirmedBoardingTx ? 'Unknown' : 'Unconfirmed',
    status,
    type: boardingTx ? 'Boarding' : 'Offchain',
    txid: tx.boardingTxid || tx.redeemTxid || tx.roundTxid || '',
    isOffchainTx: !tx.boardingTxid && (Boolean(tx.redeemTxid) || Boolean(tx.roundTxid)),
    assetId: tx.assets?.[0]?.assetId,
    wallet: wallet,
    satoshis: tx.type === 'sent' ? tx.amount - defaultFee : tx.amount,
    fees: tx.type === 'sent' ? defaultFee : 0,
    total: tx.amount,
  }

  const Body = () => (
    <Content>
      <Padded>
        <FlexCol>
          <ErrorMessage error={Boolean(error)} text={error} />
          {expiredBoardingTx ? (
            <Info color='red' icon={<VtxosIcon />} title='Expired'>
              <Text wrap>Boarding transaction expired.</Text>
            </Info>
          ) : unconfirmedBoardingTx ? (
            <Info color='orange' icon={<VtxosIcon />} title='Unconfirmed'>
              <Text wrap>Onchain transaction unconfirmed. Please wait for confirmation.</Text>
            </Info>
          ) : tx.preconfirmed && tx.boardingTxid ? (
            <Info color='orange' icon={<VtxosIcon />} title='Pending boarding'>
              <Text wrap>Onboard transaction confirmed on-chain.</Text>
            </Info>
          ) : null}
          {settleSuccess ? (
            <Info color='green' icon={<CheckMarkIcon small />} title='Success'>
              <TextSecondary>Transaction settled successfully</TextSecondary>
            </Info>
          ) : null}
          {tx.assets?.length ? (
            <div className='transaction-detail__assets'>
              {tx.assets.map((a) => {
                const meta = assetMetadataCache.get(a.assetId)?.metadata
                const ticker = meta?.ticker
                const name = meta?.name
                const icon = meta?.icon
                const decimals = meta?.decimals ?? 8
                const accountTicker = accountTickerForAssetTicker(ticker)
                const label = accountTicker ?? name ?? `${a.assetId.slice(0, 8)}...`
                const tokenLogoTicker = tokenLogoTickerForTicker(accountTicker ?? ticker)
                return (
                  <div key={a.assetId} className='transaction-detail-asset'>
                    <span className='transaction-detail-asset__logo'>
                      {tokenLogoTicker ? (
                        <TokenLogo ticker={tokenLogoTicker} />
                      ) : (
                        <AssetAvatar icon={icon} ticker={ticker} size={36} assetId={a.assetId} clickable />
                      )}
                    </span>
                    <div className='transaction-detail-asset__copy'>
                      <span className='transaction-detail-asset__amount'>
                        {prettyCurrencyAssetAmount(BigInt(a.amount), decimals, accountTicker ?? ticker)} {label}
                      </span>
                      {name && ticker && !accountTicker ? (
                        <span className='transaction-detail-asset__name'>{name}</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
          <div className='transaction-detail'>
            <Details details={details} variant='receipt' />
          </div>
        </FlexCol>
      </Padded>
    </Content>
  )

  // if server defines that UTXO transactions are not allowed,
  // don't allow settlement since it is a UTXO transaction.
  const showSettleButtons =
    status === 'Preconfirmed' &&
    hasInputsToSettle &&
    utxoTxsAllowed() &&
    vtxoTxsAllowed() &&
    amountAboveDust &&
    !settling

  const Buttons = () =>
    showSettleButtons ? (
      <>
        <ButtonsOnBottom>
          <Button onClick={handleSettle} label={buttonLabel} disabled={settling} />
          <Button onClick={() => setReminderIsOpen(true)} label='Add reminder' secondary />
        </ButtonsOnBottom>
        <Reminder
          isOpen={reminderIsOpen}
          callback={() => setReminderIsOpen(false)}
          duration={duration}
          name='Settle transaction'
          startTime={startTime}
        />
      </>
    ) : null

  return (
    <>
      <Header text='Transaction' back />
      {settling ? <WaitingForRound settle /> : <Body />}
      <Buttons />
    </>
  )
}
