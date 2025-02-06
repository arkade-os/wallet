import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import Error from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext, SendInfo } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import { decodeArkAddress, isArkAddress, isBTCAddress } from '../../../lib/address'
import { AspContext } from '../../../providers/asp'
import * as bip21 from '../../../lib/bip21'
import { ArkNote, isArkNote } from '../../../lib/arknote'
import InputAmount from '../../../components/InputAmount'
import InputAddress from '../../../components/InputAddress'
import Header from '../../../components/Header'
import { WalletContext } from '../../../providers/wallet'
import { prettyNumber } from '../../../lib/format'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Keyboard from '../../../components/Keyboard'
import Text from '../../../components/Text'
import Scanner from '../../../components/Scanner'
import { consoleError } from '../../../lib/logs'
import { Addresses, SettingsOptions } from '../../../lib/types'
import { getReceivingAddresses } from '../../../lib/asp'
import { OptionsContext } from '../../../providers/options'

export default function SendForm() {
  const { aspInfo } = useContext(AspContext)
  const { sendInfo, setNoteInfo, setSendInfo } = useContext(FlowContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)
  const { wallet } = useContext(WalletContext)

  const [amount, setAmount] = useState(0)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState('recipient')
  const [label, setLabel] = useState('')
  const [keys, setKeys] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [receivingAddresses, setReceivingAddresses] = useState<Addresses>()
  const [scan, setScan] = useState(false)
  const [tryingToSelfSend, setTryingToSelfSend] = useState(false)

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints

  useEffect(() => {
    const { recipient, satoshis } = sendInfo
    setRecipient(recipient ?? '')
    setAmount(satoshis ?? 0)
    getReceivingAddresses().then(setReceivingAddresses)
  }, [])

  useEffect(() => {
    smartSetError('')
    if (!recipient) return
    const lowerCaseData = recipient.toLowerCase()
    if (bip21.isBip21(lowerCaseData)) {
      const { address, arkAddress, satoshis } = bip21.decode(lowerCaseData)
      if (!address && !arkAddress) return setError('Unable to parse bip21')
      setAmount(satoshis ?? 0)
      return setState({ address, arkAddress, recipient, satoshis })
    }
    if (isArkAddress(lowerCaseData)) {
      const { aspKey } = decodeArkAddress(lowerCaseData)
      if (aspKey !== aspInfo.pubkey.slice(2)) return setError('Invalid Ark server pubkey')
      return setState({ ...sendInfo, arkAddress: lowerCaseData })
    }
    if (isBTCAddress(lowerCaseData)) {
      return setState({ ...sendInfo, address: lowerCaseData })
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
    setState({ ...sendInfo, satoshis: amount })
  }, [amount])

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
    if (address === boardingAddr || arkAddress === offchainAddr) {
      setError('Cannot send to yourself')
      setTryingToSelfSend(true)
    }
  }

  const gotoRollover = () => {
    setOption(SettingsOptions.Vtxos)
    navigate(Pages.Settings)
  }

  const handleContinue = () => {
    setState({ ...sendInfo, satoshis: amount })
    navigate(Pages.SendDetails)
  }

  const handleEnter = () => {
    if (!disabled) return handleContinue()
    if (!amount) return setFocus('amount')
    if (!recipient) return setFocus('recipient')
  }

  const handleFocus = () => {
    if (isMobile) setKeys(true)
  }

  const smartSetError = (str: string) => {
    setError(str === '' ? (aspInfo.unreachable ? 'Ark server unreachable' : '') : str)
  }

  const Available = () => (
    <Text color='dark50' smaller>
      {`${prettyNumber(wallet.balance)} sats available`}
    </Text>
  )

  const { address, arkAddress, satoshis } = sendInfo

  const disabled = !((address || arkAddress) && satoshis && satoshis > 0) || aspInfo.unreachable || tryingToSelfSend

  if (scan)
    return (
      <Scanner close={() => setScan(false)} label='Recipient address' setData={setRecipient} setError={smartSetError} />
    )

  if (keys) return <Keyboard back={() => setKeys(false)} onChange={setAmount} value={amount} />

  return (
    <>
      <Header text='Send' />
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
              focus={focus === 'amount' && !isMobile}
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
