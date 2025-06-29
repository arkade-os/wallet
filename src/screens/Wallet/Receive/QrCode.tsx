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
import { consoleError } from '../../../lib/logs'
import { canBrowserShareData, shareData } from '../../../lib/share'
import ExpandAddresses from '../../../components/ExpandAddresses'
import FlexCol from '../../../components/FlexCol'
import { LimitsContext } from '../../../providers/limits'
import { ExtendedCoin } from '@arkade-os/sdk'

export default function ReceiveQRCode() {
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { validLnSwap, validUtxoTx, validVtxoTx } = useContext(LimitsContext)
  const { navigate } = useContext(NavigationContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { vtxos, svcWallet, reloadWallet } = useContext(WalletContext)

  const [sharing, setSharing] = useState(false)
  const isFirstMount = useRef(true)

  const { boardingAddr, offchainAddr, invoice, satoshis } = recvInfo
  const address = validUtxoTx(satoshis) ? boardingAddr : ''
  const arkAddress = validVtxoTx(satoshis) ? offchainAddr : ''
  const lnInvoice = invoice && validLnSwap(satoshis) ? invoice : ''
  const bip21uri = bip21.encode(address, arkAddress, lnInvoice, satoshis)

  const [value, setValue] = useState(bip21uri)

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

    async function getBoardingUtxos() {
      return svcWallet!.getBoardingUtxos()
    }

    let currentUtxos: ExtendedCoin[] = []
    getBoardingUtxos().then((utxos) => {
      currentUtxos = utxos
    })

    const interval = setInterval(async () => {
      const utxos = await getBoardingUtxos()
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

  const data = { title: 'Receive', text: bip21uri }
  const disabled = !canBrowserShareData(data) || sharing

  return (
    <>
      <Header text='Receive' back={() => navigate(Pages.ReceiveAmount)} />
      <Content>
        <Padded>
          <FlexCol>
            <QrCode value={value} />
            <ExpandAddresses
              bip21uri={bip21uri}
              boardingAddr={address}
              offchainAddr={arkAddress}
              invoice={lnInvoice}
              onClick={setValue}
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
