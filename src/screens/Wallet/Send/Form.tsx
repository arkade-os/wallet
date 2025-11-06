import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
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
import { getInvoiceSatoshis } from '@arkade-os/boltz-swap'
import { LightningContext } from '../../../providers/lightning'
import { decodeBip21, isBip21 } from '../../../lib/bip21'

export default function SendForm() {
  const { aspInfo } = useContext(AspContext)
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)
  const { sendInfo, setNoteInfo, setSendInfo } = useContext(FlowContext)
  const { swapProvider, connected, calcSubmarineSwapFee } = useContext(LightningContext)
  const { amountIsAboveMaxLimit, amountIsBelowMinLimit, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)
  const { balance, svcWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState<number>()
  const [amountIsReadOnly, setAmountIsReadOnly] = useState(false)
  const [availableBalance, setAvailableBalance] = useState<number>(0)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState('recipient')
  const [label, setLabel] = useState('')
  const [lnUrlLimits, setLnUrlLimits] = useState<{ min: number; max: number }>({ min: 0, max: 0 })
  const [keys, setKeys] = useState(false)
  const [nudgeBoltz, setNudgeBoltz] = useState(false)
  const [proceed, setProceed] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [receivingAddresses, setReceivingAddresses] = useState<Addresses>()
  const [satoshis, setSatoshis] = useState(0)
  const [scan, setScan] = useState(false)
  const [tryingToSelfSend, setTryingToSelfSend] = useState(false)

  // get receiving addresses
  useEffect(() => {
    if (!svcWallet) return
    const { recipient, satoshis } = sendInfo
    setRecipient(recipient ?? '')
    setAmount(satoshis ? satoshis : undefined)
    getReceivingAddresses(svcWallet).then(setReceivingAddresses)
  }, [])

  useEffect(() => {
    if (!svcWallet) return
    svcWallet.getBalance().then((bal) => setAvailableBalance(bal.available))
  }, [balance])

  // parse recipient data
  useEffect(() => {
    smartSetError('')
    const parseRecipient = async () => {
      setNudgeBoltz(false)
      if (!recipient) return
      const lowerCaseData = recipient.toLowerCase().replace(/^lightning:/, '')
      if (isURLWithLightningQueryString(recipient)) {
        const url = new URL(recipient)
        return setRecipient(url.searchParams.get('lightning')!)
      }
      if (isBip21(lowerCaseData)) {
        const { address, arkAddress, invoice, satoshis } = decodeBip21(lowerCaseData)
        if (!address && !arkAddress && !invoice) return setError('Unable to parse bip21')
        setAmount(useFiat ? toFiat(satoshis) : satoshis ? satoshis : undefined)
        return setState({ address, arkAddress, invoice, recipient, satoshis })
      }
      if (isArkAddress(lowerCaseData)) {
        return setState({ ...sendInfo, address: '', arkAddress: lowerCaseData })
      }
      if (isLightningInvoice(lowerCaseData)) {
        if (!connected) {
          setError('Lightning swaps not enabled')
          return setNudgeBoltz(true)
        }
        const satoshis = getInvoiceSatoshis(lowerCaseData)
        if (!satoshis) return setError('Invoice must have amount defined')
        setAmount(useFiat ? toFiat(satoshis) : satoshis ? satoshis : undefined)
        return setState({ ...sendInfo, address: '', arkAddress: '', invoice: lowerCaseData })
      }
      if (isBTCAddress(recipient)) {
        return setState({ ...sendInfo, address: recipient, arkAddress: '' })
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
    checkLnUrlConditions(sendInfo.lnUrl)
      .then((conditions) => {
        if (!conditions) return setError('Unable to fetch LNURL conditions')
        const min = Math.floor(conditions.minSendable / 1000) // from millisatoshis to satoshis
        const max = Math.floor(conditions.maxSendable / 1000) // from millisatoshis to satoshis
        return setLnUrlLimits({ min, max })
      })
      .catch(() => setError('Invalid address or LNURL'))
  }, [sendInfo.lnUrl])

  // check if user wants to send all funds
  useEffect(() => {
    if (sendInfo.lnUrl && sendInfo.satoshis === balance) handleSendAll()
  }, [sendInfo.lnUrl])

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
      const { serverPubKey } = decodeArkAddress(arkAddress)
      const { serverPubKey: expectedServerPubKey } = decodeArkAddress(offchainAddr)
      if (serverPubKey !== expectedServerPubKey) {
        // if there's no other way to pay, show error
        if (!address && !invoice) return setError('Ark server key mismatch')
        // remove ark address from possibilities to send and continue
        // we will try to pay to lightning or mainnet instead
        setSendInfo({ ...sendInfo, arkAddress: '' })
      }
    }
    // check if is trying to self send
    if (address === boardingAddr || arkAddress === offchainAddr) {
      setTryingToSelfSend(true) // nudge user to rollover
      return setError('Cannot send to yourself')
    }
    // everything is ok, clean error
    setError('')
  }, [sendInfo.address, sendInfo.arkAddress, sendInfo.invoice])

  useEffect(() => {
    setSatoshis(Math.floor(useFiat ? fromFiat(amount) : (amount ?? 0)))
  }, [amount])

  useEffect(() => {
    setState({ ...sendInfo, satoshis })
    setLabel(
      satoshis > availableBalance
        ? 'Insufficient funds'
        : lnUrlLimits.min && satoshis < lnUrlLimits.min
          ? 'Amount below LNURL min limit'
          : lnUrlLimits.max && satoshis > lnUrlLimits.max
            ? 'Amount above LNURL max limit'
            : satoshis < 1
              ? 'Amount below 1 satoshi'
              : amountIsAboveMaxLimit(satoshis)
                ? 'Amount above max limit'
                : amountIsBelowMinLimit(satoshis)
                  ? 'Amount below min limit'
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
    if (!sendInfo.arkAddress && sendInfo.invoice && !sendInfo.pendingSwap) {
      const promise = swapProvider?.createSubmarineSwap(sendInfo.invoice)
      if (promise) {
        promise
          .then((pendingSwap) => {
            if (!pendingSwap) return setError('Unable to create swap')
            setState({ ...sendInfo, pendingSwap })
          })
          .catch(handleError)
      }
    } else navigate(Pages.SendDetails)
  }, [proceed, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.pendingSwap])

  if (!svcWallet) return <Loading text='Loading...' />

  const setState = (info: SendInfo) => {
    setScan(false)
    setSendInfo(info)
  }

  const gotoBoltzApp = () => {
    navigate(Pages.AppBoltzSettings)
  }

  const gotoRollover = () => {
    setOption(SettingsOptions.Vtxos)
    navigate(Pages.Settings)
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

  const handleError = (err: any) => {
    consoleError(err, 'error sending payment')
    setError(extractError(err))
  }

  const handleFocus = () => {
    if (isMobileBrowser) setKeys(true)
  }

  const handleSendAll = () => {
    const fees = sendInfo.lnUrl ? (calcSubmarineSwapFee(availableBalance) ?? 0) : 0
    setAmount(availableBalance - fees)
  }

  const smartSetError = (str: string) => {
    setError(str === '' ? (aspInfo.unreachable ? 'Ark server unreachable' : '') : str)
  }

  const Available = () => {
    const amount = useFiat ? toFiat(availableBalance) : availableBalance
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
    satoshis < 1 ||
    aspInfo.unreachable ||
    satoshis > availableBalance ||
    tryingToSelfSend ||
    Boolean(error)

  if (scan)
    return (
      <Scanner close={() => setScan(false)} label='Recipient address' onData={setRecipient} onError={smartSetError} />
    )

  if (keys) return <Keyboard back={() => setKeys(false)} onChange={setAmount} value={amount} />

  return (
    <>
      <Header text='Send' back={() => navigate(Pages.Wallet)} />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            <InputAddress
              focus={focus === 'recipient'}
              label='Recipient address'
              onChange={setRecipient}
              onEnter={handleEnter}
              openScan={() => setScan(true)}
              value={recipient}
            />
            <InputAmount
              name='send-amount'
              focus={focus === 'amount' && !isMobileBrowser}
              label='Amount'
              min={lnUrlLimits.min}
              max={lnUrlLimits.max}
              onChange={setAmount}
              onEnter={handleEnter}
              onFocus={handleFocus}
              onMax={handleSendAll}
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
            {nudgeBoltz && swapProvider?.getApiUrl() ? (
              <div style={{ width: '100%' }}>
                <Text centered color='dark50' small>
                  Enable <a onClick={gotoBoltzApp}>Lightning swaps</a> to pay
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
