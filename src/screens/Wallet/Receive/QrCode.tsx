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
import { consoleError } from '../../../lib/logs'
import { canBrowserShareData, shareData } from '../../../lib/share'
import ExpandAddresses from '../../../components/ExpandAddresses'
import FlexCol from '../../../components/FlexCol'
import { LimitsContext } from '../../../providers/limits'
import { Coin, ExtendedVirtualCoin } from '@arkade-os/sdk'
import Loading from '../../../components/Loading'
import { SwapsContext } from '../../../providers/swaps'
import { encodeBip21 } from '../../../lib/bip21'
import { PendingChainSwap, PendingReverseSwap } from '@arkade-os/boltz-swap'

export default function ReceiveQRCode() {
  const { navigate } = useContext(NavigationContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { arkadeSwaps, createBtcToArkSwap, createReverseSwap } = useContext(SwapsContext)
  const { svcWallet } = useContext(WalletContext)
  const { validBtcToArk, validLnSwap, validUtxoTx, validVtxoTx, utxoTxsAllowed, vtxoTxsAllowed } =
    useContext(LimitsContext)

  const [sharing, setSharing] = useState(false)

  // manage all possible receive methods
  const { boardingAddr, offchainAddr, satoshis } = recvInfo

  const [noPaymentMethods, setNoPaymentMethods] = useState(false)
  const [arkAddress, setArkAddress] = useState(offchainAddr)
  const [btcAddress, setBtcAddress] = useState(boardingAddr)
  const [showQrCode, setShowQrCode] = useState(!satoshis)
  const [swapAddress, setSwapAddress] = useState('')
  const [qrCodeValue, setQrCodeValue] = useState('')
  const [bip21Uri, setBip21Uri] = useState('')
  const [invoice, setInvoice] = useState('')

  const createBtcAddress = () => {
    return new Promise((resolve, reject) => {
      if (!validBtcToArk(satoshis)) return reject()
      createBtcToArkSwap(satoshis)
        .then((result) => {
          if (!result) throw new Error('Failed to create chain swap')
          resolve(result.pendingSwap)
        })
        .catch((error) => {
          consoleError(error, 'Error creating chain swap')
          reject(error)
        })
    })
  }

  const createLightningInvoice = () => {
    return new Promise((resolve, reject) => {
      if (!validLnSwap(satoshis)) return reject()
      createReverseSwap(satoshis)
        .then((pendingSwap) => {
          if (!pendingSwap) throw new Error('Failed to create reverse swap')
          resolve(pendingSwap)
        })
        .catch((error) => {
          consoleError(error, 'Error creating reverse swap:')
          reject(error)
        })
    })
  }

  useEffect(() => {
    if (!satoshis || !svcWallet || !arkadeSwaps) return
    Promise.allSettled([createBtcAddress(), createLightningInvoice()]).then(([btc, lightning]) => {
      if (btc.status === 'fulfilled') {
        const pendingSwap = btc.value as PendingChainSwap
        const btcAddr = pendingSwap.response.lockupDetails.lockupAddress
        setSwapAddress(btcAddr)
        arkadeSwaps
          .waitAndClaimArk(pendingSwap)
          .then(() => {
            setRecvInfo({ ...recvInfo, satoshis: pendingSwap.response.claimDetails.amount })
            navigate(Pages.ReceiveSuccess)
          })
          .catch((error) => {
            consoleError(error, 'Error claiming chain swap:')
          })
      }
      if (lightning.status === 'fulfilled') {
        const pendingSwap = lightning.value as PendingReverseSwap
        const invoice = pendingSwap.response.invoice
        setInvoice(invoice)
        arkadeSwaps
          .waitAndClaim(pendingSwap)
          .then(() => {
            setRecvInfo({ ...recvInfo, satoshis: pendingSwap.response.onchainAmount })
            navigate(Pages.ReceiveSuccess)
          })
          .catch((error) => {
            consoleError(error, 'Error claiming reverse swap:')
          })
      }
      setShowQrCode(true)
    })
  }, [satoshis, svcWallet, arkadeSwaps])

  //
  useEffect(() => {
    if (!showQrCode) return
    const arkAddress = validVtxoTx(satoshis) && vtxoTxsAllowed() ? offchainAddr : ''
    const btcAddress = validUtxoTx(satoshis) && utxoTxsAllowed() ? swapAddress || boardingAddr : ''
    const bip21uri = encodeBip21(btcAddress, arkAddress, invoice, satoshis)
    setNoPaymentMethods(!arkAddress && !btcAddress && !invoice)
    setArkAddress(arkAddress)
    setBtcAddress(btcAddress)
    setQrCodeValue(bip21uri)
    setBip21Uri(bip21uri)
  }, [showQrCode])

  useEffect(() => {
    if (!svcWallet) return

    const listenForPayments = (event: MessageEvent) => {
      let satoshis = 0
      if (event.data && event.data.type === 'VTXO_UPDATE') {
        const newVtxos = event.data.payload?.newVtxos
        if (Array.isArray(newVtxos)) {
          satoshis = (newVtxos as ExtendedVirtualCoin[]).reduce((acc, v) => acc + v.value, 0)
        } else {
          consoleError('VTXO_UPDATE message has unexpected payload shape:', event.data.payload)
        }
      }
      if (event.data && event.data.type === 'UTXO_UPDATE') {
        const coins = event.data.payload?.coins
        if (Array.isArray(coins)) {
          satoshis = (coins as Coin[]).reduce((acc, v) => acc + v.value, 0)
        } else {
          consoleError('UTXO_UPDATE message has unexpected payload shape:', event.data.payload)
        }
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

  const data = { title: 'Receive', text: qrCodeValue }
  const disabled = !canBrowserShareData(data) || sharing

  return (
    <>
      <Header text='Receive' back />
      <Content>
        <Padded>
          {noPaymentMethods ? (
            <div>No valid payment methods available for this amount</div>
          ) : qrCodeValue ? (
            <FlexCol centered>
              <QrCode value={qrCodeValue} />
              <ExpandAddresses
                bip21uri={bip21Uri}
                boardingAddr={btcAddress}
                offchainAddr={arkAddress}
                invoice={invoice || ''}
                onClick={setQrCodeValue}
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
