import { useContext, useEffect, useState } from 'react'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Padded from '../../../components/Padded'
import FlexCol from '../../../components/FlexCol'
import Text, { TextSecondary } from '../../../components/Text'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import ErrorMessage from '../../../components/Error'
import WarningBox from '../../../components/Warning'
import QrCode from '../../../components/QrCode'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { CashContext } from '../../../providers/cash'
import { WalletContext } from '../../../providers/wallet'
import { cashStatusLabel } from '../../../lib/arkadeCashTransfer'
import { nfcSupported, writeCashToNfc } from '../../../lib/arkadeCashNfc'
import { shareData } from '../../../lib/share'
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard'
import { extractError } from '../../../lib/error'

export default function CashDetail() {
  const { voucher: record, voucherId } = useContext(CashContext)
  const { refreshCash, cashRecords } = useContext(WalletContext)
  const { pendingToken, clearVoucher } = useContext(CashContext)
  const { navigate } = useContext(NavigationContext)
  const copy = useCopyToClipboard()
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState('')
  // Clear only on unmount: keying this off record.id would wipe the selection
  // while the list is still loading the record the id points at.
  useEffect(() => {
    pendingToken.current = undefined
    return () => clearVoucher()
  }, [])
  useEffect(() => {
    setReveal(false)
  }, [voucherId])
  if (!record && cashRecords?.length === 0)
    return (
      <>
        <Header text='Cash voucher' back={() => navigate(Pages.Cash)} />
        <Content>
          <Padded>
            <TextSecondary>Loading voucher…</TextSecondary>
          </Padded>
        </Content>
      </>
    )
  if (!record)
    return (
      <>
        <Header text='Cash voucher' back={() => navigate(Pages.Cash)} />
        <Content>
          <Padded>
            <TextSecondary>Voucher not found</TextSecondary>
          </Padded>
        </Content>
      </>
    )
  const available = record.token && (record.status === 'claimed' || record.status === 'available')
  return (
    <>
      <Header text='Cash voucher' back={() => navigate(Pages.Cash)} />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <Text heading bigger>
              {record.amount.toLocaleString()} sats
            </Text>
            <Text bold>{cashStatusLabel(record.status, record.action, record.token)}</Text>
            <TextSecondary>
              {record.action === 'issued' ? 'You issued this voucher' : 'You claimed this voucher'}
            </TextSecondary>
            {!record.token && record.action === 'issued' && (
              <TextSecondary>
                The recipient has claimed this voucher. The secret is no longer stored on this device.
              </TextSecondary>
            )}
            {!!record.token && (
              <Button
                secondary
                label={reveal ? 'Hide voucher' : 'View voucher'}
                onClick={() => setReveal((value) => !value)}
              />
            )}
            {!!reveal && (
              <FlexCol gap='1rem'>
                {!!available ? (
                  <FlexCol gap='1rem'>
                    <QrCode value={record.token!} />
                    <WarningBox text='Anyone who sees this code can claim or reclaim the voucher. Do not show it in public.' />
                    <Text small wrap>
                      {record.token}
                    </Text>
                    <Button
                      secondary
                      label='Copy voucher'
                      onClick={async () => {
                        try {
                          await copy(record.token!)
                        } catch (err) {
                          setError(extractError(err))
                        }
                      }}
                    />
                    <Button
                      secondary
                      label='Share voucher'
                      onClick={async () => {
                        try {
                          await shareData({ text: record.token!, title: 'Arkade Cash voucher' })
                        } catch (err) {
                          setError(extractError(err))
                        }
                      }}
                    />
                    {nfcSupported() && (
                      <Button
                        secondary
                        label='Write NFC'
                        onClick={async () => {
                          try {
                            await writeCashToNfc(record.token!)
                          } catch (err) {
                            setError(extractError(err))
                          }
                        }}
                      />
                    )}
                  </FlexCol>
                ) : (
                  <Text small>{record.token ?? 'No bearer token is available for this voucher.'}</Text>
                )}
              </FlexCol>
            )}
            {record.action === 'claimed' && record.status === 'recovering' && (
              <WarningBox text='The voucher is being recovered. Funds arrive when the recovery settles.' />
            )}
            <ErrorMessage error={!!error} text={error} />
            <Text copy={record.id}>
              ID {record.id.slice(0, 12)}…{record.id.slice(-8)}
            </Text>
            <TextSecondary>Issued {new Date(record.createdAt * 1000).toLocaleString()}</TextSecondary>
            <TextSecondary wrap>
              Funding transaction {record.issueTxIds.length ? record.issueTxIds.join(', ') : 'Pending'}
            </TextSecondary>
            <TextSecondary wrap>
              Claim transaction {record.claimTxIds.length ? record.claimTxIds.join(', ') : 'Pending'}
            </TextSecondary>
            <Button
              secondary
              label='Refresh status'
              onClick={() => refreshCash?.().catch((err) => setError(extractError(err)))}
            />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {record.action === 'issued' && (
          <Button secondary label='New voucher' onClick={() => navigate(Pages.CashIssue)} />
        )}
        {!!record.token && record.status === 'claimed' && (
          <Button
            label='Reclaim voucher'
            onClick={() => {
              pendingToken.current = record.token
              navigate(Pages.CashClaim)
            }}
          />
        )}
        <Button label='Back to vouchers' onClick={() => navigate(Pages.Cash)} />
      </ButtonsOnBottom>
    </>
  )
}
