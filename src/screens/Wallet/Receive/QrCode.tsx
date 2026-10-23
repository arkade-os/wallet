import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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
  fromSatoshis,
  prettyNumber,
  satsFromEntry,
  textFromSats,
  toSatoshis,
} from '../../../lib/format'
import { hapticSubtle } from '../../../lib/haptics'
import { isMobileBrowser } from '../../../lib/browser'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { AssetOption, Unit } from '../../../lib/types'
import { EASE_OUT_QUINT, EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { walletAssetPresentationForId } from '../../../lib/accountAssets'
import { ConfigContext } from '../../../providers/config'
import { BackupContext } from '../../../providers/backup'
import { FiatContext } from '../../../providers/fiat'
import { AspContext } from '../../../providers/asp'
import { AssetsContext } from '../../../providers/assets'
import { useSwapRail } from '../../../lib/receive/swapRail'
import SwapRailStatus from './SwapRail'
import { configuredLnurlServer, useLnurlRail, useLnurlRails } from '../../../lib/receive/lnurlRail'
import { useLnurlTokenRails, type LnurlTokenQuote, type LnurlTokenRail } from '../../../lib/receive/lnurlTokenRails'
import {
  defaultQrPart,
  qrPart,
  receiveMethods,
  receiveParts,
  type PartId,
  type ReceiveInputs,
  type ReceiveMethod,
  type ReceivePart,
} from '../../../lib/receive/receiveTargets'
import LnurlRailPanel from './LnurlRail'
import ReceiveSelector from './ReceiveSelector'
import ReceiveParts from './ReceiveParts'
import { useTranslation } from '../../../providers/language'
import Select from '../../../components/Select'
import ChainLogo, { TokenLogoStack, TokenOnChainLogo } from '../../../components/ChainLogo'

const railLogo = (rail: LnurlTokenRail, ring: string) => (
  <TokenOnChainLogo ticker={rail.unit.code} chainId={rail.asset?.chainId ?? ''} ring={ring} />
)

export default function ReceiveQRCode() {
  const { aspInfo } = useContext(AspContext)
  const { isRegistered } = useContext(AssetsContext)
  const { config, updateConfig, useFiat } = useContext(ConfigContext)
  const { backupAndUpdateConfig, backupConfig } = useContext(BackupContext)
  const { fromFiat, toFiat, fiatDecimals } = useContext(FiatContext)
  const { navigate } = useContext(NavigationContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { assetMetadataCache, svcWallet } = useContext(WalletContext)
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
  const [showTokenSheet, setShowTokenSheet] = useState(false)

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
  })
  const swapRailOn =
    !lnurlConfigured ||
    lnurlRail.status === 'failed' ||
    (lnurlRail.status === 'onboarding' && !lnurlRail.choices.includes('self'))
  const swapRail = useSwapRail(swapRailOn)
  const receiver = ownAddresses ? lnurlRail.receiver : undefined
  const lnurl = addressesCurrent ? (lnurlRail.lnurl ?? '') : ''
  const lightningAddress = addressesCurrent ? (receiver?.lightningAddress ?? '') : ''
  const lnurlRails = useLnurlRails(receiver, satoshis, config.receiveViaLnurl, {
    arkade: ownAddresses?.offchainAddr ?? '',
    onchain: ownAddresses?.boardingAddr ?? '',
  })
  // A swap invoice left in the flow by an earlier visit isn't this rail's while the LNURL serves Lightning.
  const invoice = addressesCurrent
    ? (swapRailOn ? recvInfo.invoice : undefined) || lnurlRails.targets.lightning || ''
    : ''
  const generatingInvoice = swapRail.generatingInvoice || lnurlRails.generating
  const fallbacks = [
    { label: t('receive.methodArkade'), error: lnurlRails.errors.arkade },
    { label: t('receive.methodBitcoin'), error: lnurlRails.errors.onchain },
  ].filter((rail) => rail.error)

  const [method, setMethod] = useState<ReceiveMethod>(config.receiveUnifiedMode)
  const [pickerOpen, setPickerOpen] = useState(false)
  const closePicker = useCallback(() => setPickerOpen(false), [])
  const [tokenId, setTokenId] = useState<string>()
  const [amountForTokens, setAmountForTokens] = useState(false)
  const tokenRails = useLnurlTokenRails(
    receiver,
    satoshis,
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
    amountText: config.unit === Unit.BTC ? prettyNumber(fromSatoshis(satoshis), 8, false) : String(satoshis),
    quote: tokenRails.quote,
    // With an amount the advertised options are known, and none means no method; without one,
    // picking it is what asks for the amount.
    tokensOffered:
      addressesCurrent && lnurlConfigured && config.receiveViaTokens && (!satoshis || tokenRails.rails.length > 0),
  }
  const methods = receiveMethods(inputs)
  // A method with nothing to put in the QR (its invoice failed, its token left the amount's bounds) shows Full details;
  // a token's quote error keeps the token, which says why.
  const holdsQr =
    method === 'token'
      ? Boolean(activeToken)
      : generatingInvoice || Boolean(qrPart(receiveParts(method, inputs), config.receiveQrForm[method]))
  const shown: ReceiveMethod = methods.includes(method) && holdsQr ? method : 'full'
  const assetParts: ReceivePart[] =
    isAssetReceive && addressesCurrent
      ? [
          ...(assetAmount > BigInt(0)
            ? [
                {
                  id: 'amount' as const,
                  value: atomicToUnits(assetAmount, assetMeta?.metadata?.decimals ?? 0),
                  selectable: false,
                },
              ]
            : []),
          { id: 'link' as const, value: bip21Uri, selectable: false },
          { id: 'ark' as const, value: arkAddress, selectable: false },
        ].filter((p) => p.value)
      : []
  // The bare Arkade address would drop assetid= and have the payer send BTC, so the asset QR is always its link.
  const parts = isAssetReceive ? assetParts : receiveParts(shown, inputs)
  const inQr = isAssetReceive
    ? assetParts.find((p) => p.id === 'link')
    : qrPart(parts, config.receiveQrForm[shown], defaultQrPart(shown, inputs))
  const qrCodeValue = addressesCurrent ? (inQr?.value ?? '') : ''
  const generating = shown === 'token' ? tokenRails.quoting : generatingInvoice
  const createBip21 = (): { ark: string; btc: string; bip21: string } => {
    const ark = vtxoTxsAllowed() ? lnurlRails.targets.arkade || ownAddresses?.offchainAddr || '' : ''
    const btc = utxoTxsAllowed() ? lnurlRails.targets.onchain || ownAddresses?.boardingAddr || '' : ''
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
    ownAddresses,
    recvInfo.satoshis,
    invoice,
    lnurl,
    lnurlRails.targets.arkade,
    lnurlRails.targets.onchain,
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
        setMethod(config.receiveUnifiedMode)
        setTokenId(undefined)
      }
      if (amountForTokens) {
        setAmountForTokens(false)
        if (sats > 0) setShowTokenSheet(true)
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

  const closeAmountEntry = () => {
    setShowKeys(false)
    setShowAmountSheet(false)
    setAmountForTokens(false)
  }

  const pickMethod = (id: string): boolean => {
    setPickerOpen(false)
    const next = id as ReceiveMethod
    if (next === 'token') {
      if (satoshis) setShowTokenSheet(true)
      else {
        setAmountForTokens(true)
        if (isMobileBrowser) setShowKeys(true)
        else setShowAmountSheet(true)
      }
      return true
    }
    setMethod(next)
    if ((next === 'lnaddress' || next === 'full') && !satoshis && next !== config.receiveUnifiedMode)
      backupAndUpdateConfig({ ...config, receiveUnifiedMode: next })
    return false
  }

  // Arrow keys move the QR row by row: save each pick locally, and back it up remotely once they settle.
  // The backup sends the config as it is then, so a method picked meanwhile is not overwritten.
  const latestConfig = useRef(config)
  const latestBackup = useRef(backupConfig)
  useEffect(() => {
    latestConfig.current = config
    latestBackup.current = backupConfig
  }, [config, backupConfig])
  const pendingBackup = useRef<ReturnType<typeof setTimeout>>(undefined)
  const flushBackup = () => {
    if (pendingBackup.current === undefined) return
    clearTimeout(pendingBackup.current)
    pendingBackup.current = undefined
    latestBackup.current(latestConfig.current).catch((err) => consoleError(err, 'receive form backup failed'))
  }
  // The cleanup is the point: unmounting flushes a pending backup, read through refs so it is never stale.
  useEffect(() => flushBackup, [])

  const showPart = (id: PartId) => {
    if (config.receiveQrForm[shown] === id) return
    const next = { ...config, receiveQrForm: { ...config.receiveQrForm, [shown]: id } }
    updateConfig(next)
    latestConfig.current = next
    if (pendingBackup.current !== undefined) clearTimeout(pendingBackup.current)
    pendingBackup.current = setTimeout(flushBackup, 800)
  }

  const methodLabel = (m: ReceiveMethod) =>
    m === 'lnaddress'
      ? satoshis
        ? t('receive.methodLnInvoice')
        : t('receive.methodLnAddress')
      : m === 'full'
        ? t('receive.methodFull')
        : m === 'lightning'
          ? t('receive.methodLightning')
          : m === 'ark'
            ? t('receive.methodArkade')
            : m === 'btc'
              ? t('receive.methodBitcoin')
              : activeToken
                ? t('receive.methodToken', { unit: activeToken.unit.code, chain: activeToken.chain })
                : t('receive.methodStablecoins')
  const titleOf = (p: ReceivePart) =>
    ({
      link: t('receive.partLink'),
      amount:
        shown === 'token' && activeToken
          ? t('receive.tokenAmount', { unit: activeToken.unit.code })
          : t('receive.partAmountUnit', { unit: amountUnit }),
      lnaddress: t('settings.lightningAddress'),
      lnurl: t('receive.partLnurl'),
      invoice: t('receive.lightningInvoice'),
      ark: t('receive.arkadeAddress'),
      btc: t('receive.bitcoinAddress'),
      deposit: activeToken
        ? t('receive.tokenDepositAddress', { token: `${activeToken.unit.code} (${activeToken.chain})` })
        : '',
    })[p.id]

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
  const amountUnit = assetMeta ? assetPresentation.ticker : config.unit === Unit.BTC ? config.unit : 'sats'

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
  // A token's QR is a payment URI, which a wallet's address field rejects; the bare deposit is what pastes.
  const copyValue = shown === 'token' ? tokenRails.quote?.destination : qrCodeValue
  const copyDisabled = !addressesCurrent || !copyValue || generating || quoteExpired

  // Whether an amount is currently requested. Keyed off assetMeta to match how
  // handleAmountConfirm/handleAmountClear decide between asset units and sats.
  const hasAmount = assetMeta ? assetAmount > BigInt(0) : satoshis > 0

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

  return (
    <>
      <Header text={t('wallet.receive')} back={() => navigate(Pages.Wallet)} />
      <Content noFade>
        <Padded>
          {hasError ? (
            <ErrorMessage error text={t('receive.failedToGetAddress', { error: addressError ?? '' })} />
          ) : !addressesCurrent || (!bip21Uri && !noPaymentMethods) ? (
            <LoadingLogo text={t('common.loading')} />
          ) : noPaymentMethods ? (
            <p>{t('receive.noPaymentMethods')}</p>
          ) : (
            <FlexCol gap='0.5rem' centered>
              <SwapRailStatus rail={swapRail} />
              {lnurlRails.errors.lightning ? (
                <TextSecondary>{t('receive.noInvoiceForAmount', { error: lnurlRails.errors.lightning })}</TextSecondary>
              ) : null}
              {fallbacks.map(({ label, error }) => (
                <TextSecondary key={label}>
                  {t('receive.ownAddressInstead', { rail: label, error: error ?? '' })}
                </TextSecondary>
              ))}
              <div
                // Height-capped so the whole code sits above the bottom buttons on a short phone.
                className='receive-invoice-stage mt-4 aspect-square w-full max-w-[min(21.25rem,calc(100dvh-26rem))]'
                data-generating={generating}
              >
                <div
                  className='receive-invoice-loading flex flex-col items-center justify-center gap-2 text-center'
                  aria-hidden={!generating}
                >
                  <div className='receive-invoice-pixels mb-5 grid-cols-4 gap-1.25' aria-hidden='true'>
                    {Array.from({ length: 16 }, (_, index) => (
                      <span
                        key={index}
                        className='size-3 rounded-xs bg-purple-700 dark:bg-purple-300'
                        style={{ animationDelay: `${index * 75}ms` }}
                      />
                    ))}
                  </div>
                  <div role='status' aria-live='polite'>
                    <Text medium>{shown === 'token' ? t('receive.gettingQuote') : t('receive.generatingInvoice')}</Text>
                  </div>
                  <Text small color='neutral-500'>
                    {generating
                      ? t('receive.requestingAmount', { amount: prettyNumber(satoshis, 0), unit: unitLabel })
                      : '\u00a0'}
                  </Text>
                </div>
                {quoteExpired ? (
                  <div className='receive-invoice-expired flex flex-col items-center justify-center gap-2 text-center'>
                    <Text bold>{t('receive.quoteExpired')}</Text>
                    <TextSecondary centered>{t('receive.quoteExpiredSub')}</TextSecondary>
                    <Button
                      label={t('receive.getNewQuote')}
                      onClick={tokenRails.regenerate}
                      disabled={tokenRails.quoting}
                    />
                  </div>
                ) : shown === 'token' && tokenRails.error ? (
                  <div className='receive-invoice-expired flex flex-col items-center justify-center gap-2 text-center'>
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
              <div className='mb-3 flex w-full max-w-85 flex-col gap-2'>
                {isAssetReceive ? null : (
                  <ReceiveSelector
                    label={methodLabel(shown)}
                    icon={
                      shown !== 'token' ? undefined : activeToken ? (
                        <span className='flex size-4'>
                          <ChainLogo chainId={activeToken.asset?.chainId ?? ''} />
                        </span>
                      ) : (
                        <TokenLogoStack tickers={['USDT', 'USDC']} ring='var(--background-color)' small />
                      )
                    }
                    active={shown}
                    open={pickerOpen}
                    onToggle={() => setPickerOpen((o) => !o)}
                    onClose={closePicker}
                    onPick={pickMethod}
                    rows={methods.map((m) => ({
                      id: m,
                      title: m === 'token' ? t('receive.methodStablecoins') : methodLabel(m),
                      preview:
                        m === 'lnaddress'
                          ? lightningAddress
                          : m === 'lightning'
                            ? lightningAddress || (lnurl ? t('components.lnurlAddress') : undefined)
                            : undefined,
                      note: m === 'token' && !satoshis ? t('receive.needsAmount') : undefined,
                    }))}
                  />
                )}
                {/* Remounted per method so the new rows fade in; no exit, so stale rows are never there to tap. */}
                {generating ? null : (
                  <motion.div
                    key={isAssetReceive ? 'asset' : shown}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: EASE_OUT_QUINT_TUPLE }}
                    aria-hidden={pickerOpen || undefined}
                    {...(pickerOpen && { inert: '' })}
                  >
                    <ReceiveParts
                      method={isAssetReceive ? 'ark' : shown}
                      label={methodLabel(shown)}
                      parts={parts}
                      titleOf={titleOf}
                      inQr={inQr?.id}
                      copied={copied}
                      onShow={showPart}
                      onCopy={handleCopy}
                    />
                  </motion.div>
                )}
              </div>
              <div
                className='min-h-5'
                aria-hidden={generating}
                style={{ visibility: generating ? 'hidden' : 'visible' }}
              >
                {shown === 'token' && activeToken && tokenRails.quote ? (
                  <TokenQuoteNote rail={activeToken} quote={tokenRails.quote} />
                ) : (inQr?.id === 'btc' || inQr?.id === 'ark') && hasAmount ? (
                  <Text small color='neutral-500' wrap centered>
                    {t('receive.hintDropsAmount')}
                  </Text>
                ) : (shown === 'lnaddress' || shown === 'lightning') && !satoshis ? (
                  <Text small color='neutral-500' wrap centered>
                    {t('receive.hintLnAddress')}
                  </Text>
                ) : satoshis > 0 && !generating ? (
                  <Text small color='neutral-500'>
                    {t('receive.requestingAmount', { amount: prettyNumber(satoshis, 0), unit: unitLabel })}
                  </Text>
                ) : null}
              </div>
              <LnurlRailPanel rail={lnurlRail} />
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
          <Button
            label={t('receive.copy')}
            onClick={() => copyValue && handleCopy(copyValue)}
            secondary
            disabled={copyDisabled}
          />
        </FlexRow>
        <Button label={t('receive.share')} onClick={handleShare} disabled={shareDisabled} />
      </ButtonsOnBottom>

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

      <SheetModal isOpen={showTokenSheet} onClose={() => setShowTokenSheet(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            {t('receive.payWithStablecoin')}
          </Text>
          <div className='hide-scrollbar max-h-[60vh] w-full overflow-y-auto'>
            <Select
              options={tokenRails.rails.map((r) => r.id)}
              labels={tokenRails.rails.map((r) => `${r.unit.code} (${r.chain})`)}
              selected={shown === 'token' && tokenId ? tokenId : ''}
              renderStart={(id) => {
                const rail = tokenRails.rails.find((r) => r.id === id)
                return rail ? railLogo(rail, 'var(--popover)') : null
              }}
              onChange={(id) => {
                setTokenId(id)
                setMethod('token')
                setShowTokenSheet(false)
              }}
            />
          </div>
        </FlexCol>
      </SheetModal>
    </>
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
          <a href={quote.value} className='font-semibold text-purple-700 dark:text-purple-300'>
            {t('receive.openInWallet')}
          </a>
        </Text>
      ) : null}
    </FlexCol>
  )
}
