import { useContext, useState } from 'react'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Padded from '../../../components/Padded'
import FlexCol from '../../../components/FlexCol'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import ErrorMessage from '../../../components/Error'
import WarningBox from '../../../components/Warning'
import Scanner from '../../../components/Scanner'
import InputNote from '../../../components/InputNote'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { CashContext } from '../../../providers/cash'
import { decodeCashInput } from '../../../lib/arkadeCash'
import { readCashFromNfc, nfcSupported } from '../../../lib/arkadeCashNfc'
import { extractError } from '../../../lib/error'

export default function ClaimCash() {
  const { claimCash } = useContext(WalletContext)
  const { setVoucher, pendingToken } = useContext(CashContext)
  const { navigate } = useContext(NavigationContext)
  const [token, setToken] = useState(pendingToken.current ?? '')
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)

  const finish = async (value: string) => {
    if (!value || busy) return
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
          setToken(value)
          setScanning(false)
        }}
        onError={setError}
      />
    )

  return (
    <>
      <Header text='Claim Cash' back={() => navigate(Pages.Cash)} />
      <Content>
        <Padded>
          <FlexCol gap='1.25rem'>
            <WarningBox
              green
              text='Anyone with a voucher code can claim it once. Check the amount and source before claiming.'
            />
            <InputNote label='Voucher code' value={token} onChange={setToken} openScan={() => setScanning(true)} />
            <ErrorMessage error={!!error} text={error} />
            {nfcSupported() && (
              <Button
                secondary
                label='Read NFC'
                onClick={async () => {
                  setError('')
                  try {
                    await finish(await readCashFromNfc(new AbortController().signal))
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
        <Button
          label={busy ? 'Claiming…' : 'Claim voucher'}
          disabled={!token.trim() || busy}
          onClick={() => finish(token)}
        />
      </ButtonsOnBottom>
    </>
  )
}
