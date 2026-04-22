import { useCallback, useContext, useEffect, useState } from 'react'
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
import LoadingLogo from '../../../components/LoadingLogo'
import { SwapsContext } from '../../../providers/swaps'
import { encodeBip21, encodeBip21Asset } from '../../../lib/bip21'
import { BoltzChainSwap, BoltzReverseSwap } from '@arkade-os/boltz-swap'
import { enableChainSwapsReceive, lnurlServerUrl } from '../../../lib/constants'
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
import { useLnurlSession } from '../../../hooks/useLnurlSession'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { AssetOption } from '../../../lib/types'
import { EASE_OUT_QUINT } from '../../../lib/animations'

export default function ReceiveQRCode() {
  const { useFiat } = useContext(ConfigContext)
  const { toFiat, fiatDecimals } = useContext(FiatContext)
  const { navigate } = useContext(NavigationContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { arkadeSwaps, swapsInitError, connected, createBtcToArkSwap, createReverseSwap } = useContext(SwapsContext)
  const { assetMetadataCache, svcWallet } = useContext(WalletContext)
  const { minSwapAllowed, validBtcToArk, validLnSwap, validUtxoTx, validVtxoTx, utxoTxsAllowed, vtxoTxsAllowed } =
    useContext(LimitsContext)

  const { toast } = useToast()

  const [sharing, setSharing] = useState(false)
  const [addressesLoaded, setAddressesLoaded] = useState(false)
  const [qrTransform, setQrTransform] = useState('')

  // Amount sheet state
  const [showAmountSheet, setShowAmountSheet] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [amountInput, setAmountInput] = useState(0)
  const [amountTextValue, setAmountTextValue] = useState('')

  // Copy address sheet state
  const [showCopySheet, setShowCopySheet] = useState(false)
  const [copied, setCopied] = useState('')

  const prefersReducedMotion = useReducedMotion()

  // Receive methods
  const { boardingAddr, offchainAddr, satoshis, assetId, addressError, received } = recvInfo
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

  // LNURL session for amountless Lightning receives
  const isAmountlessLnurl =
    !satoshis && !isAssetReceive && !!lnurlServerUrl && connected && !!arkadeSwaps && !swapsInitError

  const handleInvoiceRequest = useCallback(
    async (req: { amountMsat: number }) => {
      const sats = Math.floor(req.amountMsat / 1000)
      const pendingSwap = await createReverseSwap(sats)
      if (!pendingSwap) throw new Error('Failed to create reverse swap')
      // Auto-claim in background
      if (arkadeSwaps) {
        arkadeSwaps
          .waitAndClaim(pendingSwap)
          .then(() => {
            setRecvInfo({ ...recvInfo, received: true, satoshis: pendingSwap.response.onchainAmount ?? 0 })
            notifyPaymentReceived(pendingSwap.response.onchainAmount ?? 0)
            navigate(Pages.ReceiveSuccess)
          })
          .catch((err) => consoleError(err, 'Error claiming LNURL reverse swap'))
      }
      return pendingSwap.response.invoice
    },
    [arkadeSwaps, createReverseSwap, setRecvInfo, recvInfo, navigate, notifyPaymentReceived],
  )
  const lnurlSession = useLnurlSession(isAmountlessLnurl, handleInvoiceRequest)

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

  const createBip21 = (sats = satoshis): { ark: string; btc: string; bip21: string } => {
    const ark = validVtxoTx(sats) && vtxoTxsAllowed() ? recvInfo.offchainAddr : ''
    const btc = validUtxoTx(sats) && utxoTxsAllowed() ? swapAddress || recvInfo.boardingAddr : ''
    const bip21 = isAssetReceive
      ? encodeBip21Asset(ark, assetId, centsToUnits(sats, assetMeta?.metadata?.decimals))
      : encodeBip21(btc, ark, invoice, sats, lnurlSession.lnurl)

    return { ark, btc, bip21 }
  }

  useEffect(() => {
    if (isAssetReceive) return setShowQrCode(true)
    if (!satoshis || !svcWallet) return
    if (!addressesLoaded) return
    if (received) return

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
        const pendingSwap = btc.value as BoltzChainSwap
        const btcAddr = pendingSwap.response.lockupDetails.lockupAddress
        setSwapAddress(btcAddr)
        arkadeSwaps
          .waitAndClaimArk(pendingSwap)
          .then(() => {
            setRecvInfo({ ...recvInfo, received: true, satoshis: pendingSwap.response.claimDetails.amount })
            navigate(Pages.ReceiveSuccess)
          })
          .catch((error) => {
            consoleError(error, 'Error claiming chain swap:')
          })
      }
      if (lightning.status === 'fulfilled') {
        const pendingSwap = lightning.value as BoltzReverseSwap
        const inv = pendingSwap.response.invoice
        setInvoice(inv)
        arkadeSwaps
          .waitAndClaim(pendingSwap)
          .then(() => {
            setRecvInfo({ ...recvInfo, received: true, satoshis: pendingSwap.response.onchainAmount ?? 0 })
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

    const { ark, btc, bip21 } = createBip21()
    const hasLnurl = isAmountlessLnurl && lnurlSession.active

    setNoPaymentMethods(!ark && !btc && !invoice && !hasLnurl && !isAssetReceive)
    setArkAddress(ark)
    setBtcAddress(btc)
    setBip21Uri(bip21)
    setQrCodeValue(bip21)
  }, [
    showQrCode,
    swapAddress,
    invoice,
    addressesLoaded,
    recvInfo.offchainAddr,
    recvInfo.boardingAddr,
    satoshis,
    lnurlSession.lnurl,
    lnurlSession.active,
    isAmountlessLnurl,
  ])

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
        setRecvInfo({ ...recvInfo, received: true, satoshis: sats, receivedAssets })
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
    if (!prefersReducedMotion) hapticSubtle()
    await copyToClipboard(value)
    toast('Copied to clipboard')
    setShowCopySheet(false)
    setCopied(value)
  }

  const handleAmountChange = (sats: number) => {
    setAmountInput(sats)
    const value = assetMeta ? centsToUnits(sats, assetMeta.metadata?.decimals) : useFiat ? toFiat(sats) : sats
    const maximumFractionDigits = useFiat
      ? fiatDecimals()
      : assetMeta?.metadata?.decimals
        ? assetMeta?.metadata?.decimals
        : 0
    setAmountTextValue(prettyNumber(value, maximumFractionDigits, false))
  }

  const handleAmountConfirm = (sats = amountInput) => {
    setShowKeys(false)
    setShowAmountSheet(false)
    // if amount was changed, we need to reset invoice and swap address, since they are amount-specific
    // this will also trigger the useEffect to create new ones if needed
    if (sats !== satoshis) {
      setInvoice('')
      setSwapAddress('')
      setShowQrCode(false)
    }
    setRecvInfo({ ...recvInfo, satoshis: sats })
  }

  const handleAmountClear = () => {
    handleAmountChange(0)
    handleAmountConfirm(0)
  }

  const assetOption: AssetOption = {
    assetId: assetId ?? '',
    name: assetMeta?.metadata?.name ?? '',
    ticker: assetMeta?.metadata?.ticker ?? '',
    balance: 0,
    decimals: assetMeta?.metadata?.decimals ?? 0,
    icon: assetMeta?.metadata?.icon,
  }

  const data = { title: 'Receive', text: qrCodeValue }
  const shareDisabled = !canBrowserShareData(data) || sharing || hasError || noPaymentMethods

  // Mobile keyboard — bypass sheet on save, go straight to QR
  if (showKeys) {
    return (
      <Keyboard
        asset={assetOption}
        back={() => {
          setShowKeys(false)
          setShowAmountSheet(false)
        }}
        hideBalance
        onSave={(sats: number) => {
          setShowKeys(false)
          setShowAmountSheet(false)
          handleAmountChange(sats)
          handleAmountConfirm(sats)
        }}
        value={amountInput}
      />
    )
  }

  const amountLabel = satoshis ? 'Edit amount' : 'Add amount'
  const unitLabel = assetMeta?.metadata?.ticker ?? 'sats'

  return (
    <>
      <Header text='Receive' back={() => navigate(Pages.Wallet)} />
      <Content noFade>
        <Padded>
          {hasError ? (
            <ErrorMessage error text={`Failed to get address: ${addressError}`} />
          ) : !addressesLoaded || (!qrCodeValue && !noPaymentMethods) ? (
            <LoadingLogo text='Loading...' />
          ) : noPaymentMethods ? (
            <div>No valid payment methods available for this amount</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 2rem)', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <button
                    type='button'
                    onClick={() => handleCopy(qrCodeValue)}
                    onPointerDown={() => setQrTransform(prefersReducedMotion ? '' : 'scale(0.97)')}
                    onPointerUp={() => setQrTransform('')}
                    onPointerLeave={() => setQrTransform('')}
                    onPointerCancel={() => setQrTransform('')}
                    aria-label='Copy QR code'
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      margin: '0 auto',
                      display: 'block',
                      width: '100%',
                      maxWidth: '340px',
                      cursor: 'pointer',
                      transition: prefersReducedMotion
                        ? 'none'
                        : `transform 240ms cubic-bezier(${EASE_OUT_QUINT.join(',')})`,
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      transform: qrTransform,
                    }}
                  >
                    <QrCode value={qrCodeValue} />
                  </button>
                  {satoshis > 0 ? (
                    <div style={{ fontSize: '14px', color: 'var(--dark50)', marginTop: '0.5rem' }}>
                      Requesting {prettyNumber(satoshis)} {unitLabel}
                    </div>
                  ) : null}
                  {(!satoshis || satoshis < minSwapAllowed()) && !isAssetReceive ? (
                    <div style={{ fontSize: '13px', color: 'var(--dark50)', marginTop: '0.25rem' }}>
                      {minSwapAllowed()} sats min for Lightning
                    </div>
                  ) : null}
                  {swapsTimedOut && !invoice && !isAssetReceive ? (
                    <WarningBox text='Lightning is temporarily unavailable. This QR code only supports Arkade and on-chain payments.' />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </Padded>
      </Content>

      <ButtonsOnBottom>
        <FlexCol gap='0'>
          <FlexRow gap='0.5rem'>
            <Button label={amountLabel} onClick={() => setShowAmountSheet(true)} secondary />
            <Button label='Copy' onClick={() => setShowCopySheet(true)} secondary />
          </FlexRow>
          <Button label='Share' onClick={handleShare} disabled={shareDisabled} />
        </FlexCol>
      </ButtonsOnBottom>

      {/* Amount bottom sheet */}
      <SheetModal isOpen={showAmountSheet} onClose={() => setShowAmountSheet(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            Add amount
          </Text>
          <InputAmount
            asset={assetOption}
            name='receive-amount-sheet'
            focus={!isMobileBrowser}
            label='Amount'
            onSats={handleAmountChange}
            onFocus={() => setShowKeys(isMobileBrowser)}
            readOnly={isMobileBrowser}
            value={amountTextValue ? Number(amountTextValue) : undefined}
            sats={amountInput}
            onEnter={handleAmountConfirm}
          />
          <Button label='Set amount' onClick={() => handleAmountConfirm()} disabled={!amountInput} />
          {satoshis > 0 ? <Button label='Clear amount' onClick={handleAmountClear} secondary /> : null}
        </FlexCol>
      </SheetModal>

      {/* Copy address bottom sheet */}
      <SheetModal isOpen={showCopySheet} onClose={() => setShowCopySheet(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            Copy address
          </Text>
          <AddressList
            bip21Uri={bip21Uri}
            btcAddress={btcAddress}
            arkAddress={arkAddress}
            lnurl={lnurlSession.lnurl}
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
  lnurl,
  onCopy,
  onSelect,
  copied,
}: {
  bip21Uri: string
  btcAddress: string
  arkAddress: string
  invoice: string
  lnurl: string
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
      {lnurl ? (
        <AddressLine
          testId='lnurl'
          title='LNURL address'
          value={lnurl}
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
        <Button
          copy
          ariaLabel={`Copy ${title}`}
          testId={testId + '-address-copy'}
          onClick={(event) => {
            event.stopPropagation()
            onCopy(value)
          }}
        >
          {copied === value ? <CheckMarkIcon /> : <CopyIcon />}
        </Button>
      </FlexRow>
    </Focusable>
  )
}
