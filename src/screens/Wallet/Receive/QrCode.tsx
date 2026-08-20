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
import { Asset, Coin, ExtendedVirtualCoin, type NetworkName } from '@arkade-os/sdk'
import { LockupRegistrationFailed } from '@arkade-os/swap'
import LoadingLogo from '../../../components/LoadingLogo'
import { encodeBip21, encodeBip21Asset } from '../../../lib/bip21'
import { unitsToCents } from '../../../lib/assets'
import ErrorMessage from '../../../components/Error'
import { getReceivingAddresses } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import { LnReceiveHeldElsewhere, requestLnReceive } from '../../../lib/lnReceive'
import { lnReceiveRendezvous } from '../../../lib/lnSwap'
import { getEmulatorPubkeyForNetwork } from '../../../lib/constants'
import { withRfqTransport } from '../../../lib/nostrRfq'
import { discoverMarkets } from '../../../lib/swapMarkets'
import InputAmount from '../../../components/InputAmount'
import Keyboard, { KeyboardInputMode } from '../../../components/Keyboard'
import SheetModal from '../../../components/SheetModal'
import Text, { TextSecondary } from '../../../components/Text'
import { copyToClipboard } from '../../../lib/clipboard'
import { useToast } from '../../../components/Toast'
import { prettyLongText, prettyNumber, toSatoshis } from '../../../lib/format'
import CopyIcon from '../../../icons/Copy'
import CheckMarkIcon from '../../../icons/CheckMark'
import { hapticSubtle } from '../../../lib/haptics'
import { isMobileBrowser } from '../../../lib/browser'
import Focusable from '../../../components/Focusable'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { AssetOption, Unit } from '../../../lib/types'
import { EASE_OUT_QUINT } from '../../../lib/animations'
import { walletAssetPresentationForId } from '../../../lib/accountAssets'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { AspContext } from '../../../providers/asp'
import { AssetsContext } from '../../../providers/assets'
import { LnReceiveContext } from '../../../providers/lnReceive'

/**
 * Decide which value the QR should encode. Honours an explicit copy-sheet
 * selection, but only while that value is still one we currently offer — once
 * the selected address is regenerated or removed (e.g. an amount
 * change), fall back to the unified BIP21 URI. This stops async rebuilds from
 * silently reverting the user's pick and copying the wrong thing.
 */
export const resolveQrValue = (selected: string, options: { bip21: string; btc: string; ark: string }): string => {
  const candidates = [options.bip21, options.btc, options.ark].filter(Boolean)
  return selected && candidates.includes(selected) ? selected : options.bip21
}

export default function ReceiveQRCode() {
  const { aspInfo } = useContext(AspContext)
  const { isRegistered } = useContext(AssetsContext)
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat } = useContext(FiatContext)
  const { navigate } = useContext(NavigationContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { track, status, error: claimErrorFor } = useContext(LnReceiveContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { assetMetadataCache, svcWallet } = useContext(WalletContext)
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)

  const { toast } = useToast()

  const [assetAmount, setAssetAmount] = useState(BigInt(0))
  const [amountTextValue, setAmountTextValue] = useState('')

  const [sharing, setSharing] = useState(false)
  const [addressesLoaded, setAddressesLoaded] = useState(false)
  const [qrTransform, setQrTransform] = useState('')

  // Amount sheet state
  const [showAmountSheet, setShowAmountSheet] = useState(false)
  const [showKeys, setShowKeys] = useState(false)

  // Copy address sheet state
  const [showCopySheet, setShowCopySheet] = useState(false)
  const [copied, setCopied] = useState('')

  const prefersReducedMotion = useReducedMotion()

  // Receive methods
  const { boardingAddr, offchainAddr, satoshis, assetId, addressError } = recvInfo
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const isAssetReceive = assetId && assetId !== ''
  const hasError = Boolean(addressError)

  const [noPaymentMethods, setNoPaymentMethods] = useState(false)
  const [arkAddress, setArkAddress] = useState(offchainAddr)
  const [btcAddress, setBtcAddress] = useState(boardingAddr)
  const [qrCodeValue, setQrCodeValue] = useState('')
  const [selectedValue, setSelectedValue] = useState('')
  const [bip21Uri, setBip21Uri] = useState('')
  const [lnReceiveError, setLnReceiveError] = useState('')
  // A negotiation that failed at the local registration step left nothing
  // payable behind, so the offer of a retry is honest — see the catch below.
  const [lnRetryable, setLnRetryable] = useState(false)
  // Told apart from every other failure because it is not one: another tab of
  // this wallet holds the receive manager's lock and is driving these swaps
  // perfectly well. "Lightning unavailable" would be false, and a retry button
  // would do nothing until that tab closes.
  const [lnHeldElsewhere, setLnHeldElsewhere] = useState(false)
  const [negotiateAttempt, setNegotiateAttempt] = useState(0)

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

  const createBip21 = (): { ark: string; btc: string; bip21: string } => {
    const ark = vtxoTxsAllowed() ? recvInfo.offchainAddr : ''
    const btc = utxoTxsAllowed() ? recvInfo.boardingAddr : ''
    const bip21 = isAssetReceive
      ? encodeBip21Asset(ark, assetId, assetAmount, assetMeta?.metadata?.decimals)
      : encodeBip21(btc, ark, recvInfo.invoice ?? '', satoshis, '')

    return { ark, btc, bip21 }
  }

  /**
   * Negotiate a Lightning receive once an amount is set.
   *
   * Gated on an amount because the corridor requires one: the solver mints the
   * invoice, so nothing else implies what it is for. An amount outside the
   * card's bounds or an unserved corridor leaves the other payment methods
   * working — this is an EXTRA way to be paid, so a failure here must not take
   * the ark and on-chain addresses down with it.
   *
   * A solver serving the corridor is the only requirement: `LnReceiveProvider`
   * claims the lockup, so no covclaimd needs to be deployed or reachable for the
   * corridor to be offered.
   */
  useEffect(() => {
    // Cleared BEFORE the guards, not beside `negotiate` below. Clearing the
    // amount reruns this effect straight into the early return, and flags left
    // set there strand the message on a screen that is no longer negotiating —
    // with a "Try again" that reruns the effect back into the same guard and
    // does nothing at all.
    setLnReceiveError('')
    setLnRetryable(false)
    setLnHeldElsewhere(false)
    if (!svcWallet || isAssetReceive || satoshis <= 0) return
    if (recvInfo.pendingLnReceive?.payAmount && recvInfo.invoice) return
    const network = aspInfo.network as NetworkName

    let abandoned = false
    const negotiate = async () => {
      // per-network pin as the fallback co-signer key, for solver cards that
      // predate `emulator_pubkey` — the card's own value wins where it has one.
      const rendezvous = lnReceiveRendezvous(await discoverMarkets(network), getEmulatorPubkeyForNetwork(network))
      if (!rendezvous) throw new Error('No Lightning solver available')
      if (satoshis < rendezvous.minSats || satoshis > rendezvous.maxSats) {
        throw new Error(
          `Amount outside solver bounds (${prettyNumber(rendezvous.minSats)}-${prettyNumber(rendezvous.maxSats)} sats)`,
        )
      }
      const pending = await withRfqTransport(rendezvous, (transport) =>
        requestLnReceive({
          wallet: svcWallet,
          arkServerUrl: aspInfo.url,
          transport,
          rendezvous,
          network,
          amountSats: satoshis,
        }),
      )
      if (abandoned) return
      // Monitored BEFORE the invoice reaches the screen. The payer cannot pay
      // an invoice they have not seen, so this cannot be late — but the
      // ordering is what keeps the monitored set a superset of what is payable.
      await track(pending)
      setLnReceiveError('')
      setRecvInfo((prev) => ({
        ...prev,
        invoice: pending.invoice,
        pendingLnReceive: {
          rfqId: pending.rfqId,
          invoice: pending.invoice,
          payAmount: pending.payAmount,
          invoiceExpiresAt: pending.invoiceExpiresAt,
        },
      }))
    }

    negotiate().catch((err) => {
      if (abandoned) return
      const error = extractError(err)
      consoleError(error, 'error negotiating lightning receive')
      setLnHeldElsewhere(err instanceof LnReceiveHeldElsewhere)
      setLnReceiveError(error)
      // The one failure here that is not "Lightning is unavailable": the quote
      // was fine and our own contract store refused the write. No invoice came
      // back, so the abandoned quote is inert and cannot be resumed — calling
      // again is the fix, and it derives a fresh preimage and rfq id.
      setLnRetryable(err instanceof LockupRegistrationFailed)
    })
    // The amount changed under an in-flight negotiation, so its invoice would
    // be for the wrong number. Nothing to cancel on the solver — an unpaid hold
    // invoice simply expires.
    return () => {
      abandoned = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcWallet, satoshis, isAssetReceive, aspInfo.network, negotiateAttempt])

  // Build BIP21 URI
  useEffect(() => {
    if (!addressesLoaded) return

    const { ark, btc, bip21 } = createBip21()

    setNoPaymentMethods(!ark && !btc && !isAssetReceive)
    setArkAddress(ark)
    setBtcAddress(btc)
    setBip21Uri(bip21)
    // Preserve an explicit copy-sheet selection across rebuilds; only fall back
    // to the unified URI when the selected value is no longer one we offer.
    setQrCodeValue(resolveQrValue(selectedValue, { bip21, btc, ark }))
  }, [
    assetAmount,
    addressesLoaded,
    selectedValue,
    recvInfo.offchainAddr,
    recvInfo.boardingAddr,
    recvInfo.satoshis,
    recvInfo.invoice,
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
        const existing = acc.find((a: Asset) => a.assetId === v.assetId)
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

  const handleCopyButton = async () => {
    if (!prefersReducedMotion) hapticSubtle()
    setShowCopySheet(true)
    if (qrCodeValue && copied !== qrCodeValue) {
      await copyToClipboard(qrCodeValue)
      toast('Copied to clipboard')
      setCopied(qrCodeValue)
    }
  }

  const handleAmountConfirm = (value = amountTextValue, inputMode?: KeyboardInputMode) => {
    setShowKeys(false)
    setShowAmountSheet(false)
    if (assetMeta) {
      const decimals = assetMeta.metadata?.decimals
      const cents = unitsToCents(value, decimals)
      return setAssetAmount(cents)
    } else {
      const num = Number(value)
      if (Number.isNaN(num) || !Number.isFinite(num)) throw new Error('Invalid amount')
      const shouldConvertFromFiat = inputMode === 'fiat' || (useFiat && inputMode === undefined)
      const shouldConvertToSats = inputMode === 'btc' || (!useFiat && config.unit === Unit.BTC)
      const sats = shouldConvertFromFiat ? fromFiat(num) : shouldConvertToSats ? toSatoshis(num) : num
      if (sats === satoshis) return setRecvInfo({ ...recvInfo, satoshis: sats })
      // The negotiated invoice is for the old amount, and the negotiate effect
      // refuses to renegotiate while one exists — so leaving it in place would
      // keep showing an invoice for a number the user just changed. The
      // superseded swap stays monitored until it settles or its window shuts;
      // what must stop is presenting its invoice.
      setRecvInfo({ ...recvInfo, satoshis: sats, invoice: undefined, pendingLnReceive: undefined })
    }
  }

  const handleAmountClear = () => {
    handleAmountConfirm('0')
    setAmountTextValue('')
  }

  const assetPresentation = walletAssetPresentationForId(
    aspInfo.network,
    assetId,
    isRegistered,
    assetMeta?.metadata,
    '',
  )
  const assetOption: AssetOption = {
    assetId: assetId ?? '',
    name: assetPresentation.name,
    ticker: assetPresentation.ticker,
    balance: BigInt(0),
    decimals: assetMeta?.metadata?.decimals ?? 0,
    icon: assetPresentation.icon,
    trusted: Boolean(assetId && isRegistered(assetId)),
  }

  // What the monitored receive is doing, if there is one. The VTXO listener
  // above still reports the credit; this is what can say the payment was LOST —
  // `refunded` on a receive leg means the solver reclaimed a lockup we never
  // claimed, which nothing else on this screen could distinguish from waiting.
  const rfqId = recvInfo.pendingLnReceive?.rfqId
  const receiveState = rfqId ? status(rfqId) : undefined
  const claimError = rfqId ? claimErrorFor(rfqId) : undefined
  const receiveLost = receiveState === 'refunded'

  const data = { title: 'Receive', text: qrCodeValue }
  const shareDisabled = !canBrowserShareData(data) || sharing || hasError || noPaymentMethods

  // Whether an amount is currently requested. Keyed off assetMeta to match how
  // handleAmountConfirm/handleAmountClear decide between asset units and sats.
  const hasAmount = assetMeta ? assetAmount > BigInt(0) : satoshis > 0

  // Mobile keyboard — bypass sheet on save, go straight to QR
  if (showKeys) {
    return (
      <Keyboard
        hideBalance
        asset={assetOption}
        back={() => {
          setShowKeys(false)
          setShowAmountSheet(false)
        }}
        initialValue={assetAmount || satoshis}
        onClear={hasAmount ? handleAmountClear : undefined}
        onSave={(value: string, inputMode: KeyboardInputMode) => {
          setShowKeys(false)
          setShowAmountSheet(false)
          handleAmountConfirm(value, inputMode)
        }}
      />
    )
  }

  const amountLabel = hasAmount ? 'Edit amount' : 'Add amount'
  const unitLabel = assetMeta ? assetPresentation.ticker : 'sats'

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
            <p>No valid payment methods available for this amount</p>
          ) : (
            <FlexCol gap='0.5rem' centered>
              {/* Two different things, told apart. "No solver" leaves the ark
                  and on-chain addresses working and is worth no more than a
                  grey line; a payment that was paid and then lost, or a claim
                  that keeps failing, is not. */}
              {receiveLost ? (
                <ErrorMessage error text='Lightning payment lost: the solver reclaimed it before it could be claimed' />
              ) : claimError ? (
                <ErrorMessage error text={`Claiming the Lightning payment failed: ${claimError}`} />
              ) : null}
              {lnReceiveError ? (
                <FlexCol gap='0.25rem' centered>
                  <TextSecondary>
                    {lnHeldElsewhere
                      ? 'Another tab is handling Lightning receives — close it to receive here'
                      : `Lightning unavailable: ${lnReceiveError}`}
                  </TextSecondary>
                  {lnRetryable ? (
                    <Button label='Try again' onClick={() => setNegotiateAttempt((n) => n + 1)} secondary />
                  ) : null}
                </FlexCol>
              ) : null}
              <button
                type='button'
                onClick={() => handleCopy(qrCodeValue)}
                onPointerDown={() => setQrTransform(prefersReducedMotion ? '' : 'scale(0.97)')}
                onPointerUp={() => setQrTransform('')}
                onPointerLeave={() => setQrTransform('')}
                onPointerCancel={() => setQrTransform('')}
                aria-label='Copy QR code'
                style={{
                  padding: 0,
                  width: '100%',
                  border: 'none',
                  margin: '0 auto',
                  display: 'block',
                  marginTop: '5rem',
                  maxWidth: '340px',
                  cursor: 'pointer',
                  background: 'none',
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
                <Text small color='neutral-500'>
                  Requesting {prettyNumber(satoshis, 0)} {unitLabel}
                </Text>
              ) : null}
            </FlexCol>
          )}
        </Padded>
      </Content>

      <ButtonsOnBottom>
        <FlexRow gap='0.75rem'>
          <Button
            label={amountLabel}
            onClick={() => (isMobileBrowser ? setShowKeys(true) : setShowAmountSheet(true))}
            secondary
          />
          <Button label='Copy' onClick={handleCopyButton} secondary />
        </FlexRow>
        <Button label='Share' onClick={handleShare} disabled={shareDisabled} />
      </ButtonsOnBottom>

      {/* Amount bottom sheet */}
      <SheetModal isOpen={showAmountSheet} onClose={() => setShowAmountSheet(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            Add amount
          </Text>
          <InputAmount
            label='Amount'
            asset={assetOption}
            value={amountTextValue}
            focus={!isMobileBrowser}
            readOnly={isMobileBrowser}
            name='receive-amount-sheet'
            onChange={setAmountTextValue}
            onEnter={handleAmountConfirm}
            onFocus={() => setShowKeys(isMobileBrowser)}
          />
          <Button label='Set amount' onClick={() => handleAmountConfirm()} disabled={!amountTextValue} />
          {hasAmount ? <Button label='Clear amount' onClick={handleAmountClear} secondary /> : null}
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
            invoice={recvInfo.invoice ?? ''}
            onCopy={handleCopy}
            onSelect={(v) => {
              setSelectedValue(v)
              setQrCodeValue(v)
              handleCopy(v)
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
        // onSelect copies + switches the QR; avoid copying twice
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
