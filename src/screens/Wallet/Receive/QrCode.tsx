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
import { Asset, Coin, ExtendedVirtualCoin } from '@arkade-os/sdk'
import LoadingLogo from '../../../components/LoadingLogo'
import { SwapsContext } from '../../../providers/swaps'
import { encodeBip21, encodeBip21Asset } from '../../../lib/bip21'
import { PendingChainSwap, PendingReverseSwap } from '@arkade-os/boltz-swap'
import { enableChainSwapsReceive } from '../../../lib/constants'
import { centsToUnits } from '../../../lib/assets'
import WarningBox from '../../../components/Warning'
import ErrorMessage from '../../../components/Error'

export default function ReceiveQRCode() {
  const { navigate } = useContext(NavigationContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { arkadeSwaps, swapsInitError, connected, createBtcToArkSwap, createReverseSwap } = useContext(SwapsContext)
  const { assetMetadataCache, svcWallet } = useContext(WalletContext)
  const { validBtcToArk, validLnSwap, validUtxoTx, validVtxoTx, utxoTxsAllowed, vtxoTxsAllowed } =
    useContext(LimitsContext)

  const [sharing, setSharing] = useState(false)

  // manage all possible receive methods
  const { boardingAddr, offchainAddr, satoshis, assetId, addressError } = recvInfo
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const isAssetReceive = assetId && assetId !== ''
  const hasError = Boolean(addressError)

  const [noPaymentMethods, setNoPaymentMethods] = useState(false)
  const [arkAddress, setArkAddress] = useState(offchainAddr)
  const [btcAddress, setBtcAddress] = useState(boardingAddr)
  const [showQrCode, setShowQrCode] = useState(!satoshis)
  const [swapsTimedOut, setSwapsTimedOut] = useState(false)
  const [swapAddress, setSwapAddress] = useState('')
  const [qrCodeValue, setQrCodeValue] = useState('')
  const [bip21Uri, setBip21Uri] = useState('')
  const [invoice, setInvoice] = useState('')

  const createBtcAddress = () => {
    return new Promise((resolve, reject) => {
      if (!enableChainSwapsReceive) return reject()
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
      if (invoice) return reject() // invoice already exists, no need to create another
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
    if (isAssetReceive) return setShowQrCode(true)
    if (!satoshis || !svcWallet) return

    // LN is only expected when Boltz is enabled and this isn't an asset receive
    const lnExpected = connected && !isAssetReceive

    if (!arkadeSwaps) {
      if (!lnExpected || swapsInitError) {
        // LN not expected or already failed — show QR immediately
        if (lnExpected && swapsInitError) {
          consoleError(swapsInitError, 'Swaps unavailable, showing receive without swap options')
          setSwapsTimedOut(true)
        }
        setShowQrCode(true)
        return
      }
      // LN expected but swaps still initializing — wait up to 5s
      const timeout = setTimeout(() => {
        setSwapsTimedOut(true)
        setShowQrCode(true)
      }, 5_000)
      return () => clearTimeout(timeout)
    }

    // arkadeSwaps is ready, generate swaps before showing QR to avoid QR code changing
    setSwapsTimedOut(false)

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
  }, [satoshis, svcWallet, arkadeSwaps, swapsInitError])

  //
  useEffect(() => {
    if (!showQrCode) return

    const arkAddress = validVtxoTx(satoshis) && vtxoTxsAllowed() ? offchainAddr : ''
    const btcAddress = validUtxoTx(satoshis) && utxoTxsAllowed() ? swapAddress || boardingAddr : ''

    const bip21uri = isAssetReceive
      ? encodeBip21Asset(arkAddress, assetId, centsToUnits(satoshis, assetMeta?.metadata?.decimals))
      : encodeBip21(btcAddress, arkAddress, invoice, satoshis)

    setNoPaymentMethods(!arkAddress && !btcAddress && !invoice && !isAssetReceive)
    setArkAddress(arkAddress)
    setBtcAddress(btcAddress)
    setQrCodeValue(bip21uri)
    setBip21Uri(bip21uri)
  }, [showQrCode, swapAddress, invoice])

  useEffect(() => {
    if (!svcWallet) return

    const listenForPayments = (event: MessageEvent) => {
      let satoshis = 0
      let receivedAssets: Asset[] = []

      if (event.data && event.data.type === 'VTXO_UPDATE') {
        const newVtxos = event.data.payload?.newVtxos
        if (Array.isArray(newVtxos)) {
          satoshis = (newVtxos as ExtendedVirtualCoin[]).reduce((acc, v) => acc + v.value, 0)
          for (const v of newVtxos as ExtendedVirtualCoin[]) {
            receivedAssets.push(...(v.assets ?? []))
          }
        } else {
          consoleError('VTXO_UPDATE message has unexpected payload shape:', event.data.payload)
        }
      }

      // reduce received assets to unique asset ids (sum amounts if same asset id)
      receivedAssets = receivedAssets.reduce((acc, v) => {
        const existing = acc.find((a) => a.assetId === v.assetId)
        if (existing) {
          existing.amount += v.amount
        } else {
          acc.push(v)
        }
        return acc
      }, [] as Asset[])

      if (event.data && event.data.type === 'UTXO_UPDATE') {
        const coins = event.data.payload?.coins
        if (Array.isArray(coins)) {
          satoshis = (coins as Coin[]).reduce((acc, v) => acc + v.value, 0)
        } else {
          consoleError('UTXO_UPDATE message has unexpected payload shape:', event.data.payload)
        }
      }

      if (satoshis || receivedAssets.length > 0) {
        setRecvInfo({ ...recvInfo, satoshis, receivedAssets })
        if (!isAssetReceive) notifyPaymentReceived(satoshis)
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
  const disabled = !canBrowserShareData(data) || sharing || hasError || noPaymentMethods

  return (
    <>
      <Header text='Receive' back />
      <Content>
        <Padded>
          {hasError ? (
            <ErrorMessage error text={`Failed to get address: ${addressError}`} />
          ) : noPaymentMethods ? (
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
              {swapsTimedOut && !invoice && !isAssetReceive ? (
                <WarningBox text='Lightning is temporarily unavailable. This QR code only supports Arkade and on-chain payments.' />
              ) : null}
            </FlexCol>
          ) : (
            <LoadingLogo text='Generating QR code...' />
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleShare} label='Share' disabled={disabled} />
      </ButtonsOnBottom>
    </>
  )
}
