import { useContext, useEffect, useMemo, useState } from 'react'
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
import { encodeBip21, encodeBip21Asset } from '../../../lib/bip21'
import { unitsToAtomic } from '../../../lib/assets'
import ErrorMessage from '../../../components/Error'
import { getReceivingAddresses } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import InputAmount from '../../../components/InputAmount'
import Keyboard, { KeyboardInputMode } from '../../../components/Keyboard'
import SheetModal from '../../../components/SheetModal'
import Text, { TextSecondary } from '../../../components/Text'
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard'
import {
  canConvertCurrency,
  prettyBitcoinAmount,
  prettyFiatAmount,
  prettyLongText,
  prettyNumber,
  toSatoshis,
} from '../../../lib/format'
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
import { useSwapRail } from '../../../lib/receive/swapRail'
import SwapRailStatus from './SwapRail'
import { configuredLnurlServer, useLnurlRail, useLnurlRails } from '../../../lib/receive/lnurlRail'
import { useLnurlTokenRails, type LnurlTokenQuote, type LnurlTokenRail } from '../../../lib/receive/lnurlTokenRails'
import LnurlRailPanel from './LnurlRail'
import { useTranslation } from '../../../providers/language'
import { TokenOnChainLogo } from '../../../components/ChainLogo'
import Figure from '../../../components/Figure'
import Glyph, { type GlyphName } from '../../../icons/Glyph'

const TOKEN = 'token:'

const FORMAT_GLYPHS: Record<string, GlyphName> = { unified: 'qr', lightning: 'bolt', ark: 'layers', bitcoin: 'link' }

const railLogo = (rail: LnurlTokenRail, ring: string) => (
  <TokenOnChainLogo ticker={rail.unit.code} chainId={rail.asset?.chainId ?? ''} ring={ring} />
)

export default function ReceiveQRCode() {
  const { aspInfo } = useContext(AspContext)
  const { isRegistered } = useContext(AssetsContext)
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)
  const { navigate } = useContext(NavigationContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { assetMetadataCache, svcWallet } = useContext(WalletContext)
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { t } = useTranslation()

  const copyToClipboard = useCopyToClipboard()

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
  const [showFormats, setShowFormats] = useState(false)

  const prefersReducedMotion = useReducedMotion()

  // Receive methods
  const { boardingAddr, offchainAddr, satoshis, assetId, addressError } = recvInfo
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const isAssetReceive = assetId && assetId !== ''
  const hasError = Boolean(addressError)

  const [noPaymentMethods, setNoPaymentMethods] = useState(false)
  const [arkAddress, setArkAddress] = useState(offchainAddr)
  const [btcAddress, setBtcAddress] = useState(boardingAddr)
  // The user's chosen payment method. This is the source of truth, not the
  // encoded value: an invoice is re-minted on every amount change, so a
  // value-keyed selection would be dropped and never come back. Keying on the
  // method id lets the choice survive the invoice being briefly absent.
  const [selectedMethod, setSelectedMethod] = useState('unified')
  const [bip21Uri, setBip21Uri] = useState('')

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

  // A pending Receive-screen claim must not leave a swap invoice taking the QR's lightning= from the LNURL.
  const lnurlConfigured = Boolean(configuredLnurlServer())
  const lnurlRail = useLnurlRail({
    enabled: lnurlConfigured && !isAssetReceive,
    identity: svcWallet?.identity,
    arkadeAddress: recvInfo.offchainAddr,
    boardingAddress: recvInfo.boardingAddr || undefined,
    primary: config.lnurlPrimary,
  })
  const swapRailOn =
    !lnurlConfigured ||
    lnurlRail.status === 'failed' ||
    (lnurlRail.status === 'onboarding' && !lnurlRail.choices.includes('self'))
  const swapRail = useSwapRail(swapRailOn)
  const lnurl = lnurlRail.lnurl ?? ''
  const lightningAddress = lnurlRail.receiver?.lightningAddress ?? ''
  // The payment listener writes the paid amount into `satoshis`; re-quoting it would mint an invoice nobody pays.
  const requestedSats = recvInfo.received ? 0 : satoshis
  const lnurlRails = useLnurlRails(lnurlRail.receiver, requestedSats, false, {
    arkade: recvInfo.offchainAddr,
    onchain: recvInfo.boardingAddr,
  })
  const tokenRails = useLnurlTokenRails(
    lnurlRail.receiver,
    requestedSats,
    config.receiveViaTokens,
    selectedMethod.startsWith(TOKEN) ? selectedMethod.slice(TOKEN.length) : undefined,
  )
  // A swap invoice left in the flow by an earlier visit isn't this rail's while the LNURL serves Lightning.
  const invoice = (swapRailOn ? recvInfo.invoice : undefined) || lnurlRails.targets.lightning || ''
  const generatingInvoice = swapRail.generatingInvoice || lnurlRails.generating
  const createBip21 = (): { ark: string; btc: string; bip21: string } => {
    const ark = vtxoTxsAllowed() ? recvInfo.offchainAddr : ''
    const btc = utxoTxsAllowed() ? recvInfo.boardingAddr : ''
    const bip21 = isAssetReceive
      ? encodeBip21Asset(ark, assetId, assetAmount, assetMeta?.metadata?.decimals)
      : encodeBip21(btc, ark, invoice, satoshis, lnurl)

    return { ark, btc, bip21 }
  }

  // Build BIP21 URI
  useEffect(() => {
    if (!addressesLoaded) return

    const { ark, btc, bip21 } = createBip21()

    setNoPaymentMethods(!ark && !btc && !isAssetReceive)
    setArkAddress(ark)
    setBtcAddress(btc)
    setBip21Uri(bip21)
  }, [
    assetAmount,
    addressesLoaded,
    isAssetReceive,
    recvInfo.offchainAddr,
    recvInfo.boardingAddr,
    recvInfo.satoshis,
    invoice,
    lnurl,
  ])

  /**
   * The payment methods we can render right now, in display order.
   *
   * Keyed off a stable id rather than the URI itself: the Lightning invoice is
   * re-minted whenever the amount is renegotiated, so a selection tracked by
   * value would silently fall back to unified on the next rebuild and never come
   * back. The ids are what the selector and the copy sheet both key off, so
   * choosing a method means the same thing wherever it is changed from.
   *
   * Lightning is an invoice once an amount is set (the receiver's own LNURL issues
   * it, or a solver when no lnurl-server is reachable); without one it is the
   * receiver's address, or its LNURL while nameless — the same rail either way.
   *
   * Labels are deliberately short: these sit in a horizontal control, and
   * "Lightning invoice" / "Arkade address" crowd it on a narrow phone. The copy
   * sheet keeps the descriptive wording, where the row shows the value anyway.
   */
  const paymentMethods = useMemo(() => {
    const methods: { id: string; label: string; value: string }[] = []
    if (bip21Uri) methods.push({ id: 'unified', label: t('receive.unified'), value: bip21Uri })
    const lightning = invoice || lightningAddress || lnurl
    if (lightning) methods.push({ id: 'lightning', label: t('receive.methodLightning'), value: lightning })
    if (arkAddress) methods.push({ id: 'ark', label: t('receive.methodArkade'), value: arkAddress })
    if (btcAddress) methods.push({ id: 'bitcoin', label: t('receive.methodBitcoin'), value: btcAddress })
    // Offered before they are quoted: picking one is what asks for its quote.
    for (const rail of tokenRails.rails) {
      const value = tokenRails.quote?.optionId === rail.id ? tokenRails.quote.value : ''
      methods.push({ id: TOKEN + rail.id, label: `${rail.unit.code} (${rail.chain})`, value })
    }
    return methods
  }, [bip21Uri, invoice, lightningAddress, lnurl, arkAddress, btcAddress, tokenRails.rails, tokenRails.quote, t])

  // What the QR encodes, and what the selector highlights, are two different
  // questions. The *choice* is `selectedMethod` and it is remembered even while
  // the method is momentarily un-offerable (an invoice being re-negotiated), so
  // it comes back on its own. What we *show* has to be something we actually
  // hold right now, so it falls back to unified — and the highlight follows the
  // fallback, because leaving it lit on a method with no value is a lie.
  const activeMethod = useMemo(() => {
    if (paymentMethods.some((m) => m.id === selectedMethod)) return selectedMethod
    if (paymentMethods.some((m) => m.id === 'unified')) return 'unified'
    return paymentMethods[0]?.id ?? ''
  }, [paymentMethods, selectedMethod])

  const qrCodeValue = paymentMethods.find((m) => m.id === activeMethod)?.value ?? ''
  const activeToken = tokenRails.rails.find((r) => TOKEN + r.id === activeMethod)
  const tokenQuote = activeToken ? tokenRails.quote : undefined
  const generating = activeToken ? tokenRails.quoting : generatingInvoice
  const segments = paymentMethods.filter((m) => !m.id.startsWith(TOKEN))
  const tokenMethods = paymentMethods.filter((m) => m.id.startsWith(TOKEN))
  const showSelector = segments.length > 1 || tokenMethods.length > 0
  const quoteProblem = activeToken && !tokenRails.quoting && (tokenRails.expired || Boolean(tokenRails.error))

  // The copy sheet offers what the shown method carries: the unified URI and the addresses inside it, or one value.
  const rows = {
    bip21: { testId: 'bip21', title: t('receive.unified'), value: bip21Uri },
    ark: { testId: 'ark', title: t('receive.arkadeAddress'), value: arkAddress },
    btc: { testId: 'btc', title: t('receive.bitcoinAddress'), value: btcAddress },
    invoice: { testId: 'invoice', title: t('receive.lightningInvoice'), value: invoice },
    lnaddress: {
      testId: 'lnaddress',
      title: lightningAddress ? t('settings.lightningAddress') : 'LNURL',
      value: lightningAddress || lnurl,
    },
  }
  const copyRows = (
    activeToken
      ? tokenQuote
        ? [
            {
              testId: 'token',
              title: t('receive.tokenDepositAddress', { token: `${activeToken.unit.code} (${activeToken.chain})` }),
              value: tokenQuote.destination,
            },
            {
              testId: 'token-amount',
              title: t('receive.tokenAmount', { unit: activeToken.unit.code }),
              value: tokenQuote.amount,
            },
          ]
        : []
      : activeMethod === 'ark'
        ? [rows.ark]
        : activeMethod === 'bitcoin'
          ? [rows.btc]
          : activeMethod === 'lightning'
            ? [invoice ? rows.invoice : rows.lnaddress]
            : [rows.bip21, rows.ark, rows.btc, rows.invoice, rows.lnaddress]
  ).filter((row) => row.value)

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
    if (generating) return
    setSharing(true)
    shareData(data)
      .catch(consoleError)
      .finally(() => setSharing(false))
  }

  const handleCopy = async (value: string) => {
    if (generating) return
    if (!prefersReducedMotion) hapticSubtle()
    const copied = await copyToClipboard(value)
    // Close the sheet even on failure so the picker is not stranded.
    setShowCopySheet(false)
    if (copied) setCopied(value)
  }

  const handleCopyButton = async () => {
    if (generating) return
    if (!prefersReducedMotion) hapticSubtle()
    // One relevant value is copied outright; the toast confirms it, so a one-row sheet adds nothing.
    if (copyRows.length > 1) setShowCopySheet(true)
    // A token's QR value is a payment URI, which a wallet's address field rejects.
    const value = tokenQuote?.destination ?? qrCodeValue
    if (value && copied !== value) {
      const written = await copyToClipboard(value)
      if (written) setCopied(value)
    }
  }

  const handleAmountConfirm = (value = amountTextValue, inputMode?: KeyboardInputMode) => {
    setShowKeys(false)
    setShowAmountSheet(false)
    if (assetMeta) {
      const decimals = assetMeta.metadata?.decimals
      const cents = unitsToAtomic(value, decimals)
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

  const data = { title: t('wallet.receive'), text: qrCodeValue }
  const shareDisabled =
    !canBrowserShareData(data) ||
    sharing ||
    hasError ||
    noPaymentMethods ||
    generating ||
    Boolean(activeToken && !tokenQuote)

  // Whether an amount is currently requested. Keyed off assetMeta to match how
  // handleAmountConfirm/handleAmountClear decide between asset units and sats.
  const hasAmount = assetMeta ? assetAmount > BigInt(0) : satoshis > 0

  /**
   * Point the QR at one method. Selecting only chooses what is shown — the Copy
   * button still copies whatever is on screen, so choosing a method never
   * overwrites the clipboard behind the user's back.
   */
  const handleMethodChange = (id: string) => {
    if (!paymentMethods.some((m) => m.id === id)) return
    setSelectedMethod(id)
  }

  // Spelled out so every key is a literal the dictionary check can see.
  const formatSub = (id: string) =>
    id === 'unified'
      ? t('receive.formatUnifiedSub')
      : id === 'lightning'
        ? t('receive.formatLightningSub')
        : id === 'ark'
          ? t('receive.formatArkadeSub')
          : id === 'bitcoin'
            ? t('receive.formatBitcoinSub')
            : undefined

  const pickFormat = (id: string) => {
    if (!prefersReducedMotion) hapticSubtle()
    handleMethodChange(id)
    setShowFormats(false)
  }

  // One radio group: arrows move through formats and tokens alike and select as they go, the way
  // native radios do. The sheet stays open until a row is clicked or confirmed with Enter or Space.
  const formatIds = [...segments, ...tokenMethods].map((m) => m.id)
  const formatStop = formatIds.includes(activeMethod) ? activeMethod : formatIds[0]
  const handleFormatsKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='radio']"))
    const at = radios.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    const to =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? (at + 1) % radios.length
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? (at - 1 + radios.length) % radios.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? radios.length - 1
              : -1
    if (to < 0) return
    event.preventDefault()
    radios[to].focus()
    handleMethodChange(radios[to].dataset.format ?? '')
  }

  const defaultMethod = segments[0]?.id ?? ''
  // The requested amount leads the screen, in the unit the wallet is set to show. Without a rate
  // there is no honest fiat figure, so it falls back to the exact Bitcoin amount.
  const amountFigure =
    assetMeta || satoshis <= 0
      ? ''
      : canConvertCurrency(config.currency, toFiat, fromFiat)
        ? prettyFiatAmount(toFiat(satoshis), config.currency)
        : prettyBitcoinAmount(satoshis, config.unit)

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

  const amountLabel = hasAmount ? t('receive.editAmount') : t('receive.addAmount')
  const unitLabel = assetMeta ? assetPresentation.ticker : 'sats'

  return (
    <>
      <Header text={t('wallet.receive')} back={() => navigate(Pages.Wallet)} close />
      <Content noFade>
        <Padded>
          {hasError ? (
            <ErrorMessage error text={t('receive.failedToGetAddress', { error: addressError ?? '' })} />
          ) : !addressesLoaded || (!paymentMethods.some((m) => m.value) && !noPaymentMethods) ? (
            <LoadingLogo text={t('common.loading')} />
          ) : noPaymentMethods ? (
            <p>{t('receive.noPaymentMethods')}</p>
          ) : (
            <div className='receive'>
              <SwapRailStatus rail={swapRail} />
              {lnurlRails.errors.lightning ? (
                <TextSecondary>{t('receive.noInvoiceForAmount', { error: lnurlRails.errors.lightning })}</TextSecondary>
              ) : null}
              {amountFigure ? (
                <p className='receive__figure' data-testid='receive-amount'>
                  <Figure value={amountFigure} />
                </p>
              ) : null}
              <div
                // Height-capped so the whole code sits above the bottom buttons on a short phone.
                className='receive-invoice-stage aspect-square w-full max-w-[min(19rem,calc(100dvh-27rem))]'
                data-generating={generating}
              >
                <div
                  className='receive-invoice-loading flex flex-col items-center justify-center gap-2 text-center'
                  aria-hidden={!generating}
                >
                  <span className='receive-invoice-loader' aria-hidden='true'>
                    <span className='pixel-loader' />
                  </span>
                  <div role='status' aria-live='polite'>
                    <Text medium>{activeToken ? t('receive.gettingQuote') : t('receive.generatingInvoice')}</Text>
                  </div>
                  <Text small color='neutral-500'>
                    {generating
                      ? t('receive.requestingAmount', { amount: prettyNumber(satoshis, 0), unit: unitLabel })
                      : '\u00a0'}
                  </Text>
                </div>
                {quoteProblem ? (
                  <div className='flex flex-col items-center justify-center gap-2 text-center'>
                    {tokenRails.expired ? (
                      <>
                        <Text bold>{t('receive.quoteExpired')}</Text>
                        <TextSecondary centered>{t('receive.quoteExpiredSub')}</TextSecondary>
                      </>
                    ) : (
                      <TextSecondary centered>{t('receive.noTokenQuote', { error: tokenRails.error })}</TextSecondary>
                    )}
                    <Button label={t('receive.getNewQuote')} onClick={tokenRails.regenerate} />
                  </div>
                ) : (
                  <button
                    type='button'
                    className='receive-invoice-qr focusable'
                    disabled={generating || !qrCodeValue}
                    aria-hidden={generating}
                    onClick={() => handleCopy(qrCodeValue)}
                    onPointerDown={() => setQrTransform(prefersReducedMotion ? '' : 'scale(0.97)')}
                    onPointerUp={() => setQrTransform('')}
                    onPointerLeave={() => setQrTransform('')}
                    onPointerCancel={() => setQrTransform('')}
                    aria-label={t('receive.copyQrCode')}
                    style={{
                      padding: 0,
                      width: '100%',
                      display: 'block',
                      background: 'none',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      cursor: generating ? 'default' : 'pointer',
                    }}
                  >
                    <div
                      style={{
                        transform: qrTransform,
                        transition: prefersReducedMotion
                          ? 'none'
                          : `transform 240ms cubic-bezier(${EASE_OUT_QUINT.join(',')})`,
                      }}
                    >
                      <QrCode value={qrCodeValue} logo={activeToken ? railLogo(activeToken, '#ffffff') : undefined} />
                    </div>
                  </button>
                )}
              </div>
              <div
                className='min-h-5'
                aria-hidden={generating}
                style={{ visibility: generating ? 'hidden' : 'visible' }}
              >
                {activeToken && tokenQuote ? (
                  <TokenQuoteNote rail={activeToken} quote={tokenQuote} />
                ) : satoshis > 0 && !generating ? (
                  <Text small color='neutral-500'>
                    {t('receive.requestingAmount', { amount: prettyNumber(satoshis, 0), unit: unitLabel })}
                  </Text>
                ) : null}
              </div>
              <LnurlRailPanel
                rail={lnurlRail}
                showAddress={activeMethod === 'unified' || activeMethod === 'lightning'}
              />
              {showSelector ? (
                <button
                  type='button'
                  className='receive__formats'
                  aria-haspopup='dialog'
                  data-testid='receive-formats'
                  onClick={() => setShowFormats(true)}
                >
                  <Glyph name='lines' size={20} />
                  <span className='receive__formats-text'>
                    <span className='receive__formats-title'>{t('receive.otherFormats')}</span>
                    <span className='receive__formats-sub'>
                      {activeMethod === defaultMethod
                        ? t('receive.otherFormatsSub')
                        : t('receive.formatShowing', {
                            format: paymentMethods.find((m) => m.id === activeMethod)?.label ?? '',
                          })}
                    </span>
                  </span>
                  <Glyph name='chevronRight' size={16} strokeWidth={2.25} className='text-ink-3' />
                </button>
              ) : null}
            </div>
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
          <Button
            label={t('receive.copy')}
            onClick={handleCopyButton}
            secondary
            disabled={generating || Boolean(activeToken && !tokenQuote)}
          />
        </FlexRow>
        <Button label={t('receive.share')} onClick={handleShare} disabled={shareDisabled} />
      </ButtonsOnBottom>

      {/* Amount bottom sheet */}
      <SheetModal isOpen={showAmountSheet} onClose={() => setShowAmountSheet(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            {t('receive.addAmount')}
          </Text>
          <InputAmount
            label={t('receive.amount')}
            asset={assetOption}
            value={amountTextValue}
            focus={!isMobileBrowser}
            readOnly={isMobileBrowser}
            name='receive-amount-sheet'
            onChange={setAmountTextValue}
            onEnter={handleAmountConfirm}
            onFocus={() => setShowKeys(isMobileBrowser)}
          />
          <Button label={t('receive.setAmount')} onClick={() => handleAmountConfirm()} disabled={!amountTextValue} />
          {hasAmount ? <Button label={t('receive.clearAmount')} onClick={handleAmountClear} secondary /> : null}
        </FlexCol>
      </SheetModal>

      <SheetModal isOpen={showFormats} onClose={() => setShowFormats(false)} labelledBy='receive-formats-title'>
        <div className='formats'>
          <h2 className='formats__title' id='receive-formats-title'>
            {t('receive.otherFormats')}
          </h2>
          <p className='formats__intro'>{t('receive.otherFormatsIntro')}</p>
          <div
            role='radiogroup'
            aria-labelledby='receive-formats-title'
            className='formats__groups'
            onKeyDown={handleFormatsKey}
          >
            <div className='formats__group'>
              {segments.map((m) => (
                <FormatRow
                  key={m.id}
                  id={m.id}
                  checked={m.id === activeMethod}
                  tabStop={m.id === formatStop}
                  icon={<Glyph name={FORMAT_GLYPHS[m.id] ?? 'scan'} size={18} />}
                  title={m.label}
                  badge={m.id === defaultMethod ? t('receive.formatDefault') : undefined}
                  sub={formatSub(m.id)}
                  onPick={() => pickFormat(m.id)}
                />
              ))}
            </div>
            {tokenMethods.length ? (
              <>
                <h3 className='formats__subtitle' id='receive-formats-tokens'>
                  {t('receive.payWithStablecoins')}
                </h3>
                <p className='formats__intro'>{t('receive.stablecoinsSub')}</p>
                <div className='formats__group' role='group' aria-labelledby='receive-formats-tokens'>
                  {tokenMethods.map((m) => {
                    const rail = tokenRails.rails.find((r) => TOKEN + r.id === m.id)
                    return (
                      <FormatRow
                        key={m.id}
                        id={m.id}
                        checked={m.id === activeMethod}
                        tabStop={m.id === formatStop}
                        icon={rail ? <span className='flex size-5'>{railLogo(rail, 'var(--bg)')}</span> : null}
                        title={m.label}
                        onPick={() => pickFormat(m.id)}
                      />
                    )
                  })}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </SheetModal>

      {/* Copy address bottom sheet */}
      <SheetModal isOpen={showCopySheet} onClose={() => setShowCopySheet(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            {t('receive.copyAddress')}
          </Text>
          <FlexCol gap='0.75rem'>
            {copyRows.map((row) => (
              <AddressLine
                key={row.testId}
                {...row}
                onCopy={handleCopy}
                onSelect={(v) => {
                  const method = paymentMethods.find((m) => m.value === v)
                  if (method) handleMethodChange(method.id)
                }}
                copied={copied}
              />
            ))}
          </FlexCol>
        </FlexCol>
      </SheetModal>
    </>
  )
}

function FormatRow({
  id,
  checked,
  tabStop,
  icon,
  title,
  badge,
  sub,
  onPick,
}: {
  id: string
  checked: boolean
  /** The one row Tab lands on; arrows reach the rest. */
  tabStop: boolean
  icon: React.ReactNode
  title: string
  badge?: string
  sub?: string
  onPick: () => void
}) {
  return (
    <button
      type='button'
      role='radio'
      aria-checked={checked}
      tabIndex={tabStop ? 0 : -1}
      data-format={id}
      className='formats__row'
      onClick={onPick}
    >
      <span className='formats__well' aria-hidden='true'>
        {icon}
      </span>
      <span className='formats__text'>
        <span className='formats__name'>
          {title}
          {badge ? <span className='formats__badge'>{badge}</span> : null}
        </span>
        {sub ? <span className='formats__sub'>{sub}</span> : null}
      </span>
      <span className='formats__radio' aria-hidden='true'>
        {checked ? <Glyph name='check' size={12} strokeWidth={3} /> : null}
      </span>
    </button>
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
  const { t } = useTranslation()
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
          ariaLabel={t('receive.copyAria', { title })}
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

function TokenQuoteNote({ rail, quote }: { rail: LnurlTokenRail; quote: LnurlTokenQuote }) {
  const { t } = useTranslation()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [])
  const seconds = Math.max(0, Math.ceil((quote.expiresAt - now) / 1000))
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <FlexCol gap='0.25rem' centered>
      <Text small>
        {t('receive.tokenSendExactly', { amount: quote.amount, unit: rail.unit.code, chain: rail.chain })}
      </Text>
      <Text small color='neutral-500' wrap centered>
        {t('receive.tokenQuoteValid', { provider: rail.provider, time })}
      </Text>
      {isMobileBrowser && quote.value !== quote.destination ? (
        <Text small color='neutral-500' wrap centered>
          <a href={quote.value} className='font-semibold text-brand-text'>
            {t('receive.openInWallet')}
          </a>
        </Text>
      ) : null}
    </FlexCol>
  )
}
