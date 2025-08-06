import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import Error from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext, SendInfo } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import {
  isArkAddress,
  isBTCAddress,
  decodeArkAddress,
  isLightningInvoice,
  isURLWithLightningQueryString,
} from '../../../lib/address'
import { AspContext } from '../../../providers/asp'
import * as bip21 from '../../../lib/bip21'
import { isArkNote } from '../../../lib/arknote'
import InputAmount from '../../../components/InputAmount'
import InputAddress from '../../../components/InputAddress'
import Header from '../../../components/Header'
import { WalletContext } from '../../../providers/wallet'
import { prettyAmount } from '../../../lib/format'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Keyboard from '../../../components/Keyboard'
import Text from '../../../components/Text'
import Scanner from '../../../components/Scanner'
import Loading from '../../../components/Loading'
import { consoleError } from '../../../lib/logs'
import { Addresses, SettingsOptions } from '../../../lib/types'
import { getReceivingAddresses } from '../../../lib/asp'
import { OptionsContext } from '../../../providers/options'
import { isMobileBrowser } from '../../../lib/browser'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { ArkNote } from '@arkade-os/sdk'
import { LimitsContext } from '../../../providers/limits'
import { checkLnUrlConditions, fetchInvoice, fetchArkAddress, isValidLnUrl } from '../../../lib/lnurl'
import { extractError } from '../../../lib/error'
import { calcSwapFee, LightningSwap } from '../../../lib/lightning'
import { getInvoiceSatoshis } from '@arkade-os/boltz-swap'

export default function SendForm() {
  const { aspInfo } = useContext(AspContext)
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)
  const { sendInfo, setNoteInfo, setSendInfo } = useContext(FlowContext)
  const { amountIsAboveMaxLimit, amountIsBelowMinLimit, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)
  const { balance, svcWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState<number>()
  const [amountIsReadOnly, setAmountIsReadOnly] = useState(false)
  const [proceed, setProceed] = useState(false)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState('recipient')
  const [label, setLabel] = useState('')
  const [lnUrlLimits, setLnUrlLimits] = useState<{ min: number; max: number }>({ min: 0, max: 0 })
  const [keys, setKeys] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [receivingAddresses, setReceivingAddresses] = useState<Addresses>()
  const [satoshis, setSatoshis] = useState(0)
  const [scan, setScan] = useState(false)
  const [tryingToSelfSend, setTryingToSelfSend] = useState(false)

  if (!svcWallet) return <Loading text='Loading...' />

  // get receiving addresses
  useEffect(() => {
    const { recipient, satoshis } = sendInfo
    setRecipient(recipient ?? '')
    setAmount(satoshis ? satoshis : undefined)
    getReceivingAddresses(svcWallet).then(setReceivingAddresses)
  }, [])

  // parse recipient data
  useEffect(() => {
    smartSetError('')
    const parseRecipient = async () => {
      if (!recipient) return

      const lowerCaseData = recipient.toLowerCase()

      if (isURLWithLightningQueryString(recipient)) {
        const url = new URL(recipient)
        return setRecipient(url.searchParams.get('lightning')!)
      }
      if (bip21.isBip21(lowerCaseData)) {
        const { address, arkAddress, invoice, satoshis } = bip21.decode(lowerCaseData)
        if (!address && !arkAddress && !invoice) return setError('Unable to parse bip21')
        setAmount(useFiat ? toFiat(satoshis) : satoshis ? satoshis : undefined)
        return setState({ address, arkAddress, invoice, recipient, satoshis })
      }
      if (isArkAddress(lowerCaseData)) {
        return setState({ ...sendInfo, address: '', arkAddress: lowerCaseData })
      }
      if (isLightningInvoice(lowerCaseData)) {
        const satoshis = getInvoiceSatoshis(lowerCaseData)
        if (!satoshis) return setError('Invoice must have amount defined')
        setAmount(useFiat ? toFiat(satoshis) : satoshis ? satoshis : undefined)
        return setState({ ...sendInfo, address: '', arkAddress: '', invoice: lowerCaseData })
      }
      if (isBTCAddress(lowerCaseData)) {
        return setState({ ...sendInfo, address: lowerCaseData, arkAddress: '' })
      }
      if (isArkNote(lowerCaseData)) {
        try {
          const { value } = ArkNote.fromString(recipient)
          setNoteInfo({ note: recipient, satoshis: value })
          return navigate(Pages.NotesRedeem)
        } catch (err) {
          consoleError(err, 'error parsing ark note')
        }
      }
      if (isValidLnUrl(lowerCaseData)) {
        return setState({ ...sendInfo, lnUrl: lowerCaseData })
      }
      setError('Invalid recipient address')
    }
    parseRecipient()
  }, [recipient])

  // check lnurl limits
  useEffect(() => {
    const { min, max } = lnUrlLimits
    if (!min || !max) return
    if (min > balance) return setError('Insufficient funds for LNURL')
    if (satoshis && satoshis < min) return setError(`Amount below LNURL min limit`)
    if (satoshis && satoshis > max) return setError(`Amount above LNURL max limit`)
    if (min === max) {
      setAmount(useFiat ? toFiat(min) : min) // set fixed amount automatically
      setAmountIsReadOnly(true)
    } else {
      setAmountIsReadOnly(false)
    }
  }, [lnUrlLimits.min, lnUrlLimits.max])

  // check lnurl conditions
  useEffect(() => {
    if (!sendInfo.lnUrl) return
    if (sendInfo.lnUrl && sendInfo.invoice) return
    checkLnUrlConditions(sendInfo.lnUrl).then((conditions) => {
      if (!conditions) return setError('Unable to fetch LNURL conditions')
      const min = Math.floor(conditions.minSendable / 1000) // from millisatoshis to satoshis
      const max = Math.floor(conditions.maxSendable / 1000) // from millisatoshis to satoshis
      return setLnUrlLimits({ min, max })
    })
  }, [sendInfo.lnUrl])

  // check if user wants to send all funds
  useEffect(() => {
    if (sendInfo.lnUrl && sendInfo.satoshis === balance) handleSendAll()
  }, [sendInfo.lnUrl])

  console.log('SendForm: sendInfo', sendInfo)

  // validate recipient addresses
  useEffect(() => {
    if (!receivingAddresses) return setError('Unable to get receiving addresses')
    const { boardingAddr, offchainAddr } = receivingAddresses
    const { address, arkAddress, invoice } = sendInfo
    // check server limits for onchain transactions
    if (address && !arkAddress && !invoice && !utxoTxsAllowed()) {
      return setError('Sending onchain not allowed')
    }
    // check server limits for offchain transactions
    if (!address && (arkAddress || invoice) && !vtxoTxsAllowed()) {
      return setError('Sending offchain not allowed')
    }
    // check if server key is valid
    if (arkAddress && arkAddress.length > 0) {
      const { aspKey } = decodeArkAddress(arkAddress)
      const { aspKey: expectedAspKey } = decodeArkAddress(offchainAddr)
      if (aspKey !== expectedAspKey) return setError('Invalid Ark server pubkey')
    }
    // check if is trying to self send
    if (address === boardingAddr || arkAddress === offchainAddr) {
      setError('Cannot send to yourself')
      setTryingToSelfSend(true) // nudge user to rollover
    }
    // everything is ok, clean error
    setError('')
  }, [sendInfo.address, sendInfo.arkAddress, sendInfo.invoice])

  useEffect(() => {
    setSatoshis(useFiat ? fromFiat(amount) : amount ?? 0)
  }, [amount])

  useEffect(() => {
    setState({ ...sendInfo, satoshis })
    setLabel(
      satoshis > balance
        ? 'Insufficient funds'
        : lnUrlLimits.min && satoshis < lnUrlLimits.min
        ? 'Amount below LNURL min limit'
        : lnUrlLimits.max && satoshis > lnUrlLimits.max
        ? 'Amount above LNURL max limit'
        : amountIsBelowMinLimit(satoshis)
        ? 'Amount below dust limit'
        : amountIsAboveMaxLimit(satoshis)
        ? 'Amount above max limit'
        : 'Continue',
    )
  }, [satoshis])

  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
    setLabel(aspInfo.unreachable ? 'Server unreachable' : 'Continue')
  }, [aspInfo.unreachable])

  useEffect(() => {
    if (!proceed) return
    if (!sendInfo.address && !sendInfo.arkAddress && !sendInfo.invoice) return
    if (!sendInfo.arkAddress && sendInfo.invoice && !sendInfo.pendingSwap) makeSubmarineSwap(sendInfo.invoice)
    else navigate(Pages.SendDetails)
  }, [proceed, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.pendingSwap])

  const setState = (info: SendInfo) => {
    setScan(false)
    setSendInfo(info)
  }

  const gotoRollover = () => {
    setOption(SettingsOptions.Vtxos)
    navigate(Pages.Settings)
  }

  const makeSubmarineSwap = async (invoice: string) => {
    try {
      const swapProvider = new LightningSwap(aspInfo, svcWallet)
      const pendingSwap = await swapProvider.createSubmarineSwap(invoice)
      if (!pendingSwap) return setError('Swap failed: Unable to create submarine swap')
      setSendInfo({ ...sendInfo, satoshis: pendingSwap.response.expectedAmount, pendingSwap })
    } catch (error) {
      consoleError(error, 'Swap failed')
      setError('Swap failed: ' + extractError(error))
    }
  }

  const handleContinue = async () => {
    try {
      if (sendInfo.lnUrl) {
        // Check if Ark method is available
        const conditions = await checkLnUrlConditions(sendInfo.lnUrl)
        const arkMethod = conditions.transferAmounts?.find((method) => method.method === 'Ark' && method.available)

        if (arkMethod) {
          // Fetch Ark address instead of Lightning invoice
          const arkResponse = await fetchArkAddress(sendInfo.lnUrl)
          if (!isArkAddress(arkResponse.address)) {
            throw 'Invalid Ark address received from LNURL'
          }
          setState({ ...sendInfo, arkAddress: arkResponse.address, invoice: undefined, satoshis })
        } else {
          // Fallback to Lightning invoice
          const invoice = await fetchInvoice(sendInfo.lnUrl, satoshis, '')
          setState({ ...sendInfo, invoice, arkAddress: undefined })
        }
      } else {
        setState({ ...sendInfo, satoshis })
      }
      setProceed(true)
    } catch (error) {
      consoleError(extractError(error))
      setError(extractError(error))
    }
  }

  const handleEnter = () => {
    if (!disabled) return handleContinue()
    if (!amount) return setFocus('amount')
    if (!recipient) return setFocus('recipient')
  }

  const handleFocus = () => {
    if (isMobileBrowser) setKeys(true)
  }

  const handleSendAll = () => {
    const fees = sendInfo.lnUrl ? calcSwapFee(balance) : 0
    console.log('SendForm: handleSendAll', { fees, balance, satoshis })
    setAmount(balance - fees)
  }

  const smartSetError = (str: string) => {
    setError(str === '' ? (aspInfo.unreachable ? 'Ark server unreachable' : '') : str)
  }

  const Available = () => {
    const amount = useFiat ? toFiat(balance) : balance
    const pretty = useFiat ? prettyAmount(amount, config.fiat) : prettyAmount(amount)
    return (
      <div onClick={handleSendAll} style={{ cursor: 'pointer' }}>
        <Text color='dark50' smaller>
          {`${pretty} available`}
        </Text>
      </div>
    )
  }

  const { address, arkAddress, lnUrl, invoice } = sendInfo

  const disabled =
    !((address || arkAddress || lnUrl || invoice) && satoshis && satoshis > 0) ||
    (lnUrlLimits.max && satoshis > lnUrlLimits.max) ||
    (lnUrlLimits.min && satoshis < lnUrlLimits.min) ||
    amountIsAboveMaxLimit(satoshis) ||
    amountIsBelowMinLimit(satoshis) ||
    aspInfo.unreachable ||
    satoshis > balance ||
    tryingToSelfSend ||
    Boolean(error)

  if (scan)
    return (
      <Scanner close={() => setScan(false)} label='Recipient address' setData={setRecipient} setError={smartSetError} />
    )

  if (keys) return <Keyboard back={() => setKeys(false)} onChange={setAmount} value={amount} />

  return (
    <>
      <Header text='Send' back={() => navigate(Pages.Wallet)} />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <Error error={Boolean(error)} text={error} />
            <InputAddress
              focus={focus === 'recipient'}
              label='Recipient address'
              onChange={setRecipient}
              onEnter={handleEnter}
              openScan={() => setScan(true)}
              value={recipient}
            />
            <InputAmount
              focus={focus === 'amount' && !isMobileBrowser}
              label='Amount'
              min={lnUrlLimits.min}
              max={lnUrlLimits.max}
              onChange={setAmount}
              onEnter={handleEnter}
              onFocus={handleFocus}
              readOnly={amountIsReadOnly}
              right={<Available />}
              value={amount}
            />
            {tryingToSelfSend ? (
              <div style={{ width: '100%' }}>
                <Text centered color='dark50' small>
                  Did you mean <a onClick={gotoRollover}>roll over your VTXOs</a>?
                </Text>
              </div>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleContinue} label={label} disabled={disabled} />
      </ButtonsOnBottom>
    </>
  )
}
