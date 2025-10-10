import { useContext, useEffect, useState } from 'react'
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
  const { svcWallet, wallet } = useContext(WalletContext)
  const { validLnSwap, validUtxoTx, validVtxoTx, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)

  const [sharing, setSharing] = useState(false)

  // manage all possible receive methods
  const { boardingAddr, offchainAddr, satoshis } = recvInfo
  const address = validUtxoTx(satoshis) && utxoTxsAllowed() ? boardingAddr : ''
  const arkAddress = validVtxoTx(satoshis) && vtxoTxsAllowed() ? offchainAddr : ''
  const noPaymentMethods = !address && !arkAddress && !validLnSwap(satoshis)
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
    if (!svcWallet) return

    const listenForPayments = (event: MessageEvent) => {
      let satoshis = 0
      if (event.data && event.data.type === 'VTXO_UPDATE') {
        const newVtxos = event.data.newVtxos as ExtendedVirtualCoin[]
        satoshis = newVtxos.reduce((acc, v) => acc + v.value, 0)
      }
      if (event.data && event.data.type === 'UTXO_UPDATE') {
        const coins = event.data.coins as Coin[]
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
          {noPaymentMethods ? (
            <div>No valid payment methods available for this amount</div>
          ) : showQrCode ? (
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
