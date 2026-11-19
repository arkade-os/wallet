import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import Padded from '../../../components/Padded'
import QrCode from '../../../components/QrCode'
import { FlowContext, emptyRecvInfo } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { NotificationsContext } from '../../../providers/notifications'
import Content from '../../../components/Content'
import { consoleError } from '../../../lib/logs'
import { canBrowserShareData, shareData } from '../../../lib/share'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import { LimitsContext } from '../../../providers/limits'
import { Asset, Coin, ExtendedVirtualCoin } from '@arkade-os/sdk'
import LoadingLogo from '../../../components/LoadingLogo'
import { encodeBip21, encodeBip21Asset } from '../../../lib/bip21'
import { atomicToUnits, unitsToAtomic } from '../../../lib/assets'
import ErrorMessage from '../../../components/Error'
import { getReceivingAddresses } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import InputAmount, { type InputAmountMode } from '../../../components/InputAmount'
import Keyboard, { KeyboardInputMode } from '../../../components/Keyboard'
import SheetModal from '../../../components/SheetModal'
import Text, { TextSecondary } from '../../../components/Text'
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard'
import {
  canConvertCurrency,
  prettyAmount,
  prettyFiatAmount,
  prettyLongText,
  prettyNumber,
  satsFromEntry,
  textFromSats,
  toSatoshis,
} from '../../../lib/format'
import { hapticSubtle } from '../../../lib/haptics'
import { isMobileBrowser } from '../../../lib/browser'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { AssetOption, Currencies, Unit } from '../../../lib/types'
import { EASE_OUT_QUINT } from '../../../lib/animations'
import { walletAssetPresentationForId } from '../../../lib/accountAssets'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { AspContext } from '../../../providers/asp'
import { AssetsContext } from '../../../providers/assets'
import { useSwapRail } from '../../../lib/receive/swapRail'
import SwapRailStatus from './SwapRail'
import { configuredLnurlServer, useLnurlRail, useLnurlRails } from '../../../lib/receive/lnurlRail'
import {
  isUsdStablecoin,
  useLnurlTokenRails,
  type LnurlTokenQuote,
  type LnurlTokenRail,
} from '../../../lib/receive/lnurlTokenRails'
import {
  receiveMethods,
  receiveTarget,
  type ReceiveInputs,
  type ReceiveMethod,
} from '../../../lib/receive/receiveTargets'
import { decodeInvoice } from '../../../lib/bolt11'
import LnurlRailPanel from './LnurlRail'
import ReceiveFormats, { FormatsCard, type FormatRow } from './ReceiveFormats'
import { useTranslation } from '../../../providers/language'
import { TokenOnChainLogo } from '../../../components/ChainLogo'
import TokenLogo, { tokenLogoTickerForTicker } from '../../../components/TokenLogo'
import AssetAvatar from '../../../components/AssetAvatar'
import SmallLogo from '../../../components/SmallLogo'
import BoltOutlineIcon from '../../../icons/BoltOutline'
import CheckMarkIcon from '../../../icons/CheckMark'
import CopyIcon from '../../../icons/Copy'
import ScanIcon from '../../../icons/Scan'
import ChevronDownIcon from '../../../icons/ChevronDown'

const railLogo = (rail: LnurlTokenRail, ring: string) => (
  <TokenOnChainLogo ticker={rail.unit.code} chainId={rail.asset?.chainId ?? ''} ring={ring} />
)

const CopyButton = (p: { label: string; testId: string; done: boolean; onClick: () => void; disabled?: boolean }) => (
  <button
    type='button'
    aria-label={p.label}
    data-testid={p.testId}
    onClick={p.onClick}
    disabled={p.disabled}
    className='flex size-8 shrink-0 items-center justify-center text-neutral-500 disabled:opacity-40 [&_svg]:size-5'
  >
    {p.done ? <CheckMarkIcon /> : <CopyIcon />}
  </button>
)

const CloseIcon = () => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 20 20'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.75'
    aria-hidden='true'
  >
    <path strokeLinecap='round' d='M5 5l10 10M15 5 5 15' />
  </svg>
)

export default function ReceiveQRCode() {
  const { aspInfo } = useContext(AspContext)
  const { isRegistered } = useContext(AssetsContext)
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat, toFiatAmount, fiatDecimals } = useContext(FiatContext)
  const { navigate } = useContext(NavigationContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { assetBalances, assetMetadataCache, svcWallet } = useContext(WalletContext)
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { t } = useTranslation()

  const copyToClipboard = useCopyToClipboard()

  const [assetAmount, setAssetAmount] = useState(BigInt(0))
  const [amountTextValue, setAmountTextValue] = useState('')
  // The sheet's amount as typed, so a denomination switch re-expresses it without the rounding of re-parsing.
  const [sheetSats, setSheetSats] = useState(0)
  const currencyConversionUseful = canConvertCurrency(config.currency, toFiat, fromFiat)
  const [entryMode, setEntryMode] = useState<InputAmountMode>(useFiat && currencyConversionUseful ? 'fiat' : 'unit')
  const fiatEntry = entryMode === 'fiat' && useFiat && currencyConversionUseful
  const textOf = (sats: number, fiat: boolean) => textFromSats(sats, fiat, config.unit, toFiat, fiatDecimals)

  useEffect(() => {
    if (recvInfo.assetId || currencyConversionUseful || entryMode !== 'fiat') return
    setEntryMode('unit')
    setAmountTextValue(sheetSats ? textOf(sheetSats, false) : '')
  }, [recvInfo.assetId, config.unit, currencyConversionUseful, entryMode, sheetSats])

  const [sharing, setSharing] = useState(false)
  const [addressesLoaded, setAddressesLoaded] = useState(false)
  const [addresses, setAddresses] = useState<{
    wallet: typeof svcWallet
    offchainAddr: string
    boardingAddr: string
  }>()
  const ownAddresses = addresses?.wallet === svcWallet ? addresses : undefined
  const addressesCurrent = addressesLoaded && Boolean(ownAddresses)
  const [qrTransform, setQrTransform] = useState('')

  // Amount sheet state
  const [showAmountSheet, setShowAmountSheet] = useState(false)
  const [showKeys, setShowKeys] = useState(false)

  const [copied, setCopied] = useState('')
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(''), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  const [formatsOpen, setFormatsOpen] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)

  const prefersReducedMotion = useReducedMotion()

  // Receive methods
  const { boardingAddr, offchainAddr, satoshis, assetId, addressError } = recvInfo
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const isAssetReceive = assetId && assetId !== ''
  const hasError = Boolean(addressError)

  const [noPaymentMethods, setNoPaymentMethods] = useState(false)
  const [arkAddress, setArkAddress] = useState(offchainAddr)
  const [btcAddress, setBtcAddress] = useState(boardingAddr)
  const [bip21Uri, setBip21Uri] = useState('')

  // Fetch addresses on mount
  useEffect(() => {
    if (!svcWallet) return
    if (ownAddresses?.offchainAddr === offchainAddr && ownAddresses?.boardingAddr === boardingAddr) return
    let stale = false
    setAddressesLoaded(false)
    getReceivingAddresses(svcWallet)
      .then(({ offchainAddr, boardingAddr }) => {
        if (stale) return
        if (!offchainAddr) throw 'Unable to get offchain address'
        if (!boardingAddr) throw 'Unable to get boarding address'
        setAddresses({ wallet: svcWallet, offchainAddr, boardingAddr })
        setRecvInfo((prev) => ({ ...prev, boardingAddr, offchainAddr, addressError: undefined }))
        setAddressesLoaded(true)
      })
      .catch((err) => {
        if (stale) return
        const error = extractError(err)
        consoleError(error, 'error getting addresses')
        setRecvInfo((prev) => ({ ...prev, addressError: error }))
        setAddressesLoaded(true)
      })
    return () => {
      stale = true
    }
  }, [svcWallet, offchainAddr, boardingAddr])

  // A pending Receive-screen claim must not leave a swap invoice taking the QR's lightning= from the LNURL.
  const lnurlConfigured = Boolean(configuredLnurlServer())
  const lnurlRail = useLnurlRail({
    enabled: lnurlConfigured && !isAssetReceive,
    identity: svcWallet?.identity,
    arkadeAddress: ownAddresses?.offchainAddr,
    boardingAddress: ownAddresses?.boardingAddr,
    primary: config.lnurlPrimary,
  })
  const swapRailOn =
    !lnurlConfigured ||
    lnurlRail.status === 'failed' ||
    (lnurlRail.status === 'onboarding' && !lnurlRail.choices.includes('self'))
  const swapRail = useSwapRail(swapRailOn)
  const receiver = ownAddresses ? lnurlRail.receiver : undefined
  const lnurl = addressesCurrent ? (lnurlRail.lnurl ?? '') : ''
  const lightningAddress = addressesCurrent ? (receiver?.lightningAddress ?? '') : ''
  // The payment listener writes the paid amount into `satoshis`; re-quoting it would mint an invoice nobody pays.
  const requestedSats = recvInfo.received ? 0 : satoshis
  const lnurlRails = useLnurlRails(receiver, requestedSats, false, {
    arkade: ownAddresses?.offchainAddr ?? '',
    onchain: ownAddresses?.boardingAddr ?? '',
  })
  // A swap invoice left in the flow by an earlier visit isn't this rail's while the LNURL serves Lightning.
  const invoice = addressesCurrent
    ? (swapRailOn ? recvInfo.invoice : undefined) || lnurlRails.targets.lightning || ''
    : ''
  const generatingInvoice = swapRail.generatingInvoice || lnurlRails.generating

  // Not remembered: the sheet says to pick another format only when the payer's wallet asks for it.
  const [method, setMethod] = useState<ReceiveMethod>('lnaddress')
  const [tokenId, setTokenId] = useState<string>()
  // A rail picked before any amount was typed; it is quoted once the amount lands.
  const [pendingToken, setPendingToken] = useState<string>()
  const amountForTokens = Boolean(pendingToken)
  const tokenRails = useLnurlTokenRails(
    receiver,
    requestedSats,
    addressesCurrent && config.receiveViaTokens,
    method === 'token' ? tokenId : undefined,
  )
  const activeToken = tokenRails.rails.find((r) => r.id === tokenId)
  const inputs: ReceiveInputs = {
    ark: addressesCurrent ? arkAddress : '',
    btc: addressesCurrent ? btcAddress : '',
    invoice,
    lnurl,
    lightningAddress,
    sats: satoshis,
    quote: tokenRails.quote,
    tokensOffered:
      addressesCurrent &&
      lnurlConfigured &&
      config.receiveViaTokens &&
      (satoshis ? tokenRails.rails : tokenRails.options).length > 0,
  }
  const methods = receiveMethods(inputs)
  // A method with nothing to put in the QR (its invoice failed, its token left the amount's bounds) shows Any wallet;
  // a token's quote error keeps the token, which says why.
  const holdsQr =
    method === 'token' ? Boolean(activeToken) : generatingInvoice || Boolean(receiveTarget(method, inputs))
  const shown: ReceiveMethod =
    methods.includes(method) && holdsQr ? method : methods[0] === 'lnaddress' ? 'lnaddress' : 'full'
  // The bare Arkade address would drop assetid= and have the payer send BTC, so the asset QR is always its link.
  const target = isAssetReceive
    ? bip21Uri
      ? { qr: bip21Uri, copy: bip21Uri, kind: 'bip21' as const }
      : undefined
    : receiveTarget(shown, inputs)
  const qrCodeValue = addressesCurrent ? (target?.qr ?? '') : ''
  const generating = shown === 'token' ? tokenRails.quoting : generatingInvoice
  const createBip21 = (): { ark: string; btc: string; bip21: string } => {
    const ark = vtxoTxsAllowed() ? ownAddresses?.offchainAddr || '' : ''
    const btc = utxoTxsAllowed() ? ownAddresses?.boardingAddr || '' : ''
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
  }, [assetAmount, addressesLoaded, isAssetReceive, ownAddresses, recvInfo.satoshis, invoice, lnurl])

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
        setRecvInfo((prev) => ({ ...prev, received: true, satoshis: sats, receivedAssets }))
        if (!isAssetReceive) notifyPaymentReceived(sats)
        navigate(Pages.ReceiveSuccess)
      }
    }

    navigator.serviceWorker.addEventListener('message', listenForPayments)
    return () => navigator.serviceWorker.removeEventListener('message', listenForPayments)
    // The asset pill switches what this screen receives without remounting it.
  }, [svcWallet, isAssetReceive])

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
    if (copied) setCopied(value)
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
      const shouldConvertFromFiat = inputMode === 'fiat'
      const shouldConvertToSats = inputMode === 'btc' || (!useFiat && config.unit === Unit.BTC)
      const keypadSats = shouldConvertFromFiat ? fromFiat(num) : shouldConvertToSats ? toSatoshis(num) : num
      const sats = inputMode
        ? keypadSats
        : value === amountTextValue
          ? sheetSats
          : satsFromEntry(num, fiatEntry, config.unit, fromFiat)
      if (sats === satoshis) setRecvInfo({ ...recvInfo, satoshis: sats })
      // The negotiated invoice is for the old amount, and the negotiate effect
      // refuses to renegotiate while one exists — so leaving it in place would
      // keep showing an invoice for a number the user just changed. The
      // superseded swap stays monitored until it settles or its window shuts;
      // what must stop is presenting its invoice.
      else setRecvInfo({ ...recvInfo, satoshis: sats, invoice: undefined, pendingLnReceive: undefined })
      // Dropped here, not in an effect, so no render pairs the new amount with the old pick and orders a quote.
      if (method === 'token' && !tokenRails.offers(sats, tokenId)) {
        setMethod('lnaddress')
        setTokenId(undefined)
      }
      if (pendingToken) {
        setPendingToken(undefined)
        if (sats > 0 && tokenRails.offers(sats, pendingToken)) {
          setTokenId(pendingToken)
          setMethod('token')
        } else if (sats > 0) setFormatsOpen(true)
      }
    }
  }

  const handleSheetAmountChange = (value: string) => {
    setAmountTextValue(value)
    if (!assetMeta) setSheetSats(satsFromEntry(Number(value), fiatEntry, config.unit, fromFiat))
  }

  const handleEntryModeChange = (mode: InputAmountMode) => {
    setEntryMode(mode)
    if (!sheetSats) return
    setAmountTextValue(textOf(sheetSats, mode === 'fiat' && useFiat && currencyConversionUseful))
  }

  const handleAmountClear = () => {
    handleAmountConfirm('0')
    setAmountTextValue('')
    setSheetSats(0)
  }

  const openAmountEntry = () => (isMobileBrowser ? setShowKeys(true) : setShowAmountSheet(true))

  const closeAmountEntry = () => {
    setShowKeys(false)
    setShowAmountSheet(false)
    setPendingToken(undefined)
  }

  const pickFormat = (id: string) => {
    setFormatsOpen(false)
    setMethod(id as ReceiveMethod)
    setTokenId(undefined)
  }

  // A stablecoin is quoted for an exact amount, so without one the row asks for it first.
  const pickToken = (id: string) => {
    setFormatsOpen(false)
    if (!satoshis) {
      setPendingToken(id)
      openAmountEntry()
      return
    }
    setTokenId(id)
    setMethod('token')
  }

  // The screen stays mounted, so an amount, format or token typed for the last asset must not carry over.
  const switchAsset = (id: string) => {
    setAssetsOpen(false)
    if (id === (assetId ?? '')) return
    setAssetAmount(BigInt(0))
    setAmountTextValue('')
    setSheetSats(0)
    setMethod('lnaddress')
    setTokenId(undefined)
    setRecvInfo((prev) => ({
      ...emptyRecvInfo,
      boardingAddr: prev.boardingAddr,
      offchainAddr: prev.offchainAddr,
      ...(id ? { assetId: id } : {}),
    }))
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

  const quoteExpired = shown === 'token' && tokenRails.expired
  const data = { title: t('wallet.receive'), text: qrCodeValue }
  const shareDisabled =
    !addressesCurrent ||
    !canBrowserShareData(data) ||
    sharing ||
    hasError ||
    noPaymentMethods ||
    generating ||
    quoteExpired ||
    (shown === 'token' && !tokenRails.quote)
  const copyValue = addressesCurrent ? (target?.copy ?? '') : ''
  const copyDisabled = hasError || !addressesCurrent || !copyValue || generating || quoteExpired || noPaymentMethods

  // Whether an amount is currently requested. Keyed off assetMeta to match how
  // handleAmountConfirm/handleAmountClear decide between asset units and sats.
  const hasAmount = assetMeta ? assetAmount > BigInt(0) : satoshis > 0
  const amountHeadline = !hasAmount
    ? ''
    : assetMeta
      ? `${atomicToUnits(assetAmount, assetOption.decimals)} ${assetPresentation.ticker}`
      : useFiat && currencyConversionUseful
        ? prettyFiatAmount(toFiat(satoshis), config.currency, { bitcoinUnit: config.unit })
        : prettyAmount(satoshis)

  // Mobile keyboard — bypass sheet on save, go straight to QR
  if (showKeys) {
    return (
      <Keyboard
        hideBalance
        asset={assetOption}
        back={closeAmountEntry}
        initialValue={assetAmount || satoshis}
        onClear={hasAmount ? handleAmountClear : undefined}
        title={amountForTokens ? t('receive.setAmountFirst') : undefined}
        subtitle={amountForTokens ? t('receive.setAmountFirstSub') : undefined}
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

  const invoiceMinutes = (() => {
    if (!satoshis || !invoice) return 0
    try {
      return Math.floor((decodeInvoice(invoice).expiresAt * 1000 - Date.now()) / 60_000)
    } catch {
      return 0
    }
  })()
  const formatInfo: Record<Exclude<ReceiveMethod, 'token'>, Omit<FormatRow, 'id'>> = {
    full: {
      icon: <ScanIcon />,
      title: t('receive.anyWallet'),
      subtitle: t('receive.anyWalletSub'),
    },
    lnaddress: {
      icon: <BoltOutlineIcon />,
      title: t('receive.unifiedAddress'),
      subtitle: t('receive.lnAddressSub'),
    },
    lightning: satoshis
      ? {
          icon: <BoltOutlineIcon />,
          title: t('receive.lightningInvoice'),
          subtitle:
            invoiceMinutes > 0
              ? t('receive.invoiceExpires', { amount: amountHeadline, minutes: invoiceMinutes })
              : t('receive.invoiceFor', { amount: amountHeadline }),
        }
      : { icon: <BoltOutlineIcon />, title: t('receive.methodLightning'), subtitle: t('receive.hintLnAddress') },
    ark: {
      icon: (
        <span className='flex [&>svg]:size-5'>
          <SmallLogo />
        </span>
      ),
      title: t('receive.arkadeAddress'),
      subtitle: t('receive.arkadeSub'),
    },
    btc: {
      icon: (
        <span className='flex size-6 [&>svg]:size-full'>
          <TokenLogo ticker='BTC' />
        </span>
      ),
      title: t('receive.bitcoinAddress'),
      subtitle: t('receive.bitcoinSub'),
    },
  }
  const formatRows: FormatRow[] = methods.flatMap((m, i) =>
    m === 'token' ? [] : [{ id: m, ...formatInfo[m], ...(i ? {} : { badge: t('receive.defaultFormat') }) }],
  )
  const usd = toFiatAmount(satoshis, Currencies.USD)
  const tokenRows: FormatRow[] = !inputs.tokensOffered
    ? []
    : (satoshis ? tokenRails.rails : tokenRails.options).map((r) => ({
        id: r.id,
        icon: <span className='flex size-7'>{railLogo(r, 'var(--background-color)')}</span>,
        title: t('receive.methodToken', { unit: r.unit.code, chain: r.chain }),
        // The wallet's own price, so every row reads the same and the provider's spread shows in the quote.
        subtitle: !satoshis
          ? t('receive.setAmountFirst')
          : isUsdStablecoin(r.unit.code) && usd > 0
            ? t('receive.tokenAbout', { amount: prettyNumber(usd, 2, true, 2), unit: r.unit.code })
            : t('receive.tokenVia', { provider: r.provider }),
      }))

  const copyLabel = target
    ? {
        bip21: t('receive.partLink'),
        lnaddress: t('receive.unifiedAddress'),
        lnurl: t('receive.partLnurl'),
        invoice: t('receive.lightningInvoice'),
        ark: t('receive.arkadeAddress'),
        btc: t('receive.bitcoinAddress'),
        token: activeToken
          ? t('receive.tokenDepositAddress', { token: `${activeToken.unit.code} (${activeToken.chain})` })
          : '',
      }[target.kind]
    : ''
  const caption = isAssetReceive
    ? t('receive.arkadeSub')
    : {
        full: (satoshis ? invoice : lnurl) ? t('receive.anyWalletHint') : t('receive.bitcoinWalletHint'),
        lnaddress: t('receive.anyWalletHint'),
        lightning: satoshis ? t('receive.lnInvoiceHint') : t('receive.hintLnAddress'),
        ark: t('receive.arkadeSub'),
        btc: t('receive.bitcoinSub'),
        token: '',
      }[shown]
  // Only a registered asset gets an official logo: a self-reported ticker could claim any.
  const assetRow = (id: string): FormatRow => {
    const p = id
      ? walletAssetPresentationForId(aspInfo.network, id, isRegistered, assetMetadataCache.get(id)?.metadata, '')
      : { name: t('send.bitcoin'), ticker: 'BTC' }
    const logo = !id ? 'BTC' : isRegistered(id) ? tokenLogoTickerForTicker(p.ticker) : undefined
    return {
      id,
      title: p.name || p.ticker,
      subtitle: p.ticker,
      icon: (
        <span className='flex size-7 shrink-0 [&>svg]:size-full'>
          {logo ? <TokenLogo ticker={logo} /> : <AssetAvatar name={p.name} ticker={p.ticker} size={28} />}
        </span>
      ),
    }
  }
  // An asset opened from its detail screen is listed even when the wallet holds none of it yet. A held one waits
  // for its metadata: without it this screen would read an amount typed for it as sats.
  const held = assetBalances.filter((a) => a.amount > 0 && assetMetadataCache.has(a.assetId)).map((a) => a.assetId)
  const assetIds = new Set([assetId ?? '', ...held])
  const assetRows = ['', ...[...assetIds].filter(Boolean)].map(assetRow)
  const current = assetRows.find((r) => r.id === (assetId ?? '')) ?? assetRows[0]
  const pill = (
    <>
      {current.icon}
      <span className='truncate'>{current.title}</span>
      {assetRows.length > 1 ? <ChevronDownIcon /> : null}
    </>
  )
  const pillClass = 'flex min-w-0 items-center gap-2 rounded-full bg-neutral-50 py-1.5 pr-4 pl-1.5 font-semibold'
  const showingQr = addressesCurrent && !hasError && !noPaymentMethods && Boolean(bip21Uri)

  return (
    <>
      <div className='grid min-h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4'>
        <button
          type='button'
          onClick={() => navigate(Pages.Wallet)}
          aria-label={t('common.back')}
          data-testid='header-back-btn'
          className='flex size-10 items-center justify-center rounded-full bg-neutral-50'
        >
          <CloseIcon />
        </button>
        {assetRows.length > 1 ? (
          <button
            type='button'
            onClick={() => setAssetsOpen(true)}
            aria-haspopup='dialog'
            data-testid='receive-asset-pill'
            className={pillClass}
          >
            {pill}
          </button>
        ) : (
          <span className={pillClass} data-testid='receive-asset-pill'>
            {pill}
          </span>
        )}
      </div>
      <Content noFade>
        <Padded>
          <FlexCol gap='0.75rem' centered>
            {hasError ? (
              <ErrorMessage error text={t('receive.failedToGetAddress', { error: addressError ?? '' })} />
            ) : !addressesCurrent || (!bip21Uri && !noPaymentMethods) ? (
              <LoadingLogo text={t('common.loading')} />
            ) : noPaymentMethods ? (
              <p>{t('receive.noPaymentMethods')}</p>
            ) : (
              <>
                {amountHeadline ? (
                  <p className='text-heading-xl font-semibold' data-testid='receive-amount'>
                    {amountHeadline}
                  </p>
                ) : null}
                <SwapRailStatus rail={swapRail} />
                {/* Only where Lightning is in play: a stablecoin, Arkade or Bitcoin code never carried the invoice. */}
                {lnurlRails.errors.lightning && (shown === 'full' || shown === 'lightning') ? (
                  <TextSecondary>
                    {t('receive.noInvoiceForAmount', { error: lnurlRails.errors.lightning })}
                  </TextSecondary>
                ) : null}
                <div
                  // svh, not dvh: a phone browser's toolbar covers the page, and dvh counts the space under it.
                  className={`receive-invoice-stage w-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-3xl border border-neutral-100 ${shown === 'token' ? 'max-w-[clamp(11rem,calc(100svh-31rem),20rem)]' : hasAmount ? 'max-w-[clamp(12rem,calc(100svh-28rem),20rem)]' : 'max-w-[clamp(12rem,calc(100svh-24rem),20rem)]'} aspect-square`}
                  data-generating={generating}
                >
                  <div
                    className='receive-invoice-loading flex flex-col items-center justify-center gap-2 p-4 text-center'
                    aria-hidden={!generating}
                  >
                    <div className='receive-invoice-pixels mb-3 grid-cols-4 gap-1.25' aria-hidden='true'>
                      {Array.from({ length: 16 }, (_, index) => (
                        <span
                          key={index}
                          className='size-3 rounded-xs bg-purple-700 dark:bg-purple-300'
                          style={{ animationDelay: `${index * 75}ms` }}
                        />
                      ))}
                    </div>
                    <div role='status' aria-live='polite'>
                      <Text medium wrap>
                        {shown === 'token' ? t('receive.gettingQuote') : t('receive.generatingInvoice')}
                      </Text>
                    </div>
                    <Text small color='neutral-500' wrap>
                      {generating
                        ? t('receive.requestingAmount', { amount: prettyNumber(satoshis, 0), unit: unitLabel })
                        : '\u00a0'}
                    </Text>
                  </div>
                  {quoteExpired ? (
                    <div className='receive-invoice-expired flex flex-col items-center justify-center gap-2 p-4 text-center'>
                      <Text bold>{t('receive.quoteExpired')}</Text>
                      <TextSecondary centered>{t('receive.quoteExpiredSub')}</TextSecondary>
                      <Button
                        label={t('receive.getNewQuote')}
                        onClick={tokenRails.regenerate}
                        disabled={tokenRails.quoting}
                      />
                    </div>
                  ) : shown === 'token' && tokenRails.error ? (
                    <div className='receive-invoice-expired flex flex-col items-center justify-center gap-2 p-4 text-center'>
                      <TextSecondary centered>{t('receive.noTokenQuote', { error: tokenRails.error })}</TextSecondary>
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
                      data-testid='receive-qr'
                      style={{
                        padding: 0,
                        width: '100%',
                        border: 'none',
                        display: 'block',
                        cursor: generating ? 'default' : 'pointer',
                        background: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
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
                        <QrCode
                          value={qrCodeValue}
                          logo={shown === 'token' && activeToken ? railLogo(activeToken, '#ffffff') : undefined}
                        />
                      </div>
                    </button>
                  )}
                </div>
                <div
                  className='flex min-h-10 w-full max-w-85 flex-col items-center gap-1'
                  aria-hidden={generating}
                  style={{ visibility: generating ? 'hidden' : 'visible' }}
                >
                  {target && copyValue && !generating ? (
                    <div className='flex max-w-full items-center gap-1'>
                      <span
                        className={
                          target.kind === 'lnaddress' ? 'truncate text-lg font-semibold' : 'truncate font-mono text-sm'
                        }
                      >
                        {target.kind === 'lnaddress' ? copyValue : prettyLongText(copyValue, 12)}
                      </span>
                      <CopyButton
                        label={t('receive.copyAria', { title: copyLabel })}
                        testId={`${target.kind}-address-copy`}
                        done={copied === copyValue}
                        onClick={() => handleCopy(copyValue)}
                        disabled={copyDisabled}
                      />
                    </div>
                  ) : null}
                  {shown === 'token' && activeToken && tokenRails.quote ? (
                    <TokenQuoteNote rail={activeToken} quote={tokenRails.quote} copied={copied} onCopy={handleCopy} />
                  ) : caption ? (
                    <Text small color='neutral-500' wrap centered>
                      {caption}
                    </Text>
                  ) : null}
                </div>
              </>
            )}
            <FlexRow gap='0.75rem'>
              <Button label={amountLabel} onClick={openAmountEntry} secondary />
              <Button label={t('receive.share')} onClick={handleShare} disabled={shareDisabled} />
            </FlexRow>
            {showingQr ? <LnurlRailPanel rail={lnurlRail} /> : null}
            {/* In the flow, not a fixed footer: pinned, it covered the buttons on short phones. */}
            {showingQr && !isAssetReceive ? <FormatsCard onClick={() => setFormatsOpen(true)} /> : null}
          </FlexCol>
        </Padded>
      </Content>

      {/* Amount bottom sheet */}
      <SheetModal isOpen={showAmountSheet} onClose={closeAmountEntry}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            {amountForTokens ? t('receive.setAmountFirst') : t('receive.addAmount')}
          </Text>
          {amountForTokens ? <TextSecondary>{t('receive.setAmountFirstSub')}</TextSecondary> : null}
          <InputAmount
            label={t('receive.amount')}
            asset={assetOption}
            value={amountTextValue}
            focus={!isMobileBrowser}
            readOnly={isMobileBrowser}
            name='receive-amount-sheet'
            onChange={handleSheetAmountChange}
            onModeChange={handleEntryModeChange}
            mode={entryMode}
            switchable
            onEnter={handleAmountConfirm}
            onFocus={() => setShowKeys(isMobileBrowser)}
          />
          <Button label={t('receive.setAmount')} onClick={() => handleAmountConfirm()} disabled={!amountTextValue} />
          {hasAmount ? <Button label={t('receive.clearAmount')} onClick={handleAmountClear} secondary /> : null}
        </FlexCol>
      </SheetModal>

      <ReceiveFormats
        open={formatsOpen}
        onClose={() => setFormatsOpen(false)}
        formats={formatRows}
        active={shown}
        onPick={pickFormat}
        tokens={tokenRows}
        onPickToken={pickToken}
      />
      <ReceiveFormats
        open={assetsOpen}
        onClose={() => setAssetsOpen(false)}
        title={t('swap.chooseAssetToReceive')}
        formats={assetRows}
        active={current.id}
        onPick={switchAsset}
      />
    </>
  )
}

function TokenQuoteNote(p: {
  rail: LnurlTokenRail
  quote: LnurlTokenQuote
  copied: string
  onCopy: (value: string) => void
}) {
  const { rail, quote } = p
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
      <div className='flex items-center gap-1'>
        <Text small>
          {t('receive.tokenSendExactly', { amount: quote.amount, unit: rail.unit.code, chain: rail.chain })}
        </Text>
        <CopyButton
          label={t('receive.copyAria', { title: t('receive.tokenAmount', { unit: rail.unit.code }) })}
          testId='token-amount-address-copy'
          done={p.copied === quote.amount}
          onClick={() => p.onCopy(quote.amount)}
        />
      </div>
      <Text small color='neutral-500' wrap centered>
        {t('receive.tokenQuoteValid', { provider: rail.provider, time })}
        {isMobileBrowser && quote.value !== quote.destination ? (
          <>
            {' · '}
            <a href={quote.value} className='font-semibold text-purple-700 dark:text-purple-300'>
              {t('receive.openInWallet')}
            </a>
          </>
        ) : null}
      </Text>
    </FlexCol>
  )
}
