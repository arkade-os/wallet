import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import Padded from '../../../components/Padded'
import QrCode from '../../../components/QrCode'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { NotificationsContext } from '../../../providers/notifications'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import { consoleError } from '../../../lib/logs'
import { canBrowserShareData, shareData } from '../../../lib/share'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import { LimitsContext } from '../../../providers/limits'
import { Asset, Coin, ExtendedVirtualCoin } from '@arkade-os/sdk'
import Loading from '../../../components/Loading'
import { SwapsContext } from '../../../providers/swaps'
import { encodeBip21, encodeBip21Asset } from '../../../lib/bip21'
import { PendingChainSwap, PendingReverseSwap } from '@arkade-os/boltz-swap'
import { enableChainSwapsReceive } from '../../../lib/constants'
import { centsToUnits } from '../../../lib/assets'
import WarningBox from '../../../components/Warning'
import ErrorMessage from '../../../components/Error'
import { getReceivingAddresses } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import InputAmount from '../../../components/InputAmount'
import Keyboard from '../../../components/Keyboard'
import SheetModal from '../../../components/SheetModal'
import Text, { TextSecondary } from '../../../components/Text'
import { copyToClipboard } from '../../../lib/clipboard'
import { useToast } from '../../../components/Toast'
import { prettyLongText, prettyNumber } from '../../../lib/format'
import CopyIcon from '../../../icons/Copy'
import CheckMarkIcon from '../../../icons/CheckMark'
import { hapticSubtle } from '../../../lib/haptics'
import { isMobileBrowser } from '../../../lib/browser'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import Focusable from '../../../components/Focusable'

export default function ReceiveQRCode() {
  const { useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { navigate } = useContext(NavigationContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { arkadeSwaps, swapsInitError, connected, createBtcToArkSwap, createReverseSwap } = useContext(SwapsContext)
  const { assetMetadataCache, svcWallet } = useContext(WalletContext)
  const { validBtcToArk, validLnSwap, validUtxoTx, validVtxoTx, utxoTxsAllowed, vtxoTxsAllowed } =
    useContext(LimitsContext)

  const { toast } = useToast()

  const [sharing, setSharing] = useState(false)
  const [addressesLoaded, setAddressesLoaded] = useState(false)

  // Amount sheet state
  const [showAmountSheet, setShowAmountSheet] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [amountInput, setAmountInput] = useState(0)
  const [amountTextValue, setAmountTextValue] = useState('')

  // Copy address sheet state
  const [showCopySheet, setShowCopySheet] = useState(false)
  const [copied, setCopied] = useState('')

  // Receive methods
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

  // Fetch addresses on mount
  useEffect(() => {
    if (!svcWallet) return
    if (boardingAddr && offchainAddr) {
      setAddressesLoaded(true)
      return
    }
    getReceivingAddresses(svcWallet)
      .then(({ offchainAddr, boardingAddr }) => {
        if (!offchainAddr) throw 'Unable to get offchain address'
        if (!boardingAddr) throw 'Unable to get boarding address'
        setRecvInfo({ ...recvInfo, boardingAddr, offchainAddr, satoshis: 0, addressError: undefined })
        setAddressesLoaded(true)
      })
      .catch((err) => {
        const error = extractError(err)
        consoleError(error, 'error getting addresses')
        setRecvInfo({ ...recvInfo, addressError: error })
        setAddressesLoaded(true)
      })
  }, [svcWallet])

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
      if (invoice) return reject()
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
    if (!addressesLoaded) return

    const lnExpected = connected && !isAssetReceive

    if (!arkadeSwaps) {
      if (!lnExpected || swapsInitError) {
        if (lnExpected && swapsInitError) {
          consoleError(swapsInitError, 'Swaps unavailable, showing receive without swap options')
          setSwapsTimedOut(true)
        }
        setShowQrCode(true)
        return
      }
      const timeout = setTimeout(() => {
        setSwapsTimedOut(true)
        setShowQrCode(true)
      }, 5_000)
      return () => clearTimeout(timeout)
    }

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
        const inv = pendingSwap.response.invoice
        setInvoice(inv)
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
  }, [satoshis, svcWallet, arkadeSwaps, swapsInitError, addressesLoaded])

  // Build BIP21 URI
  useEffect(() => {
    if (!addressesLoaded && !showQrCode) return

    const recvOffchain = recvInfo.offchainAddr
    const recvBoarding = recvInfo.boardingAddr

    const ark = validVtxoTx(satoshis) && vtxoTxsAllowed() ? recvOffchain : ''
    const btc = validUtxoTx(satoshis) && utxoTxsAllowed() ? swapAddress || recvBoarding : ''

    const bip21uri = isAssetReceive
      ? encodeBip21Asset(ark, assetId, centsToUnits(satoshis, assetMeta?.metadata?.decimals))
      : encodeBip21(btc, ark, invoice, satoshis)

    setNoPaymentMethods(!ark && !btc && !invoice && !isAssetReceive)
    setArkAddress(ark)
    setBtcAddress(btc)
    setQrCodeValue(bip21uri)
    setBip21Uri(bip21uri)
  }, [showQrCode, swapAddress, invoice, addressesLoaded, recvInfo.offchainAddr, recvInfo.boardingAddr, satoshis])

  // Payment listener
  useEffect(() => {
    if (!svcWallet) return

    const listenForPayments = (event: MessageEvent) => {
      let sats = 0
      let receivedAssets: Asset[] = []

      if (event.data && event.data.type === 'VTXO_UPDATE') {
        const newVtxos = event.data.payload?.newVtxos
        if (Array.isArray(newVtxos)) {
          sats = (newVtxos as ExtendedVirtualCoin[]).reduce((acc, v) => acc + v.value, 0)
          for (const v of newVtxos as ExtendedVirtualCoin[]) {
            receivedAssets.push(...(v.assets ?? []))
          }
        } else {
          consoleError('VTXO_UPDATE message has unexpected payload shape:', event.data.payload)
        }
      }

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
          sats = (coins as Coin[]).reduce((acc, v) => acc + v.value, 0)
        } else {
          consoleError('UTXO_UPDATE message has unexpected payload shape:', event.data.payload)
        }
      }

      if (sats || receivedAssets.length > 0) {
        setRecvInfo({ ...recvInfo, satoshis: sats, receivedAssets })
        if (!isAssetReceive) notifyPaymentReceived(sats)
        navigate(Pages.ReceiveSuccess)
      }
    }

    navigator.serviceWorker.addEventListener('message', listenForPayments)
    return () => navigator.serviceWorker.removeEventListener('message', listenForPayments)
  }, [svcWallet])

  // Handlers
  const handleShare = () => {
    setSharing(true)
    shareData(data)
      .catch(consoleError)
      .finally(() => setSharing(false))
  }

  const handleCopy = async (value: string) => {
    hapticSubtle()
    await copyToClipboard(value)
    toast('Copied to clipboard')
    setCopied(value)
  }

  const handleAmountChange = (sats: number) => {
    setAmountInput(sats)
    const value = useFiat ? toFiat(sats) : sats
    const maxFrac = useFiat ? 2 : 0
    setAmountTextValue(prettyNumber(value, maxFrac, false))
  }

  const handleAmountConfirm = () => {
    setShowKeys(false)
    setShowAmountSheet(false)
    setRecvInfo({ ...recvInfo, satoshis: amountInput })
  }

  const handleAmountClear = () => {
    setAmountInput(0)
    setAmountTextValue('')
    setShowKeys(false)
    setShowAmountSheet(false)
    setRecvInfo({ ...recvInfo, satoshis: 0 })
  }

  const data = { title: 'Receive', text: qrCodeValue }
  const shareDisabled = !canBrowserShareData(data) || sharing || hasError || noPaymentMethods

  // Mobile keyboard — bypass sheet on save, go straight to QR
  if (showKeys) {
    return (
      <Keyboard
        back={() => {
          setShowKeys(false)
          setShowAmountSheet(false)
        }}
        hideBalance
        onSats={(sats) => {
          setAmountInput(sats)
          setRecvInfo({ ...recvInfo, satoshis: sats })
        }}
        value={amountInput}
      />
    )
  }

  const amountLabel = satoshis ? 'Edit amount' : 'Add amount'

  return (
    <>
      <Header text='Receive' back={() => navigate(Pages.Wallet)} />
      <Content noFade>
        <Padded>
          {hasError ? (
            <ErrorMessage error text={`Failed to get address: ${addressError}`} />
          ) : !addressesLoaded || (!qrCodeValue && !noPaymentMethods) ? (
            <Loading text='Loading...' />
          ) : noPaymentMethods ? (
            <div>No valid payment methods available for this amount</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 2rem)', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <QrCode value={qrCodeValue} />
                  {satoshis > 0 ? (
                    <div style={{ fontSize: '14px', color: 'var(--dark50)', marginTop: '0.5rem' }}>
                      Requesting {prettyNumber(satoshis)} sats
                    </div>
                  ) : null}
                  {(!satoshis || satoshis < 500) && !isAssetReceive ? (
                    <div style={{ fontSize: '13px', color: 'var(--dark50)', marginTop: '0.25rem' }}>
                      500 sats min for Lightning
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ paddingBottom: '1.5rem' }}>
                <FlexCol strech>
                  {swapsTimedOut && !invoice && !isAssetReceive ? (
                    <WarningBox text='Lightning is temporarily unavailable. This QR code only supports Arkade and on-chain payments.' />
                  ) : null}
                  <FlexRow centered gap='0.5rem'>
                    <div style={{ flex: 1 }}>
                      <Button label={amountLabel} onClick={() => setShowAmountSheet(true)} secondary />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Button label='Copy' onClick={() => setShowCopySheet(true)} secondary />
                    </div>
                  </FlexRow>
                  <Button label='Share' onClick={handleShare} disabled={shareDisabled} />
                </FlexCol>
              </div>
            </div>
          )}
        </Padded>
      </Content>

      {/* Amount bottom sheet */}
      <SheetModal isOpen={showAmountSheet} onClose={() => setShowAmountSheet(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>Set amount</Text>
          <InputAmount
            name='receive-amount-sheet'
            focus={!isMobileBrowser}
            label='Amount'
            onSats={handleAmountChange}
            onFocus={() => {
              if (isMobileBrowser) setShowKeys(true)
            }}
            readOnly={isMobileBrowser}
            value={amountTextValue ? Number(amountTextValue) : undefined}
            sats={amountInput}
            onEnter={handleAmountConfirm}
          />
          <Button label='Set amount' onClick={handleAmountConfirm} disabled={!amountInput} />
          {satoshis > 0 ? <Button label='Clear amount' onClick={handleAmountClear} secondary /> : null}
        </FlexCol>
      </SheetModal>

      {/* Copy address bottom sheet */}
      <SheetModal isOpen={showCopySheet} onClose={() => setShowCopySheet(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>Copy address</Text>
          <AddressList
            bip21Uri={bip21Uri}
            btcAddress={btcAddress}
            arkAddress={arkAddress}
            invoice={invoice}
            onCopy={handleCopy}
            onSelect={(v) => {
              setQrCodeValue(v)
              setShowCopySheet(false)
            }}
            copied={copied}
          />
        </FlexCol>
      </SheetModal>
    </>
  )
}

function AddressList({
  bip21Uri,
  btcAddress,
  arkAddress,
  invoice,
  onCopy,
  onSelect,
  copied,
}: {
  bip21Uri: string
  btcAddress: string
  arkAddress: string
  invoice: string
  onCopy: (value: string) => void
  onSelect: (value: string) => void
  copied: string
}) {
  return (
    <FlexCol gap='0.75rem'>
      {bip21Uri ? (
        <AddressLine
          testId='bip21'
          title='Unified'
          value={bip21Uri}
          onCopy={onCopy}
          onSelect={onSelect}
          copied={copied}
        />
      ) : null}
      {invoice ? (
        <AddressLine
          testId='invoice'
          title='Lightning invoice'
          value={invoice}
          onCopy={onCopy}
          onSelect={onSelect}
          copied={copied}
        />
      ) : null}
      {arkAddress ? (
        <AddressLine
          testId='ark'
          title='Arkade address'
          value={arkAddress}
          onCopy={onCopy}
          onSelect={onSelect}
          copied={copied}
        />
      ) : null}
      {btcAddress ? (
        <AddressLine
          testId='btc'
          title='Bitcoin address'
          value={btcAddress}
          onCopy={onCopy}
          onSelect={onSelect}
          copied={copied}
        />
      ) : null}
    </FlexCol>
  )
}

function AddressLine({
  testId,
  title,
  value,
  onCopy,
  onSelect,
  copied,
}: {
  testId: string
  title: string
  value: string
  onCopy: (value: string) => void
  onSelect: (value: string) => void
  copied: string
}) {
  return (
    <Focusable
      onEnter={() => {
        onCopy(value)
        onSelect(value)
      }}
    >
      <FlexRow between onClick={() => onSelect(value)}>
        <FlexCol gap='0'>
          <TextSecondary>{title}</TextSecondary>
          <Text>{prettyLongText(value, 12)}</Text>
        </FlexCol>
        <button
          type='button'
          aria-label={`Copy ${title}`}
          data-testid={testId + '-address-copy'}
          onClick={(e) => {
            e.stopPropagation()
            onCopy(value)
          }}
          style={{
            alignItems: 'center',
            background: 'var(--dark05)',
            border: 'none',
            borderRadius: '8px',
            color: 'var(--dark30)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            minWidth: '44px',
            minHeight: '44px',
            padding: 0,
            touchAction: 'manipulation',
          }}
        >
          {copied === value ? <CheckMarkIcon /> : <CopyIcon />}
        </button>
      </FlexRow>
    </Focusable>
  )
}
