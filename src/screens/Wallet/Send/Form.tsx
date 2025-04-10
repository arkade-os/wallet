import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import Error from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext, SendInfo } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import { isArkAddress, isBTCAddress, decodeArkAddress } from '../../../lib/address'
import { AspContext } from '../../../providers/asp'
import * as bip21 from '../../../lib/bip21'
import { ArkNote, isArkNote } from '../../../lib/arknote'
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
import { consoleError } from '../../../lib/logs'
import { Addresses, SettingsOptions } from '../../../lib/types'
import { getReceivingAddresses } from '../../../lib/asp'
import { OptionsContext } from '../../../providers/options'
import { isMobileBrowser } from '../../../lib/browser'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'

export default function SendForm() {
  const { aspInfo } = useContext(AspContext)
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)
  const { sendInfo, setNoteInfo, setSendInfo } = useContext(FlowContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)
  const { wallet } = useContext(WalletContext)

  const [amount, setAmount] = useState<number>()
  const [error, setError] = useState('')
  const [focus, setFocus] = useState('recipient')
  const [label, setLabel] = useState('')
  const [keys, setKeys] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [receivingAddresses, setReceivingAddresses] = useState<Addresses>()
  const [satoshis, setSatoshis] = useState(0)
  const [scan, setScan] = useState(false)
  const [tryingToSelfSend, setTryingToSelfSend] = useState(false)

  useEffect(() => {
    const { recipient, satoshis } = sendInfo
    setRecipient(recipient ?? '')
    setAmount(satoshis ? satoshis : undefined)
    getReceivingAddresses().then(setReceivingAddresses)
  }, [])

  useEffect(() => {
    smartSetError('')
    if (!recipient) return
    const lowerCaseData = recipient.toLowerCase()
    if (bip21.isBip21(lowerCaseData)) {
      const { address, arkAddress, satoshis } = bip21.decode(lowerCaseData)
      if (!address && !arkAddress) return setError('Unable to parse bip21')
      setAmount(useFiat ? toFiat(satoshis) : satoshis ? satoshis : undefined)
      return setState({ address, arkAddress, recipient, satoshis })
    }
    if (isArkAddress(lowerCaseData)) {
      const { aspKey } = decodeArkAddress(lowerCaseData)
      if (aspKey !== aspInfo.pubkey.slice(2)) return setError('Invalid Ark server pubkey')
      return setState({ ...sendInfo, address: '', arkAddress: lowerCaseData })
    }
    if (isBTCAddress(lowerCaseData)) {
      return setState({ ...sendInfo, address: lowerCaseData, arkAddress: '' })
    }
    if (isArkNote(lowerCaseData)) {
      try {
        const anote = ArkNote.fromString(recipient)
        setNoteInfo({ note: recipient, satoshis: anote.data.value })
        return navigate(Pages.NotesRedeem)
      } catch (err) {
        consoleError(err, 'error parsing ark note')
      }
    }
    setError('Invalid recipient address')
  }, [recipient])

  useEffect(() => {
    setError('')
    setSatoshis(useFiat ? fromFiat(amount) : amount ?? 0)
  }, [amount])

  useEffect(() => {
    setState({ ...sendInfo, satoshis })
    setLabel(
      satoshis > wallet.balance
        ? 'Insufficient funds'
        : satoshis < aspInfo.dust
        ? 'Amount below dust limit'
        : 'Continue',
    )
  }, [satoshis])

  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
    setLabel(aspInfo.unreachable ? 'Server unreachable' : 'Continue')
  }, [aspInfo.unreachable])

  const setState = (info: SendInfo) => {
    setScan(false)
    setSendInfo(info)
    if (!receivingAddresses) return
    const { address, arkAddress } = info
    const { boardingAddr, offchainAddr } = receivingAddresses
    const selfSend = address === boardingAddr || arkAddress === offchainAddr
    setError(selfSend ? 'Cannot send to yourself' : '')
    setTryingToSelfSend(selfSend)
  }

  const gotoRollover = () => {
    setOption(SettingsOptions.Vtxos)
    navigate(Pages.Settings)
  }

  const handleContinue = () => {
    setState({ ...sendInfo, satoshis })
    navigate(Pages.SendDetails)
  }

  const handleEnter = () => {
    if (!disabled) return handleContinue()
    if (!amount) return setFocus('amount')
    if (!recipient) return setFocus('recipient')
  }

  const handleFocus = () => {
    if (isMobileBrowser) setKeys(true)
  }

  const smartSetError = (str: string) => {
    setError(str === '' ? (aspInfo.unreachable ? 'Ark server unreachable' : '') : str)
  }

  const Available = () => {
    const amount = useFiat ? toFiat(wallet.balance) : wallet.balance
    const pretty = useFiat ? prettyAmount(amount, config.fiat) : prettyAmount(amount)
    return (
      <Text color='dark50' smaller>
        {`${pretty} available`}
      </Text>
    )
  }

  const { address, arkAddress } = sendInfo

  const disabled =
    !((address || arkAddress) && satoshis && satoshis > 0) ||
    aspInfo.unreachable ||
    tryingToSelfSend ||
    satoshis > wallet.balance ||
    satoshis < aspInfo.dust

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
              onChange={setAmount}
              onEnter={handleEnter}
              onFocus={handleFocus}
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
