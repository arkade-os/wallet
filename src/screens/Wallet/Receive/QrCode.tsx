import { useContext, useEffect, useRef, useState } from 'react'
import Button from '../../../components/Button'
import Padded from '../../../components/Padded'
import QrCode from '../../../components/QrCode'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { NotificationsContext } from '../../../providers/notifications'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import { consoleError, consoleLog } from '../../../lib/logs'
import { canBrowserShareData, shareData } from '../../../lib/share'
import ExpandAddresses from '../../../components/ExpandAddresses'
import FlexCol from '../../../components/FlexCol'
import { LimitsContext } from '../../../providers/limits'
import { Coin, ExtendedVirtualCoin } from '@arkade-os/sdk'
import Loading from '../../../components/Loading'
import { LightningContext } from '../../../providers/lightning'
import { encodeBip21 } from '../../../lib/bip21'

export default function ReceiveQRCode() {
  const { navigate } = useContext(NavigationContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { swapProvider } = useContext(LightningContext)
  const { vtxos, svcWallet, wallet } = useContext(WalletContext)
  const { validLnSwap, validUtxoTx, validVtxoTx, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)

  const isFirstMount = useRef(true)
  const [sharing, setSharing] = useState(false)

  // manage all possible receive methods
  const { boardingAddr, offchainAddr, satoshis } = recvInfo
  const address = validUtxoTx(satoshis) && utxoTxsAllowed() ? boardingAddr : ''
  const arkAddress = validVtxoTx(satoshis) && vtxoTxsAllowed() ? offchainAddr : ''

  // don't generate QR if no valid payment method is available
  if (!address && !arkAddress && !validLnSwap(satoshis)) {
    return <div>No valid payment methods available for this amount</div>
  }

  const defaultBip21uri = encodeBip21(address, arkAddress, '', satoshis)

  const [invoice, setInvoice] = useState('')
  const [qrValue, setQrValue] = useState(defaultBip21uri)
  const [bip21uri, setBip21uri] = useState(defaultBip21uri)
  const [showQrCode, setShowQrCode] = useState(false)

  // set the QR code value to the bip21uri the first time
  useEffect(() => {
    const bip21uri = encodeBip21(address, arkAddress, invoice, satoshis)
    setBip21uri(bip21uri)
    setQrValue(bip21uri)
    if (invoice) setShowQrCode(true)
  }, [invoice])

  useEffect(() => {
    // if boltz is available and amount is between limits, let's create a swap invoice
    if (validLnSwap(satoshis) && wallet && svcWallet) {
      swapProvider
        ?.createReverseSwap(satoshis)
        .then((pendingSwap) => {
          if (!pendingSwap) throw new Error('Failed to create reverse swap')
          const invoice = pendingSwap.response.invoice
          setRecvInfo({ ...recvInfo, invoice })
          setInvoice(invoice)
          consoleLog('Reverse swap invoice created:', invoice)
          swapProvider
            .waitAndClaim(pendingSwap)
            .then(() => {
              setRecvInfo({ ...recvInfo, satoshis: pendingSwap.response.onchainAmount })
              navigate(Pages.ReceiveSuccess)
            })
            .catch((error) => {
              setShowQrCode(true)
              consoleError(error, 'Error claiming reverse swap:')
            })
        })
        .catch((error) => {
          setShowQrCode(true)
          consoleError(error, 'Error creating reverse swap:')
        })
    } else {
      setShowQrCode(true)
    }
  }, [satoshis])

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    // we just received a payment, and it's on the last index of the vtxos
    const lastVtxo = vtxos.spendable.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
    if (!lastVtxo) return
    const { value } = lastVtxo
    setRecvInfo({ ...recvInfo, satoshis: value })
    notifyPaymentReceived(value)
    navigate(Pages.ReceiveSuccess)
  }, [vtxos])

  useEffect(() => {
    if (!svcWallet) return

    const listenForPayments = (event: MessageEvent) => {
      let satoshis = 0
      if (event.data && event.data.type === 'VTXO_UPDATE') {
        const vtxos = JSON.parse(event.data.message) as ExtendedVirtualCoin[]
        satoshis = vtxos.reduce((acc, v) => acc + v.value, 0)
      }
      if (event.data && event.data.type === 'UTXO_UPDATE') {
        const coins = JSON.parse(event.data.message) as Coin[]
        satoshis = coins.reduce((acc, v) => acc + v.value, 0)
      }
      if (satoshis) {
        setRecvInfo({ ...recvInfo, satoshis })
        notifyPaymentReceived(satoshis)
        navigate(Pages.ReceiveSuccess)
      }
    }

    navigator.serviceWorker.addEventListener('message', listenForPayments)

    return () => {
      navigator.serviceWorker.removeEventListener('message', listenForPayments)
    }
  }, [svcWallet])

  const handleShare = () => {
    setSharing(true)
    shareData(data)
      .catch(consoleError)
      .finally(() => setSharing(false))
  }

  const data = { title: 'Receive', text: qrValue }
  const disabled = !canBrowserShareData(data) || sharing

  return (
    <>
      <Header text='Receive' back={() => navigate(Pages.ReceiveAmount)} />
      <Content>
        <Padded>
          {showQrCode ? (
            <FlexCol centered>
              <QrCode value={qrValue} />
              <ExpandAddresses
                bip21uri={bip21uri}
                boardingAddr={address}
                offchainAddr={arkAddress}
                invoice={invoice}
                onClick={setQrValue}
              />
            </FlexCol>
          ) : (
            <Loading text='Generating QR code...' />
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleShare} label='Share' disabled={disabled} />
      </ButtonsOnBottom>
    </>
  )
}
