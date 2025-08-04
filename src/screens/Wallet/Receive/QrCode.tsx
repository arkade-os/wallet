import { useContext, useEffect, useRef, useState } from 'react'
import Button from '../../../components/Button'
import Padded from '../../../components/Padded'
import QrCode from '../../../components/QrCode'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import * as bip21 from '../../../lib/bip21'
import { WalletContext } from '../../../providers/wallet'
import { NotificationsContext } from '../../../providers/notifications'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import { consoleError, consoleLog } from '../../../lib/logs'
import { canBrowserShareData, shareData } from '../../../lib/share'
import ExpandAddresses from '../../../components/ExpandAddresses'
import FlexCol from '../../../components/FlexCol'
import { LimitsContext } from '../../../providers/limits'
import { ExtendedCoin } from '@arkade-os/sdk'
import { AspContext } from '../../../providers/asp'
import { LightningSwap } from '../../../lib/lightning'

export default function ReceiveQRCode() {
  const { aspInfo } = useContext(AspContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { validLnSwap, validUtxoTx, validVtxoTx, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { navigate } = useContext(NavigationContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { vtxos, svcWallet, wallet, reloadWallet } = useContext(WalletContext)

  const isFirstMount = useRef(true)
  const [sharing, setSharing] = useState(false)

  // manage all possible receive methods
  const { boardingAddr, offchainAddr, satoshis } = recvInfo
  const address = validUtxoTx(satoshis) && utxoTxsAllowed() ? boardingAddr : ''
  const arkAddress = validVtxoTx(satoshis) && vtxoTxsAllowed() ? offchainAddr : ''
  const defaultBip21uri = bip21.encode(address, arkAddress, '', satoshis)

  const [invoice, setInvoice] = useState('')
  const [qrValue, setQrValue] = useState(defaultBip21uri)
  const [bip21uri, setBip21uri] = useState(defaultBip21uri)

  // set the QR code value to the bip21uri the first time
  useEffect(() => {
    const bip21uri = bip21.encode(address, arkAddress, invoice, satoshis)
    setBip21uri(bip21uri)
    setQrValue(bip21uri)
  }, [invoice])

  useEffect(() => {
    // if boltz is available and amount is between limits, let's create a swap invoice
    if (validLnSwap(satoshis) && wallet && svcWallet) {
      const swapProvider = new LightningSwap(aspInfo, svcWallet)
      swapProvider
        .createReverseSwap(satoshis)
        .then((pendingSwap) => {
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
              consoleError('Error claiming reverse swap:', error)
            })
        })
        .catch((error) => {
          consoleError('Error creating reverse swap:', error)
        })
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

    let currentUtxos: ExtendedCoin[] = []
    svcWallet!.getBoardingUtxos().then((utxos) => {
      currentUtxos = utxos
    })

    const interval = setInterval(async () => {
      const utxos = await svcWallet!.getBoardingUtxos()
      if (utxos.length < currentUtxos.length) {
        currentUtxos = utxos
      }
      if (utxos.length > currentUtxos.length) {
        const newUtxo = utxos.find((utxo) => !currentUtxos.includes(utxo))
        if (newUtxo) {
          currentUtxos = utxos
          setRecvInfo({ ...recvInfo, satoshis: newUtxo.value })
          await reloadWallet()
          notifyPaymentReceived(newUtxo.value)
          navigate(Pages.ReceiveSuccess)
        }
      }
    }, 5_000)
    return () => clearInterval(interval)
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
          <FlexCol>
            <QrCode value={qrValue} />
            <ExpandAddresses
              bip21uri={bip21uri}
              boardingAddr={address}
              offchainAddr={arkAddress}
              invoice={invoice}
              onClick={setQrValue}
            />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleShare} label='Share' disabled={disabled} />
      </ButtonsOnBottom>
    </>
  )
}
