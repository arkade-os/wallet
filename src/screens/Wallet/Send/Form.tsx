import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BrantaService, type Payment } from '@branta-ops/branta/v2'
import Button from '../../../components/Button'
import TaxiDeliveryOptions from '../../../components/TaxiDeliveryOptions'
import ErrorMessage from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import { isBTCAddress, decodeArkAddress, isLightningInvoice, isURLWithLightningQueryString } from '../../../lib/address'
import { AspContext } from '../../../providers/asp'
import { isArkNote } from '../../../lib/arknote'
import InputAmount, { type InputAmountMode } from '../../../components/InputAmount'
import InputAddress from '../../../components/InputAddress'
import Header from '../../../components/Header'
import { WalletContext } from '../../../providers/wallet'
import { fromSatoshis, prettyAmount, prettyFiatAmount, prettyNumber, toSatoshis } from '../../../lib/format'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Keyboard, { KeyboardInputMode } from '../../../components/Keyboard'
import Text, { TextSecondary } from '../../../components/Text'
import Shadow from '../../../components/Shadow'
import Scanner from '../../../components/Scanner'
import LoadingLogo from '../../../components/LoadingLogo'
import { consoleError } from '../../../lib/logs'
import { Addresses, AssetOption, Currencies, Themes, Unit } from '../../../lib/types'
import { aspErrorText, getReceivingAddresses } from '../../../lib/asp'
import { isMobileBrowser } from '../../../lib/browser'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { ArkNote, AssetDetails, isValidArkAddress, type NetworkName } from '@arkade-os/sdk'
import { LimitsContext } from '../../../providers/limits'
import { checkLnUrlConditions, fetchInvoice, fetchArkAddress, isValidLnUrl, LnUrlResponse } from '../../../lib/lnurl'
import { extractError } from '../../../lib/error'
import { decodeInvoice } from '../../../lib/bolt11'
import { lnSendRendezvous, requestLnSend } from '../../../lib/lnSwap'
import { withRfqTransport, SolverNotRespondingError } from '../../../lib/nostrRfq'
import { discoverMarkets } from '../../../lib/swapMarkets'
import { decodeBip21, isBip21, type Bip21Taxi } from '../../../lib/bip21'
import {
  PaymentDeclined,
  hasSatsForReceiverTaxi,
  payAssetRequest,
  routesToReceiverTaxi,
  walletAssetRfqDeps,
  type AssetPaymentTerms,
  type PayRailUi,
} from '../../../lib/assetRfqSend'
import { InfoLine } from '../../../components/Info'
import { centsToUnits, liquidBtcBalance, prettyAssetAmount, unitsToCents } from '../../../lib/assets'
import { FeesContext } from '../../../providers/fees'
import SheetModal from '../../../components/SheetModal'
import { AnimatePresence, motion } from 'framer-motion'
import { overlaySlideUp, overlayStyle } from '../../../lib/animations'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import TokenLogo, { tokenLogoTickerForTicker } from '../../../components/TokenLogo'
import {
  designatedAccountCurrency,
  normalizeAssetMinorUnits,
  rawAssetPresentation,
  verifiedDesignatedCurrency,
} from '../../../lib/accountAssets'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import { hapticLight } from '../../../lib/haptics'
import { getEmulatorPubkeyForNetwork, getReceiverTaxiUrlForNetwork, testDomains } from '../../../lib/constants'
import UnverifiedBadge from '../../../components/UnverifiedBadge'
import { useTranslation } from '../../../providers/language'
import {
  FailedDirectTaxi,
  getPendingDirectTaxi,
  PendingDirectTaxi,
  ReturnedDirectTaxi,
  sendDirectTaxi,
  type DirectTaxiMode,
  type DirectTaxiTerms,
} from '../../../lib/directTaxiSend'
import { arkadeContextOf, boundedFetch, probeBitcoinTaxi, TAXI_REFUSAL_TEXT } from '../../../lib/receiverTaxi'

const isProductionEnv = !testDomains.some((d) => window.location.hostname.includes(d))

const brantaClient = new BrantaService({
  baseUrl: isProductionEnv ? 'Production' : 'Staging',
  privacy: 'strict',
})

export const isPlainOnchainTypedRecipient = (value: string): boolean => {
  if (isBTCAddress(value)) return true
  if (!isBip21(value.toLowerCase())) return false

  try {
    const decoded = decodeBip21(value)
    return Boolean(
      decoded.address &&
        isBTCAddress(decoded.address) &&
        !decoded.arkAddress &&
        !decoded.invoice &&
        !decoded.lnUrl &&
        !decoded.assetId,
    )
  } catch {
    return false
  }
}

function AssetIcon({ asset }: { asset: AssetOption | null }) {
  const { aspInfo } = useContext(AspContext)
  const { isVerifiedAsset } = useContext(WalletContext)
  // official token logos are pinned to verified asset IDs, not self-reported
  // tickers; designated assets wear their currency account's flag
  const verified = Boolean(asset) && isVerifiedAsset(asset!.assetId)
  const currency = verified ? designatedAccountCurrency(aspInfo.network, asset!.assetId) : undefined
  const tokenTicker = !asset
    ? 'BTC'
    : currency
      ? tokenLogoTickerForTicker(currency)
      : verified
        ? tokenLogoTickerForTicker(asset.ticker)
        : null

  if (tokenTicker) {
    return (
      <span className='send-asset-icon' aria-hidden='true'>
        <TokenLogo ticker={tokenTicker} />
      </span>
    )
  }

  if (asset?.icon) {
    return <img className='send-asset-icon' src={asset.icon} alt='' />
  }

  return (
    <span className='send-asset-icon send-asset-icon--fallback' aria-hidden='true'>
      {asset?.ticker?.[0] ?? 'A'}
    </span>
  )
}

const PARTIAL_SEND_ERROR =
  "You don't have enough bitcoin to do a partial send. Please send all or acquire some bitcoin."

const TAXI_SEND_MODES = {
  normal: 'Sender pays sats',
  recycle: 'Receiver uses own sats',
  purchase: 'Sender pays asset fare',
  sponsored: 'Sender sponsors carrier',
} as const

const BITCOIN_TAXI_MODES = {
  normal: 'No Taxi: sub-dust coin',
  recycle: 'Receiver uses own sats',
  purchase: 'Receiver needs no sats',
  sponsored: 'Direct delivery, no claim',
} as const

type SubdustOffer =
  | { status: 'checking' }
  | { status: 'unavailable'; reason: string }
  | { status: 'available'; modes: DirectTaxiMode[]; requestId: string; fareUnits: bigint }

const bitcoinTaxiTerms = ({ mode, assetAmount: sent, fareUnits, carrierSats: topup }: DirectTaxiTerms): string => {
  const coin = sent + topup
  const unclaimed = ` If it isn't claimed, your ${sent} sats come back to you.`
  return (
    `Send ${sent} sats. Service fee: ${fareUnits === 0n ? 'Free' : `${fareUnits} sats`}. Taxi adds ${topup} sats so it arrives as a full ${coin}-sat coin. ` +
    (mode === 'recycle'
      ? `The receiver claims it with a coin of at least ${topup} sats of their own, repaying Taxi.${unclaimed}`
      : mode === 'purchase'
        ? `The receiver claims the whole ${coin}-sat coin without sats of their own.${unclaimed}`
        : `The receiver gets the ${coin}-sat coin directly, with no claim needed.`)
  )
}

export default function SendForm() {
  const { aspInfo } = useContext(AspContext)
  const { config, effectiveTheme, useFiat } = useContext(ConfigContext)
  const { calcOnchainOutputFee } = useContext(FeesContext)
  const { toFiat, fromFiat, fiatDecimals } = useContext(FiatContext)
  const { sendInfo, setNoteInfo, setSendInfo } = useContext(FlowContext)
  const { amountIsAboveMaxLimit, amountIsBelowMinLimit, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { navigate } = useContext(NavigationContext)
  const { t } = useTranslation()
  const {
    assetBalances,
    availableAssetBalances,
    assetMetadataCache,
    availableBalance,
    balance,
    isVerifiedAsset,
    setCacheEntry,
    svcWallet,
    reloadWallet,
  } = useContext(WalletContext)

  const [amount, setAmount] = useState<number>()
  const [amountTextValue, setAmountTextValue] = useState('')
  const [amountIsReadOnly, setAmountIsReadOnly] = useState(false)
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([])
  const [deductFromAmount, setDeductFromAmount] = useState(false)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState('recipient')
  const [label, setLabel] = useState('')
  const [lnUrlResponse, setLnUrlResponse] = useState<LnUrlResponse>()
  const [keys, setKeys] = useState(false)
  const [proceed, setProceed] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [readyToParse, setReadyToParse] = useState(false)
  const [parsingRecipient, setParsingRecipient] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [recipientError, setRecipientError] = useState('')
  const [receivingAddresses, setReceivingAddresses] = useState<Addresses>()
  const [scan, setScan] = useState(false)
  const [rawScanData, setRawScanData] = useState('')
  const [brantaPayment, setBrantaPayment] = useState<Payment | null>(null)
  const [brantaVerifyUrl, setBrantaVerifyUrl] = useState<string | undefined>(undefined)
  const [brantaLoading, setBrantaLoading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null)
  const [showAssetSelector, setShowAssetSelector] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [valueSats, setValueSats] = useState<number | undefined>(undefined)
  const [receiverTaxi, setReceiverTaxi] = useState<{ taxi: Bip21Taxi; assetId: string }>()
  // Apart from receiverTaxi, which routesToReceiverTaxi reads as an asset request.
  const [bitcoinTaxi, setBitcoinTaxi] = useState<Bip21Taxi>()
  const [subdustOffer, setSubdustOffer] = useState<SubdustOffer>()
  const [approval, setApproval] = useState<{
    terms: AssetPaymentTerms | DirectTaxiTerms
    answer: (ok: boolean) => void
  }>()
  const directTaxiUserChoice = useRef(false)
  const [directTaxiMode, setDirectTaxiMode] = useState<'normal' | DirectTaxiMode>('normal')
  const pendingDirectTaxi = useRef<{ payment: PendingDirectTaxi; send: SendInfo }>()
  const [checkingTaxiPayment, setCheckingTaxiPayment] = useState(true)
  const [taxiGuardFailed, setTaxiGuardFailed] = useState(false)
  const [returnedTaxiNotice, setReturnedTaxiNotice] = useState('')

  const pendingSendInfo = ({ record }: PendingDirectTaxi | ReturnedDirectTaxi): SendInfo =>
    record.assetId === undefined
      ? { arkAddress: record.receiverAddress, satoshis: Number(record.assetAmount) }
      : {
          arkAddress: record.receiverAddress,
          assets: [{ assetId: record.assetId, amount: BigInt(record.assetAmount) }],
          satoshis: 0,
        }

  useEffect(() => {
    if (!svcWallet) return
    let active = true
    setCheckingTaxiPayment(true)
    getPendingDirectTaxi(svcWallet, aspInfo.network)
      .then((payment) => {
        if (!active) return
        if (payment && !pendingDirectTaxi.current) {
          pendingDirectTaxi.current = { payment, send: pendingSendInfo(payment) }
          setError(payment.message)
        }
        setTaxiGuardFailed(false)
      })
      .catch((error) => {
        if (!active) return
        setTaxiGuardFailed(true)
        setError(extractError(error))
      })
      .finally(() => {
        if (active) setCheckingTaxiPayment(false)
      })
    return () => {
      active = false
    }
  }, [svcWallet, aspInfo.network])

  const timeoutRef = useRef<NodeJS.Timeout>()

  const prefersReducedMotion = useReducedMotion()
  const accountAsset = useMemo<AssetOption | null>(
    () =>
      sendInfo.account
        ? {
            assetId: sendInfo.account.assetId,
            balance: sendInfo.account.balance,
            decimals: sendInfo.account.decimals,
            name: sendInfo.account.ticker,
            ticker: sendInfo.account.ticker,
            // currency accounts only exist for id-verified designated assets
            trusted: true,
          }
        : null,
    [sendInfo.account],
  )
  const activeAsset = accountAsset ?? selectedAsset
  const isAssetSend = activeAsset !== null
  // Only when her asset balance can't cover it; she then pays in bitcoin, so that balance stops gating Continue.
  const payViaReceiverTaxi = routesToReceiverTaxi(sendInfo, receiverTaxi, activeAsset?.balance ?? BigInt(0))
  const directRequestTaxi = receiverTaxi?.assetId === activeAsset?.assetId ? receiverTaxi?.taxi : undefined
  const directTaxiUrl = directRequestTaxi?.url ?? getReceiverTaxiUrlForNetwork(aspInfo.network as NetworkName)
  const canUseDirectTaxi = Boolean(
    !sendInfo.account &&
      isAssetSend &&
      sendInfo.assets?.length === 1 &&
      !payViaReceiverTaxi &&
      sendInfo.arkAddress &&
      directTaxiUrl,
  )
  // A Taxi the request names is used or refused, never swapped for the network's.
  const subdustTaxiUrl = bitcoinTaxi?.url ?? getReceiverTaxiUrlForNetwork(aspInfo.network as NetworkName)
  const sendSats = sendInfo.satoshis ?? 0
  const wantsSubdustTaxi = Boolean(
    !isAssetSend &&
      sendInfo.arkAddress &&
      sendSats >= Number(aspInfo.vtxoMinAmount) &&
      sendSats < Number(aspInfo.dust) &&
      subdustTaxiUrl,
  )
  const subdustRequestId = `${aspInfo.url}:${aspInfo.signerPubkey}:${sendInfo.arkAddress}:${sendSats}:${subdustTaxiUrl}:${bitcoinTaxi?.operatorKey}:${bitcoinTaxi?.fareId}:${bitcoinTaxi?.payer}`
  const subdustModes =
    wantsSubdustTaxi && subdustOffer?.status === 'available' && subdustOffer.requestId === subdustRequestId
      ? subdustOffer.modes
      : undefined
  const payViaDirectTaxi = (canUseDirectTaxi || Boolean(subdustModes)) && directTaxiMode !== 'normal'

  useEffect(() => {
    directTaxiUserChoice.current = false
    setDirectTaxiMode('normal')
  }, [
    sendInfo.arkAddress,
    sendInfo.assets?.[0]?.assetId,
    sendSats,
    subdustTaxiUrl,
    bitcoinTaxi?.operatorKey,
    bitcoinTaxi?.fareId,
    bitcoinTaxi?.payer,
    directRequestTaxi?.payer,
    directRequestTaxi?.operatorKey,
    directTaxiUrl,
  ])

  useEffect(() => {
    setSubdustOffer(undefined)
    if (!wantsSubdustTaxi) return
    if (bitcoinTaxi?.payer === 'sender') {
      setSubdustOffer({
        status: 'unavailable',
        reason:
          'Sender-covered delivery cannot preserve this exact sub-dust amount. Ask the receiver to request at least the dust amount or use their own sats.',
      })
      return
    }
    let cancelled = false
    setSubdustOffer({ status: 'checking' })
    const check = async (): Promise<SubdustOffer> => {
      const ctx = {
        ...arkadeContextOf(aspInfo, () => Promise.reject(new Error('offering a Taxi reads no chain tip'))),
        fetch: boundedFetch,
        pageProtocol: window.location.protocol,
      }
      // ponytail: one /v1/info per amount edit; cache per URL if volume matters
      const offer = await probeBitcoinTaxi(
        { url: subdustTaxiUrl!, operatorKey: bitcoinTaxi?.operatorKey, fareId: bitcoinTaxi?.fareId },
        ctx,
        sendInfo.arkAddress!,
        BigInt(sendSats),
      )
      if (!offer.ok) return { status: 'unavailable', reason: TAXI_REFUSAL_TEXT[offer.reason] }
      const modes = offer.modes.filter((mode) => mode === 'recycle')
      return modes.length
        ? { status: 'available', modes, requestId: subdustRequestId, fareUnits: offer.fareUnits }
        : { status: 'unavailable', reason: 'it cannot deliver this exact amount' }
    }
    check()
      .catch((error): SubdustOffer => {
        consoleError(error, 'cannot check the Taxi against this wallet')
        return { status: 'unavailable', reason: TAXI_REFUSAL_TEXT.unverifiable }
      })
      .then((next) => {
        if (cancelled) return
        setSubdustOffer(next)
        if (next.status === 'available' && !directTaxiUserChoice.current) {
          setDirectTaxiMode(next.modes.includes('recycle') ? 'recycle' : next.modes[0])
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsSubdustTaxi, subdustTaxiUrl, bitcoinTaxi, sendInfo.arkAddress, sendSats, aspInfo.url, aspInfo.signerPubkey])

  const RECIPIENT_DEBOUNCE_MS = 800
  const hasAssets = assetBalances.length > 0
  const reserveApplied = !isAssetSend && hasAssets
  const liquidBalance = liquidBtcBalance(availableBalance, reserveApplied, aspInfo.dust)
  const taxiLacksSats = payViaReceiverTaxi && !hasSatsForReceiverTaxi(liquidBalance, aspInfo.dust)

  const smartSetError = (str: string) => {
    setError(
      str === ''
        ? aspInfo.unreachable
          ? aspErrorText(aspInfo, t('init.arkadeServerUnreachable'), t('errors.outdatedWallet'))
          : ''
        : str,
    )
  }

  // Prefer display-currency entry when conversion is available; otherwise
  // fall back to the wallet's bitcoin unit without reinterpreting the text.
  const currencyConversionUseful = config.currency !== Currencies.BTC && toFiat(100_000_000) > 0 && fromFiat(1) > 0
  const [entryMode, setEntryMode] = useState<InputAmountMode>(useFiat && currencyConversionUseful ? 'fiat' : 'unit')
  const fiatEntry = entryMode === 'fiat' && useFiat && currencyConversionUseful

  useEffect(() => {
    if (currencyConversionUseful || entryMode !== 'fiat') return
    setEntryMode('unit')
    setAmountTextValue(sendInfo.satoshis ? getTextValue(sendInfo.satoshis, false) : '')
  }, [config.unit, currencyConversionUseful, entryMode, sendInfo.satoshis])

  const getTextValue = (sats: number, fiat = fiatEntry) =>
    fiat
      ? prettyNumber(toFiat(sats), fiatDecimals(), false)
      : config.unit === Unit.BTC
        ? prettyNumber(fromSatoshis(sats), 8, false)
        : prettyNumber(sats, 0, false)

  const handleEntryModeChange = (mode: InputAmountMode) => {
    setEntryMode(mode)
    // re-express the field text from the authoritative sats, which the toggle
    // never changes — parsing re-expressed text with the previous mode's
    // closure once stored a fiat string as raw sats (a wrong-amount send)
    const sats = sendInfo.satoshis
    if (!sats) return
    setAmountTextValue(getTextValue(sats, mode === 'fiat' && useFiat && currencyConversionUseful))
    setValueSats(sats)
  }

  const prettyUnitBalance = (sats: number) =>
    config.unit === Unit.BTC ? prettyAmount(fromSatoshis(sats), config.unit, 8) : prettyAmount(sats)

  useEffect(() => {
    if (!sendInfo.scan) return
    const nextSendInfo = { ...sendInfo }
    delete nextSendInfo.scan
    setKeys(false)
    setScan(true)
    setSendInfo(nextSendInfo)
  }, [sendInfo.scan])

  // cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // get receiving addresses
  useEffect(() => {
    if (!svcWallet) return
    getReceivingAddresses(svcWallet)
      .then(({ boardingAddr, offchainAddr }) => {
        if (!boardingAddr || !offchainAddr) {
          throw new Error(t('send.unableToGetReceivingAddresses'))
        }
        setReceivingAddresses({ boardingAddr, offchainAddr })
      })
      .catch(smartSetError)
  }, [])

  // build asset options from balances + metadata
  useEffect(() => {
    if (!config.apps.assets.enabled) return
    const loadOptions = async () => {
      if (!svcWallet) return
      const options: AssetOption[] = []
      for (const ab of assetBalances) {
        let meta: AssetDetails | undefined = assetMetadataCache.get(ab.assetId)
        if (!meta) {
          try {
            const fetched = await svcWallet.assetManager.getAssetDetails(ab.assetId)
            if (fetched) meta = setCacheEntry(ab.assetId, fetched)
          } catch (err) {
            consoleError(err, `error fetching metadata for ${ab.assetId}`)
          }
        }
        const presentation = rawAssetPresentation(meta?.metadata, `${ab.assetId.slice(0, 8)}...`)
        options.push({
          assetId: ab.assetId,
          // list membership follows owned assets so one fully in escrow still
          // appears, but the amount offered is only ever the spendable part
          balance: availableAssetBalances.find((a) => a.assetId === ab.assetId)?.amount ?? BigInt(0),
          name: presentation.name,
          ticker: presentation.ticker,
          icon: presentation.icon,
          decimals: meta?.metadata?.decimals ?? 8,
          trusted: isVerifiedAsset(ab.assetId),
        })
      }
      setAssetOptions(options)
    }
    loadOptions()
  }, [svcWallet, assetBalances, availableAssetBalances, config.apps.assets.enabled])

  // initialize selected asset from pre-set sendInfo.assets (e.g. from Asset Detail page)
  useEffect(() => {
    if (sendInfo.account) {
      setSelectedAsset(null)
      return
    }
    if (!sendInfo.assets?.length || assetOptions.length === 0) return
    const presetAssetId = sendInfo.assets[0].assetId
    const found = assetOptions.find((a) => a.assetId === presetAssetId)
    if (found && !selectedAsset) setSelectedAsset(found)
  }, [assetOptions, sendInfo.account, sendInfo.assets])

  // parse recipient data
  // repeat when asset changes to re-validate addresses (e.g. if user
  // selects an asset and the address is not compatible with it)
  useEffect(() => {
    if (!readyToParse) return
    setRecipientError('')
    setParsingRecipient(true)
    let cancelled = false
    const parseRecipient = async () => {
      setReceiverTaxi(undefined)
      setBitcoinTaxi(undefined)
      if (!recipient) return setRecipientError(t('send.invalidRecipient'))
      const lowerCaseData = recipient.toLowerCase().replace(/^lightning:/, '')
      if (isURLWithLightningQueryString(recipient)) {
        const url = new URL(recipient)
        return setRecipient(url.searchParams.get('lightning')!)
      }
      if (lowerCaseData.trim().startsWith('bitcoin:')) {
        const { address, arkAddress, invoice, lnUrl, satoshis, assetId, assetAmount, taxi } = decodeBip21(
          recipient.trim(),
        )
        if (!address && !arkAddress && !invoice && !lnUrl) return setRecipientError(t('send.unableToParseBip21'))
        if (assetId) {
          setReceiverTaxi(taxi ? { taxi, assetId } : undefined)
          let found = assetOptions.find((a) => a.assetId === assetId)
          if (!found) {
            let meta: AssetDetails | undefined = assetMetadataCache.get(assetId)
            if (!meta && svcWallet) {
              try {
                const fetched = await svcWallet.assetManager.getAssetDetails(assetId)
                if (fetched) meta = setCacheEntry(assetId, fetched)
              } catch (err) {
                consoleError(err, `error fetching metadata for ${assetId}`)
              }
            }
            const presentation = rawAssetPresentation(meta?.metadata, `${assetId.slice(0, 8)}...`)
            found = {
              assetId,
              balance: BigInt(0),
              name: presentation.name,
              ticker: presentation.ticker,
              icon: presentation.icon,
              decimals: meta?.metadata?.decimals ?? 8,
              trusted: isVerifiedAsset(assetId),
            }
          }
          if (cancelled) return
          setSelectedAsset(found)
          const rawAmount = assetAmount ? unitsToCents(assetAmount, found.decimals) : BigInt(0)
          if (assetAmount) setAmountTextValue(assetAmount)
          return setSendInfo((prev) => ({
            ...prev,
            address,
            arkAddress,
            invoice,
            recipient,
            satoshis: 0,
            assets: [{ assetId, amount: rawAmount }],
            pendingLnSend: invoice === prev.invoice ? prev.pendingLnSend : undefined,
          }))
        }
        setBitcoinTaxi(taxi)
        setSendInfo((prev) => ({
          ...prev,
          account: prev.account,
          address,
          arkAddress,
          assets: prev.assets,
          invoice,
          lnUrl,
          recipient,
          satoshis: satoshis ?? prev.satoshis,
          pendingLnSend: invoice === prev.invoice ? prev.pendingLnSend : undefined,
        }))
        if (satoshis) setAmountTextValue(getTextValue(satoshis))
        return
      }
      if (isValidArkAddress(lowerCaseData)) {
        return setSendInfo((prev) => ({ ...prev, arkAddress: lowerCaseData, pendingLnSend: undefined }))
      }
      if (isLightningInvoice(lowerCaseData)) {
        if (isAssetSend) {
          return setRecipientError(t('send.assetsOnlyToArkade'))
        }
        // Amount from the wallet's own decoder; expiry and chain are re-checked
        // by the RFQ client before any solver sees the invoice.
        let satoshis = 0
        try {
          satoshis = decodeInvoice(lowerCaseData).amountSats
        } catch {
          return setRecipientError(t('send.unableToDecodeInvoice'))
        }
        if (!satoshis) return setRecipientError(t('send.invoiceMustHaveAmount'))
        setSendInfo((prev) => ({
          ...prev,
          invoice: lowerCaseData,
          satoshis,
          pendingLnSend: lowerCaseData === prev.invoice ? prev.pendingLnSend : undefined,
        }))
        setAmountTextValue(getTextValue(satoshis))
        setAmountIsReadOnly(true)
        return
      }
      if (isBTCAddress(recipient)) {
        if (isAssetSend) {
          return setRecipientError(t('send.assetsOnlyToArkade'))
        }
        return setSendInfo({ ...sendInfo, address: recipient })
      }
      if (isArkNote(lowerCaseData)) {
        try {
          const { value } = ArkNote.fromString(recipient)
          setNoteInfo({ note: recipient, satoshis: value })
          return navigate(Pages.NotesRedeem)
        } catch (err) {
          consoleError(err, 'error parsing ark note')
        }
      }
      if (isValidLnUrl(lowerCaseData)) {
        return setSendInfo({ ...sendInfo, lnUrl: lowerCaseData })
      }
      setRecipientError(t('send.invalidRecipient'))
      setReadyToParse(false)
    }
    parseRecipient()
      .catch((error) => {
        if (!cancelled) setRecipientError(extractError(error))
      })
      .finally(() => {
        if (!cancelled) setParsingRecipient(false)
      })
    return () => {
      cancelled = true
    }
  }, [recipient, isAssetSend, readyToParse])

  // fetch branta payment info for the current recipient (SDK strict mode gates non-ZK)
  useEffect(() => {
    const typed = recipient.trim()
    if (!rawScanData && !typed) {
      setBrantaPayment(null)
      setBrantaVerifyUrl(undefined)
      setBrantaLoading(false)
      return
    }

    setBrantaPayment(null)
    setBrantaVerifyUrl(undefined)

    if (!rawScanData && isPlainOnchainTypedRecipient(typed)) {
      setBrantaLoading(false)
      return
    }

    let cancelled = false

    const runLookup = () => {
      if (cancelled) return
      setBrantaLoading(true)
      const lookup = rawScanData ? brantaClient.getPaymentsByQrCode(rawScanData) : brantaClient.getPayments(typed)

      lookup
        .then(({ payments, verifyUrl }) => {
          if (cancelled) return
          const payment = payments?.[0] ?? null
          if (!payment) {
            setBrantaPayment(null)
            setBrantaVerifyUrl(undefined)
            return
          }
          const isHttpsUrl = (val: unknown): boolean => typeof val === 'string' && val.startsWith('https://')
          setBrantaPayment({
            ...payment,
            platformLogoUrl: isHttpsUrl(payment.platformLogoUrl) ? payment.platformLogoUrl : undefined,
            platformLogoLightUrl: isHttpsUrl(payment.platformLogoLightUrl) ? payment.platformLogoLightUrl : undefined,
          })
          setBrantaVerifyUrl(isHttpsUrl(verifyUrl) ? verifyUrl : undefined)
        })
        .catch((err) => {
          if (cancelled) return
          consoleError('Branta API error', err)
          setBrantaPayment(null)
          setBrantaVerifyUrl(undefined)
        })
        .finally(() => {
          if (cancelled) return
          setBrantaLoading(false)
        })
    }

    // QR scans verify immediately; typed input is debounced to avoid one request per keystroke
    const timer = rawScanData ? null : setTimeout(runLookup, 400)
    if (rawScanData) runLookup()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [rawScanData, recipient])

  // check lnurl limits
  useEffect(() => {
    if (!lnUrlResponse) return
    const { satoshis } = sendInfo
    const { minSendable: min, maxSendable: max } = lnUrlResponse
    if (!min || !max) return
    if (min > balance) return setError(t('send.insufficientFundsForLnurl'))
    if (satoshis && satoshis < min) return setError(t('send.amountBelowLnurlMin'))
    if (satoshis && satoshis > max) return setError(t('send.amountAboveLnurlMax'))
    if (min === max) {
      setAmountIsReadOnly(true)
    } else {
      setAmountIsReadOnly(false)
    }
  }, [lnUrlResponse])

  // check lnurl conditions
  useEffect(() => {
    if (!sendInfo.lnUrl) return
    if (sendInfo.arkAddress) return
    if (sendInfo.invoice && lnUrlResponse) return
    checkLnUrlConditions(sendInfo.lnUrl)
      .then((conditions) => {
        if (!conditions) return setRecipientError(t('send.unableToFetchLnurl'))
        const min = Math.floor(conditions.minSendable / 1000) // from millisatoshis to satoshis
        const max = Math.floor(conditions.maxSendable / 1000) // from millisatoshis to satoshis
        // when the LNURL resolves to a fixed amount, set amountTextValue
        if (min === max) {
          setSendInfo({ ...sendInfo, satoshis: min })
          setAmountTextValue(getTextValue(min))
          setAmountIsReadOnly(true)
        }
        return setLnUrlResponse({ ...conditions, minSendable: min, maxSendable: max })
      })
      .catch((e) => {
        if (e.status === 404) {
          consoleError(e, 'LNURL not found')
          setRecipientError(t('send.lnurlNotFound'))
          return
        }
        consoleError(e, 'Error checking LNURL conditions')
        setRecipientError(extractError(e))
      })
  }, [sendInfo.arkAddress, sendInfo.lnUrl])

  // check if user wants to send all funds
  useEffect(() => {
    if (sendInfo.lnUrl && sendInfo.satoshis === balance) handleSendAll()
  }, [sendInfo.lnUrl])

  // validate recipient addresses
  useEffect(() => {
    if (!receivingAddresses) return
    const { offchainAddr } = receivingAddresses
    const { address, arkAddress, invoice, lnUrl } = sendInfo
    // check server limits for onchain transactions
    if (address && !arkAddress && !invoice && !lnUrl && !utxoTxsAllowed()) {
      return setRecipientError(t('send.sendingOnchainNotAllowed'))
    }
    // check server limits for offchain transactions
    if (!address && (arkAddress || invoice || lnUrl) && !vtxoTxsAllowed()) {
      return setRecipientError(t('send.sendingOffchainNotAllowed'))
    }
    // check if server key is valid
    if (arkAddress && arkAddress.length > 0) {
      const { serverPubKey } = decodeArkAddress(arkAddress)
      const { serverPubKey: expectedServerPubKey } = decodeArkAddress(offchainAddr)
      if (serverPubKey !== expectedServerPubKey) {
        // if there's no other way to pay, show error
        if (!address && !invoice) return setRecipientError(t('send.arkadeServerKeyMismatch'))
        // remove ark address from possibilities to send and continue
        // we will try to pay to lightning or mainnet instead
        setSendInfo({ ...sendInfo, arkAddress: '' })
      }
    }
    // everything is ok, clean error
    setRecipientError('')
  }, [receivingAddresses, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.lnUrl])

  // manage button label and errors
  useEffect(() => {
    if (isAssetSend && activeAsset) {
      const assetAmount = sendInfo.account?.amount ?? sendInfo.assets?.[0]?.amount ?? BigInt(0)
      setLabel(
        taxiLacksSats
          ? t('send.insufficientFunds')
          : assetAmount > activeAsset.balance && !payViaReceiverTaxi
            ? t('send.insufficientAssetBalance')
            : t('send.continue'),
      )
      return
    }
    const satoshis = sendInfo.satoshis ?? 0
    setLabel(
      satoshis > liquidBalance
        ? t('send.insufficientFunds')
        : lnUrlResponse?.minSendable && satoshis < lnUrlResponse.minSendable
          ? t('send.amountBelowLnurlMin')
          : lnUrlResponse?.maxSendable && satoshis > lnUrlResponse.maxSendable
            ? t('send.amountAboveLnurlMax')
            : satoshis && satoshis < 1
              ? t('send.amountBelowOneSat')
              : amountIsAboveMaxLimit(satoshis)
                ? t('send.amountAboveMax')
                : satoshis && amountIsBelowMinLimit(satoshis)
                  ? t('send.amountBelowMin')
                  : t('send.continue'),
    )
  }, [
    sendInfo.satoshis,
    sendInfo.assets,
    sendInfo.account,
    liquidBalance,
    activeAsset,
    payViaReceiverTaxi,
    taxiLacksSats,
  ])

  // manage server unreachable error
  useEffect(() => {
    const errTxt = aspErrorText(aspInfo, t('init.arkadeServerUnreachable'), t('errors.outdatedWallet'))
    if (!aspInfo.unreachable) {
      // Server reachable again: clear either unavailable variant we may have
      // shown (generic unreachable or the outdated-client message) without
      // clobbering unrelated errors.
      const outdatedTxt = aspErrorText({ ...aspInfo, outdated: true }, errTxt, t('errors.outdatedWallet'))
      setError((prev) => (prev === errTxt || prev === outdatedTxt ? '' : prev))
      return
    }
    setError(errTxt)
    setLabel(t('send.serverUnreachable'))
  }, [aspInfo.unreachable, aspInfo.outdated, t])

  // proceed to next step
  useEffect(() => {
    if (!proceed) return
    if (!sendInfo.address && !sendInfo.arkAddress && !sendInfo.invoice) return
    // Everything except an un-negotiated invoice goes straight through: an ark
    // address, an on-chain address, and an invoice whose quote is already in
    // hand all have all they need to be signed on the next screen.
    if (!sendInfo.invoice || sendInfo.pendingLnSend || sendInfo.arkAddress) return navigate(Pages.SendDetails)
    {
      // RFQ Lightning send: negotiate a quote over Nostr, derive the covenant
      // locally, verify, and carry the address+amount to the pay screen. The
      // negotiation is the only interactive step — funding IS acceptance.
      const negotiate = async () => {
        if (!svcWallet) return handleError(t('send.walletNotReady'))
        const network = aspInfo.network as NetworkName
        // No emulator URL is looked up here: this corridor needs the co-signer's
        // x-only KEY, never an endpoint. It rides the solver's own card; the
        // per-network pin is passed as the fallback for cards that predate the
        // field (see lnSendRendezvous). Neither available yields no rendezvous,
        // which the line below already reports.
        const rendezvous = lnSendRendezvous(await discoverMarkets(network), getEmulatorPubkeyForNetwork(network))
        if (!rendezvous) return handleError(t('send.noLightningSolver'))
        const sats = sendInfo.satoshis ?? 0
        if (sats < rendezvous.minSats || sats > rendezvous.maxSats) {
          return handleError(
            `Amount outside solver bounds (${prettyNumber(rendezvous.minSats)}-${prettyNumber(rendezvous.maxSats)} sats)`,
          )
        }
        await withRfqTransport(rendezvous, async (transport) => {
          const pendingLnSend = await requestLnSend({
            wallet: svcWallet,
            arkServerUrl: aspInfo.url,
            transport,
            invoice: sendInfo.invoice!,
            network,
            rendezvous,
          })
          setSendInfo((prev) => ({ ...prev, pendingLnSend }))
        })
      }
      negotiate().catch(handleError)
    }
  }, [proceed, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.pendingLnSend])

  // deal with fees deduction from amount
  useEffect(() => {
    const satoshis = sendInfo.satoshis ?? 0
    const onlyBtcAddress = sendInfo.address && !sendInfo.arkAddress && !sendInfo.invoice
    if (sendInfo.arkAddress) {
      setDeductFromAmount(false)
    } else if (onlyBtcAddress) {
      const fees = calcOnchainOutputFee()
      setDeductFromAmount(satoshis + fees > liquidBalance)
    } else {
      setDeductFromAmount(false)
    }
  }, [liquidBalance, sendInfo.satoshis, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.lnUrl])

  if (!svcWallet) return <LoadingLogo text={t('common.loading')} />

  const handleError = (err: any) => {
    consoleError(err, 'error sending payment')
    if (err instanceof SolverNotRespondingError) {
      setError(t('errors.solverNotResponding', { seconds: Math.round(err.timeoutMs / 1000) }))
    } else if (/AMOUNT_TOO_LOW|amount is lower than/i.test(extractError(err))) {
      setError(t('errors.onchainAmountTooLow'))
    } else {
      setError(extractError(err))
    }
    setProcessing(false)
  }

  const handleAmountChange = (value: string) => {
    setValueSats(undefined)
    setAmountTextValue(value)
    if (isAssetSend) {
      if (sendInfo.account) {
        const accountAmount = unitsToCents(value, sendInfo.account.decimals)
        setSendInfo({
          ...sendInfo,
          account: { ...sendInfo.account, amount: accountAmount },
          assets: [
            {
              assetId: sendInfo.account.source.assetId,
              amount: normalizeAssetMinorUnits(
                accountAmount,
                sendInfo.account.decimals,
                sendInfo.account.source.decimals,
              ),
            },
          ],
          satoshis: 0,
        })
      } else if (selectedAsset) {
        const decimals = selectedAsset?.decimals
        const cents = unitsToCents(value, decimals)
        setSendInfo({
          ...sendInfo,
          assets: [{ assetId: selectedAsset.assetId, amount: cents }],
          satoshis: 0,
        })
      }
    } else {
      const num = Number(value)
      if (Number.isNaN(num) || !Number.isFinite(num)) return setError(t('send.invalidAmount'))
      const sats = fiatEntry ? fromFiat(num) : config.unit === Unit.BTC ? toSatoshis(num) : Math.floor(num)
      setSendInfo({ ...sendInfo, satoshis: sats })
    }
  }

  const handleKeyboardAmountSave = (value: string, inputMode: KeyboardInputMode) => {
    setKeys(false)
    if (inputMode === 'asset') return handleAmountChange(value)
    // the form field adopts whichever denomination the keyboard was last in,
    // so the saved text needs no re-expression — just its sats equivalent
    const sats =
      inputMode === 'fiat' ? fromFiat(Number(value)) : inputMode === 'btc' ? toSatoshis(Number(value)) : Number(value)
    setEntryMode(inputMode === 'fiat' ? 'fiat' : 'unit')
    setAmountTextValue(value)
    setValueSats(sats)
    setSendInfo({ ...sendInfo, satoshis: sats })
  }

  const handleSelectAsset = (asset: AssetOption | null) => {
    setShowAssetSelector(false)
    setSelectedAsset(asset)
    if (asset) {
      if (isBTCAddress(recipient)) {
        return setError(t('send.assetsOnlyToArkade'))
      }
      setSendInfo({
        ...sendInfo,
        account: undefined,
        address: '',
        assets: [{ assetId: asset.assetId, amount: BigInt(0) }],
        satoshis: 0,
      })
    } else {
      setSendInfo({ ...sendInfo, account: undefined, assets: undefined, satoshis: 0 })
    }
    setAmountTextValue('')
  }

  const handleRecipientChange = (recipient: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setRecipient(recipient)
    setParsingRecipient(true)
    setReadyToParse(false)
    setRawScanData('')
    timeoutRef.current = setTimeout(() => setReadyToParse(true), RECIPIENT_DEBOUNCE_MS)
  }

  const approvalUi: PayRailUi = {
    confirmPayment: (terms) => new Promise((answer) => setApproval({ terms, answer })),
  }

  const answerApproval = (ok: boolean) => {
    approval?.answer(ok)
    setApproval(undefined)
  }

  const payWithReceiverTaxi = async () => {
    const [{ assetId, amount }] = sendInfo.assets!
    const markets = await discoverMarkets(aspInfo.network as NetworkName)
    const swap = await payAssetRequest(
      { arkAddress: sendInfo.arkAddress!, assetId, amount, taxi: receiverTaxi!.taxi },
      walletAssetRfqDeps({ aspInfo, wallet: svcWallet, markets, assetId, ui: approvalUi }),
    )
    setSendInfo({ ...sendInfo, txid: swap.fundingTxid })
    navigate(Pages.SendSuccess)
  }

  const payWithDirectTaxi = async (forget = false) => {
    const originalSend = pendingDirectTaxi.current?.send ?? sendInfo
    try {
      let txid: string | undefined
      const pending = pendingDirectTaxi.current?.payment
      if (forget && pending instanceof FailedDirectTaxi) txid = await pending.forget()
      else if (pending) txid = await pending.resume()
      else {
        const [asset] = canUseDirectTaxi ? originalSend.assets! : []
        const url = asset ? directTaxiUrl : subdustTaxiUrl
        if (!svcWallet || !url || directTaxiMode === 'normal') throw new Error('Taxi payment is unavailable')
        txid = await sendDirectTaxi({
          wallet: svcWallet,
          aspInfo,
          taxi: asset
            ? { url, operatorKey: directRequestTaxi?.operatorKey, payer: directRequestTaxi?.payer }
            : { url, operatorKey: bitcoinTaxi?.operatorKey, fareId: bitcoinTaxi?.fareId, payer: bitcoinTaxi?.payer },
          receiverAddress: originalSend.arkAddress!,
          assetId: asset?.assetId,
          amount: asset ? asset.amount : BigInt(originalSend.satoshis ?? 0),
          mode: directTaxiMode,
          confirmPayment: (terms) => new Promise((answer) => setApproval({ terms, answer })),
        })
      }
      pendingDirectTaxi.current = undefined
      // Only forget() settles without a txid, once it has cleared the record.
      if (txid === undefined) {
        setSendInfo(originalSend)
        setRecipient(originalSend.arkAddress!)
        setError('')
        return setProcessing(false)
      }
      reloadWallet().catch(consoleError)
      setSendInfo({ ...originalSend, txid })
      navigate(Pages.SendSuccess)
    } catch (error) {
      if (error instanceof ReturnedDirectTaxi) {
        pendingDirectTaxi.current = undefined
        setSendInfo(pendingSendInfo(error))
        setRecipient(error.record.receiverAddress)
        setReturnedTaxiNotice(error.message)
        setError('')
        setProcessing(false)
        reloadWallet().catch(consoleError)
        return
      }
      if (error instanceof PendingDirectTaxi)
        pendingDirectTaxi.current = { payment: error, send: pendingSendInfo(error) }
      throw error
    }
  }

  const forgetTaxiPayment = async () => {
    setProcessing(true)
    try {
      await payWithDirectTaxi(true)
    } catch (error) {
      handleError(error)
    }
  }

  const handleContinue = async () => {
    setProcessing(true)
    setReturnedTaxiNotice('')
    const satoshis = sendInfo.satoshis ?? 0
    try {
      const recorded = await getPendingDirectTaxi(svcWallet, aspInfo.network)
      if (recorded && !pendingDirectTaxi.current)
        pendingDirectTaxi.current = { payment: recorded, send: pendingSendInfo(recorded) }
      if (pendingDirectTaxi.current) return await payWithDirectTaxi()
      if (payViaReceiverTaxi && sendInfo.arkAddress) return await payWithReceiverTaxi()
      if (payViaDirectTaxi) return await payWithDirectTaxi()
      if (sendInfo.lnUrl && lnUrlResponse) {
        // Check if Ark method is available
        const arkMethod = lnUrlResponse.transferAmounts?.find((method) => method.method === 'Ark' && method.available)

        if (arkMethod) {
          // Fetch Ark address instead of Lightning invoice
          const arkResponse = await fetchArkAddress(sendInfo.lnUrl)
          if (!isValidArkAddress(arkResponse.address)) {
            handleError(t('send.invalidArkadeAddressFromLnurl'))
            return
          }
          setSendInfo((prev) => ({
            ...prev,
            arkAddress: arkResponse.address,
            invoice: undefined,
            pendingLnSend: undefined,
          }))
        } else {
          // No Ark method: fetch a BOLT11 and pay it through the RFQ Lightning
          // path (exact-out, zero spread — no fee to deduct from the amount)
          if (satoshis < 1) return handleError(t('send.amountTooLow'))
          const invoice = await fetchInvoice(sendInfo.lnUrl, Number(satoshis), '')
          setSendInfo((prev) => ({
            ...prev,
            arkAddress: undefined,
            invoice,
            pendingLnSend: invoice === prev.invoice ? prev.pendingLnSend : undefined,
          }))
        }
      } else {
        setSendInfo({ ...sendInfo, satoshis })
      }
      setProceed(true)
    } catch (error) {
      if (error instanceof PaymentDeclined) return setProcessing(false)
      handleError(error)
    }
  }

  const handleEnter = () => {
    if (!buttonDisabled) return handleContinue()
    if (!amount && focus === 'recipient') setFocus('amount')
    if (!recipient && focus === 'amount') setFocus('recipient')
  }

  const handleFocus = () => {
    if (isMobileBrowser) setKeys(true)
  }

  const applySendAll = () => {
    if (sendInfo.account) {
      setSendInfo({
        ...sendInfo,
        account: { ...sendInfo.account, amount: sendInfo.account.balance },
        assets: [{ assetId: sendInfo.account.source.assetId, amount: sendInfo.account.source.balance }],
        satoshis: 0,
      })
      setAmountTextValue(centsToUnits(sendInfo.account.balance, sendInfo.account.decimals))
    } else if (isAssetSend && selectedAsset) {
      const { assetId, balance, decimals } = selectedAsset
      const assets = [{ assetId, amount: balance }]
      setSendInfo({ ...sendInfo, assets, satoshis: 0 })
      setAmountTextValue(centsToUnits(balance, decimals))
    } else {
      setAmount(liquidBalance)
      setValueSats(liquidBalance)
      setSendInfo({ ...sendInfo, satoshis: liquidBalance })
      setAmountTextValue(getTextValue(liquidBalance))
    }
  }

  const handleSendAll = () => {
    if (reserveApplied) setShowReserveModal(true)
    else applySendAll()
  }

  const confirmSendAll = () => {
    setShowReserveModal(false)
    applySendAll()
  }

  const Available = () => {
    if (isAssetSend && activeAsset) {
      return (
        <div onClick={handleSendAll} style={{ cursor: 'pointer' }}>
          <Text color='neutral-500' smaller>
            {t('send.available', {
              amount: `${prettyAssetAmount(activeAsset.balance, activeAsset.decimals)} ${activeAsset.ticker}`,
            })}
          </Text>
        </div>
      )
    }

    const amount = fiatEntry
      ? prettyFiatAmount(liquidBalance ? toFiat(liquidBalance) : 0, config.currency)
      : prettyUnitBalance(liquidBalance)

    return (
      <div onClick={handleSendAll} style={{ cursor: 'pointer' }}>
        <Text color='neutral-500' smaller>
          {t('send.available', { amount })}
        </Text>
      </div>
    )
  }

  const { address, arkAddress, lnUrl, invoice, satoshis } = sendInfo

  const assetAmt = sendInfo.account?.amount ?? sendInfo.assets?.[0]?.amount ?? BigInt(0)

  // a partial asset send leaves asset change, and that change needs a second
  // dust carrier; without one the SDK fails with a bare "Insufficient funds".
  // Derived, not stored: the server-status effect owns `error` and would
  // clear this on recovery.
  const carrierError =
    !processing &&
    !payViaReceiverTaxi &&
    !payViaDirectTaxi &&
    activeAsset &&
    assetAmt > BigInt(0) &&
    assetAmt < activeAsset.balance &&
    availableBalance < 2 * Number(aspInfo.dust)
      ? PARTIAL_SEND_ERROR
      : ''

  const carrierModes: Partial<Record<keyof typeof TAXI_SEND_MODES, string>> | undefined = canUseDirectTaxi
    ? directRequestTaxi?.payer === 'sender'
      ? { normal: TAXI_SEND_MODES.normal, purchase: TAXI_SEND_MODES.purchase, sponsored: TAXI_SEND_MODES.sponsored }
      : TAXI_SEND_MODES
    : subdustModes
      ? Object.fromEntries((['normal', ...subdustModes] as const).map((mode) => [mode, BITCOIN_TAXI_MODES[mode]]))
      : undefined
  const failedTaxi =
    pendingDirectTaxi.current?.payment instanceof FailedDirectTaxi ? pendingDirectTaxi.current.payment : undefined

  const buttonDisabled =
    checkingTaxiPayment || taxiGuardFailed
      ? true
      : pendingDirectTaxi.current
        ? processing
        : parsingRecipient || Boolean(recipientError)
          ? true
          : isAssetSend
            ? !(arkAddress && assetAmt > 0) ||
              (activeAsset ? assetAmt > activeAsset.balance && !payViaReceiverTaxi : true) ||
              taxiLacksSats ||
              Boolean(recipientError) ||
              Boolean(carrierError) ||
              aspInfo.unreachable ||
              Boolean(error) ||
              processing
            : (wantsSubdustTaxi && bitcoinTaxi?.payer === 'sender') ||
              !((address || arkAddress || lnUrl || invoice) && satoshis && satoshis > 0) ||
              (lnUrlResponse?.maxSendable && satoshis > lnUrlResponse.maxSendable) ||
              (lnUrlResponse?.minSendable && satoshis < lnUrlResponse.minSendable) ||
              amountIsAboveMaxLimit(satoshis) ||
              amountIsBelowMinLimit(satoshis) ||
              satoshis > liquidBalance ||
              aspInfo.unreachable ||
              Boolean(error) ||
              satoshis < 1 ||
              processing

  // unverified assets are never offered in the picker; they can still arrive
  // preselected via sendInfo.assets from the Assets app detail screen
  const verifiedAssetOptions = assetOptions.filter((asset) => isVerifiedAsset(asset.assetId))

  // currency designation only (ticker fallback) — the ticker already rides
  // with the amounts on the right, and long asset names collide with the
  // balance column on narrow screens
  const assetLabelFor = (asset: AssetOption) =>
    verifiedDesignatedCurrency(aspInfo.network, asset.assetId, isVerifiedAsset) ?? asset.ticker
  const selectedAssetLabel = activeAsset ? assetLabelFor(activeAsset) : t('send.bitcoin')
  const selectedAssetBalance = activeAsset
    ? t('send.available', {
        amount: `${prettyAssetAmount(activeAsset.balance, activeAsset.decimals)} ${activeAsset.ticker}`,
      })
    : t('send.available', { amount: prettyUnitBalance(liquidBalance) })

  const overlayOpen = scan || (keys && !amountIsReadOnly)
  const sendOverlayStyle = { ...overlayStyle, position: 'fixed' as const, zIndex: 20 }

  const keyboard = (
    <Keyboard
      asset={activeAsset ?? undefined}
      back={() => setKeys(false)}
      defaultMode={fiatEntry ? 'fiat' : config.unit === Unit.BTC ? 'btc' : 'sats'}
      onSave={handleKeyboardAmountSave}
    />
  )

  if (keys && !amountIsReadOnly) {
    return prefersReducedMotion ? (
      <div style={sendOverlayStyle}>{keyboard}</div>
    ) : (
      <AnimatePresence>
        <motion.div
          key='keyboard'
          variants={overlaySlideUp}
          initial='initial'
          animate='animate'
          exit='exit'
          style={sendOverlayStyle}
        >
          {keyboard}
        </motion.div>
      </AnimatePresence>
    )
  }

  if (scan) {
    // an element, never a component defined here: a fresh component type on
    // every render remounts the scanner, and each remount asks for the camera
    const scanner = (
      <Scanner
        close={() => setScan(false)}
        label={t('send.recipientAddress')}
        onData={(data) => {
          setRecipient(data)
          setParsingRecipient(true)
          setRawScanData(data)
          setReadyToParse(true)
        }}
        onError={smartSetError}
      />
    )
    return prefersReducedMotion ? (
      <div style={sendOverlayStyle}>{scanner}</div>
    ) : (
      <AnimatePresence>
        <motion.div
          key='scanner'
          variants={overlaySlideUp}
          initial='initial'
          animate='animate'
          exit='exit'
          style={sendOverlayStyle}
        >
          {scanner}
        </motion.div>{' '}
      </AnimatePresence>
    )
  }

  return (
    <>
      <div
        /* @ts-expect-error inert is valid HTML but React types lag behind */
        inert={overlayOpen || undefined}
        className='send-form'
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <Header text={t('send.title')} back />
        <Content>
          <Padded>
            <FlexCol gap='1.25rem' className='send-form-stack'>
              <ErrorMessage
                error={Boolean(error || carrierError || returnedTaxiNotice)}
                text={error || carrierError || returnedTaxiNotice}
              />
              {failedTaxi ? (
                <TextSecondary>
                  {`Taxi transfer ${failedTaxi.record.transferId}: its coins may stay locked until the operator resolves it. Forgetting it lets you send again; it does not cancel it, and if the operator later completes it, sending again pays the receiver twice.`}
                </TextSecondary>
              ) : null}
              <InputAddress
                error={recipientError}
                focus={focus === 'recipient'}
                label={t('send.recipientAddress')}
                name='send-address'
                onChange={handleRecipientChange}
                onEnter={handleEnter}
                openScan={() => {
                  setKeys(false)
                  setScan(true)
                }}
                value={recipient}
              />
              {brantaLoading ? (
                <Text color='neutral-500' smaller>
                  {t('send.verifyingAddress')}
                </Text>
              ) : null}
              {brantaPayment
                ? (() => {
                    const card = (
                      <Shadow>
                        <FlexRow between padding='0.75rem'>
                          <FlexCol gap='0.1rem'>
                            <Text smaller>{brantaPayment.platform}</Text>
                            {brantaPayment.description ? (
                              <Text smaller color='neutral-500'>
                                {brantaPayment.description}
                              </Text>
                            ) : null}
                            <Text smaller color='neutral-500'>
                              {t('send.verifiedByBranta')}
                            </Text>
                          </FlexCol>
                          {(() => {
                            const logoUrl =
                              effectiveTheme === Themes.Light
                                ? (brantaPayment.platformLogoLightUrl ?? brantaPayment.platformLogoUrl)
                                : brantaPayment.platformLogoUrl
                            return logoUrl ? (
                              <img src={logoUrl} alt={brantaPayment.platform} width={48} height={48} />
                            ) : null
                          })()}
                        </FlexRow>
                      </Shadow>
                    )
                    // Only wrap in an anchor when there's a real verify URL; an <a> without href is a
                    // placeholder link that screen readers may still announce.
                    return brantaVerifyUrl ? (
                      <a
                        href={brantaVerifyUrl}
                        target='_blank'
                        rel='noreferrer'
                        style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}
                      >
                        {card}
                      </a>
                    ) : (
                      card
                    )
                  })()
                : null}
              {verifiedAssetOptions.length > 0 || selectedAsset ? (
                <FlexCol gap='0.5rem' className='send-asset-field'>
                  <Text smaller color='neutral-500'>
                    {t('send.asset')}
                  </Text>
                  <DropdownMenu
                    open={showAssetSelector}
                    onOpenChange={(open: any) => {
                      if (open) hapticLight()
                      setShowAssetSelector(open)
                    }}
                    modal={false}
                  >
                    <DropdownMenuTrigger
                      aria-expanded={showAssetSelector}
                      className='send-asset-trigger'
                      data-testid='asset-selector'
                    >
                      <span className='send-asset-trigger__main'>
                        <AssetIcon asset={activeAsset} />
                        <span className='send-asset-trigger__copy'>
                          <span className='send-asset-trigger__name'>
                            {selectedAssetLabel}
                            {activeAsset && !isVerifiedAsset(activeAsset.assetId) ? <UnverifiedBadge /> : null}
                          </span>
                          <span className='send-asset-trigger__balance'>{selectedAssetBalance}</span>
                        </span>
                      </span>
                      <span className='send-asset-trigger__chevron' aria-hidden='true'>
                        {showAssetSelector ? '▲' : '▼'}
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='send-asset-menu' align='start' side='bottom' sideOffset={8}>
                      <FlexCol gap='0.25rem'>
                        {activeAsset ? (
                          <DropdownMenuItem className='send-asset-option' onClick={() => handleSelectAsset(null)}>
                            <span className='send-asset-option__main'>
                              <AssetIcon asset={null} />
                              <span>
                                <span className='send-asset-option__name'>{t('send.bitcoin')}</span>
                              </span>
                            </span>
                            <span className='send-asset-option__amount'>{prettyUnitBalance(liquidBalance)}</span>
                          </DropdownMenuItem>
                        ) : null}
                        {verifiedAssetOptions
                          .filter(
                            (asset) =>
                              asset.assetId !== activeAsset?.assetId &&
                              asset.assetId !== sendInfo.account?.source.assetId,
                          )
                          .map((asset) => (
                            <DropdownMenuItem
                              key={asset.assetId}
                              className='send-asset-option'
                              onClick={() => handleSelectAsset(asset)}
                              data-testid={`asset-${asset.ticker.toLowerCase()}-option`}
                            >
                              <span className='send-asset-option__main'>
                                <AssetIcon asset={asset} />
                                <span>
                                  <span className='send-asset-option__name'>{assetLabelFor(asset)}</span>
                                </span>
                              </span>
                              <span className='send-asset-option__amount'>
                                {prettyAssetAmount(asset.balance, asset.decimals)} {asset.ticker}
                              </span>
                            </DropdownMenuItem>
                          ))}
                      </FlexCol>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </FlexCol>
              ) : null}
              <FlexCol gap='0.5rem'>
                <InputAmount
                  label={t('common.amount')}
                  name='send-amount'
                  valueSats={valueSats}
                  right={<Available />}
                  onEnter={handleEnter}
                  onFocus={handleFocus}
                  onMax={handleSendAll}
                  value={amountTextValue}
                  readOnly={amountIsReadOnly || Boolean(pendingDirectTaxi.current)}
                  onChange={handleAmountChange}
                  onModeChange={handleEntryModeChange}
                  mode={entryMode}
                  switchable
                  min={lnUrlResponse?.minSendable}
                  max={lnUrlResponse?.maxSendable}
                  asset={activeAsset ?? undefined}
                  focus={focus === 'amount' && !isMobileBrowser}
                />
              </FlexCol>
              {subdustOffer && subdustOffer.status !== 'available' ? (
                <TextSecondary>
                  {subdustOffer.status === 'checking' ? 'Checking Taxi…' : `Taxi unavailable: ${subdustOffer.reason}`}
                </TextSecondary>
              ) : null}
              {carrierModes ? (
                <TaxiDeliveryOptions
                  testId='taxi-send-mode'
                  value={directTaxiMode}
                  disabled={Boolean(pendingDirectTaxi.current)}
                  onChange={(mode) => {
                    directTaxiUserChoice.current = true
                    setDirectTaxiMode(mode as keyof typeof TAXI_SEND_MODES)
                  }}
                  description={
                    directTaxiMode === 'normal'
                      ? isAssetSend
                        ? 'Use sats from your wallet to carry the asset.'
                        : 'This amount arrives as a sub-dust coin and cannot be spent directly.'
                      : directTaxiMode === 'recycle'
                        ? isAssetSend
                          ? 'The receiver claims the asset using their own sats to repay Taxi.'
                          : `Taxi adds ${Number(aspInfo.dust) - sendSats} sats. The receiver needs a coin of at least ${Number(aspInfo.dust) - sendSats} sats to claim your ${sendSats} sats and repay Taxi.`
                        : directTaxiMode === 'purchase'
                          ? 'The receiver claims the delivery without using sats from their wallet.'
                          : 'The receiver gets a spendable delivery with no claim needed. You pay for the carrier.'
                  }
                  options={(Object.keys(carrierModes) as (keyof typeof TAXI_SEND_MODES)[]).map((mode) => ({
                    value: mode,
                    label: carrierModes[mode]!,
                    cost:
                      subdustOffer?.status === 'available' && mode === 'recycle' && subdustOffer.fareUnits === 0n
                        ? 'Free'
                        : undefined,
                    description:
                      mode === 'normal'
                        ? isAssetSend
                          ? 'Use your own sats for the carrier.'
                          : 'Receive a sub-dust coin that cannot be spent directly.'
                        : mode === 'recycle'
                          ? 'The receiver uses their own sats to repay Taxi when claiming.'
                          : mode === 'purchase'
                            ? 'Buy the carrier so the receiver needs no sats to claim.'
                            : 'Pay for the carrier and deliver directly, without a claim.',
                  }))}
                />
              ) : null}
              {deductFromAmount ? <InfoLine color='orange' text={t('send.feesDeductedFromAmount')} /> : null}
            </FlexCol>
          </Padded>
        </Content>
        <ButtonsOnBottom>
          <Button
            onClick={handleContinue}
            label={pendingDirectTaxi.current ? 'Check Taxi payment' : label}
            disabled={buttonDisabled}
          />
          {failedTaxi ? (
            <Button onClick={forgetTaxiPayment} label='Forget Taxi payment' secondary disabled={processing} />
          ) : null}
        </ButtonsOnBottom>
      </div>
      <SheetModal isOpen={showReserveModal} onClose={() => setShowReserveModal(false)}>
        <FlexCol gap='1rem'>
          <Text bold>{t('send.balanceReserve')}</Text>
          <Text color='neutral-500' small wrap>
            {t('send.balanceReserveText', { dust: aspInfo.dust.toString(), max: prettyNumber(liquidBalance) })}
          </Text>
          <FlexCol gap='0.5rem'>
            <Button onClick={confirmSendAll} label={t('send.sendMax')} />
            <Button onClick={() => setShowReserveModal(false)} label={t('common.cancel')} secondary />
          </FlexCol>
        </FlexCol>
      </SheetModal>
      <SheetModal isOpen={Boolean(approval)} onClose={() => answerApproval(false)}>
        <FlexCol gap='1rem'>
          <Text bold>Confirm payment</Text>
          {approval && 'refreshed' in approval.terms && approval.terms.refreshed ? (
            <Text color='neutral-500' small wrap>
              The last price expired before you confirmed it, so this is a new one.
            </Text>
          ) : null}
          <Text
            color='neutral-500'
            small
            wrap
            testId={approval && 'mode' in approval.terms ? 'taxi-confirm-costs' : undefined}
          >
            {approval
              ? 'mode' in approval.terms
                ? approval.terms.assetId === undefined
                  ? bitcoinTaxiTerms(approval.terms)
                  : `Send ${prettyAssetAmount(approval.terms.assetAmount, activeAsset?.decimals ?? 8)} ${activeAsset?.ticker ?? ''}. Service fee: ${approval.terms.fareUnits === 0n ? 'Free' : approval.terms.fareCurrency === 'sats' ? `${approval.terms.fareUnits} sats` : `${prettyAssetAmount(approval.terms.fareUnits, activeAsset?.decimals ?? 8)} ${activeAsset?.ticker ?? ''}`}. Taxi carrier: ${approval.terms.carrierSats} sats. ${approval.terms.mode === 'recycle' ? 'The receiver uses their own sats to repay the carrier.' : approval.terms.mode === 'purchase' ? 'The receiver claims the purchased carrier without their own sats.' : 'The receiver gets a direct delivery with no claim needed.'}`
                : `Pay ${prettyNumber(Number(approval.terms.payAmountSats))} sats to send ${prettyAssetAmount(approval.terms.assetAmount, activeAsset?.decimals ?? 8)} ${activeAsset?.ticker ?? ''}`
              : ''}
          </Text>
          <FlexCol gap='0.5rem'>
            <Button onClick={() => answerApproval(true)} label='Pay' />
            <Button onClick={() => answerApproval(false)} label='Cancel' secondary />
          </FlexCol>
        </FlexCol>
      </SheetModal>
    </>
  )
}
