import { useContext, useMemo, useState } from 'react'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Padded from '../../../components/Padded'
import FlexCol from '../../../components/FlexCol'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import ErrorMessage from '../../../components/Error'
import Scanner from '../../../components/Scanner'
import InputAddress from '../../../components/InputAddress'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { CashContext } from '../../../providers/cash'
import { decodeCashInput } from '../../../lib/arkadeCash'
import { readCashFromNfc, nfcSupported } from '../../../lib/arkadeCashNfc'
import { extractError } from '../../../lib/error'

/** What a pasted code looks like once the scheme/link wrapper is stripped. */
const looksLikeVoucher = (value: string) => /^(?:web\+arkade:\/\/)?t?arkadecash1/i.test(value.trim())

export default function ClaimCash() {
  const { claimCash } = useContext(WalletContext)
  const { setVoucher, pendingToken } = useContext(CashContext)
  const { navigate } = useContext(NavigationContext)
  const [token, setToken] = useState(pendingToken.current ?? '')
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)

  // Nudge on a wrong prefix while typing, without nagging about an empty field.
  const typed = token.trim()
  const inputError = useMemo(
    () => (!typed || looksLikeVoucher(typed) ? '' : 'This does not look like a voucher code'),
    [typed],
  )
  const canClaim = Boolean(typed) && !inputError && !busy

  const finish = async (value: string) => {
    if (!value.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const record = decodeCashInput(value).toString()
      if (!claimCash) throw new Error('Unlock the wallet first')
      const result = await claimCash(record)
      pendingToken.current = undefined
      setVoucher(result.record.id)
      navigate(Pages.CashDetail)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setBusy(false)
    }
  }

  if (scanning)
    return (
      <Scanner
        label='Cash voucher'
        close={() => setScanning(false)}
        onData={(value) => {
          setScanning(false)
          void finish(value)
        }}
        onError={setError}
      />
    )

  return (
    <>
      <Header text='Claim voucher' back={() => navigate(Pages.Cash)} />
      <Content>
        <Padded>
          <FlexCol gap='1.25rem'>
            <InputAddress
              name='voucher-code'
              label='Voucher code'
              placeholder='Paste a voucher code'
              error={inputError}
              value={token}
              onChange={setToken}
              onEnter={() => canClaim && finish(token)}
              openScan={() => setScanning(true)}
            />
            <p className='voucher-hint'>
              Scan or paste the code you were sent. It can be claimed once, so check the amount before you continue.
            </p>
            <ErrorMessage error={!!error} text={error} />
            {nfcSupported() && (
              <Button
                secondary
                label='Read NFC tag'
                disabled={busy}
                onClick={async () => {
                  setError('')
                  try {
                    const value = await readCashFromNfc(new AbortController().signal)
                    setToken(value)
                    void finish(value)
                  } catch (err) {
                    setError(extractError(err))
                  }
                }}
              />
            )}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Claim voucher' disabled={!canClaim} loading={busy} onClick={() => finish(token)} />
      </ButtonsOnBottom>
    </>
  )
}
