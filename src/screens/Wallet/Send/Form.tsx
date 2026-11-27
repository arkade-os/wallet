import { useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { BrantaEnvironment, BrantaService, VerifyStatus, type Payment, type VerifyResult } from '@branta-ops/branta'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import {
  isBTCAddress,
  isLightningInvoice,
  isURLWithLightningQueryString,
  haveSameServerPubKey,
} from '../../../lib/address'
import { AspContext } from '../../../providers/asp'
import { isArkNote } from '../../../lib/arknote'
import InputAmount, { type InputAmountMode } from '../../../components/InputAmount'
import InputAddress from '../../../components/InputAddress'
import Header from '../../../components/Header'
import { WalletContext } from '../../../providers/wallet'
import {
  canConvertCurrency,
  fromSatoshis,
  prettyAmount,
  prettyFiatAmount,
  prettyNumber,
  satsFromEntry,
  textFromSats,
  toSatoshis,
} from '../../../lib/format'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Keyboard, { KeyboardInputMode } from '../../../components/Keyboard'
import Text from '../../../components/Text'
import Shadow from '../../../components/Shadow'
import Scanner from '../../../components/Scanner'
import LoadingLogo from '../../../components/LoadingLogo'
import { consoleError } from '../../../lib/logs'
import { Addresses, AssetOption, Themes, Unit } from '../../../lib/types'
import { aspErrorText, getReceivingAddresses } from '../../../lib/asp'
import { isMobileBrowser } from '../../../lib/browser'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { ArkNote, AssetDetails, isValidArkAddress } from '@arkade-os/sdk'
import { LimitsContext } from '../../../providers/limits'
import { createLnurlClient, isValidLnUrl, LnurlError, type PayRequest } from '@arkade-os/lnurl-client'
import { lnurlPayableRanges } from '@arkade-os/lnurl-client/arkade'
import { fetchArkAddress } from '../../../lib/lnurl'
import { extractError } from '../../../lib/error'
import { decodeInvoice, isInvoiceExpired } from '../../../lib/bolt11'
import {
  appSendNeedsDriver,
  paymentEndedWithoutDelivery,
  quoteLnurl,
  trackedAppSwapPayment,
} from '../../../lib/sendRouter'
import { SwapsContext } from '../../../providers/swaps'
import { newRequestId } from '../../../lib/requestId'
import { appIntentHandoff, redirectToCallback } from '../../../lib/appIntent'
import OpenInApp from '../../AppIntent/OpenInApp'
import { decodeBip21, exactBip21Amount, isBip21 } from '../../../lib/bip21'
import { InfoLine } from '../../../components/Info'
import { atomicToUnits, isValidAssetId, prettyAssetAmount, unitsToAtomic } from '../../../lib/assets'
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
  walletAssetLabel,
} from '../../../lib/accountAssets'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import { hapticLight } from '../../../lib/haptics'
import { testDomains } from '../../../lib/constants'
import UnverifiedBadge from '../../../components/UnverifiedBadge'
import { useTranslation } from '../../../providers/language'
import ContactPicker from '../../../components/ContactPicker'
import Checkbox from '../../../components/Checkbox'
import InputContainer from '../../../components/InputContainer'
import { contactForAddress, isReusableContact, sendDestination } from '../../../lib/contacts'

const isProductionEnv = !testDomains.some((d) => window.location.hostname.includes(d))

const brantaClient = new BrantaService({
  environment: isProductionEnv ? BrantaEnvironment.Production : BrantaEnvironment.Staging,
})

const lnurlClient = createLnurlClient()

// resolve() preserves the legacy transferAmounts field although PayRequest omits it.
type LnurlPayRequest = PayRequest & {
  transferAmounts?: { method: string; available: boolean }[]
}

type LnUrlConditions = {
  target: string
  payRequest: LnurlPayRequest
  sendRanges: { min: number; max: number }[]
  minSendable: number
  maxSendable: number
}

type LinkedAssetPayment = {
  recipient: string
  address: string
  asset: AssetOption
  fixedAmount?: { atomic: bigint; units: string }
}

/** Spread before the one target a recipient sets, so the previous one cannot be paid instead. */
const noTarget = {
  address: undefined,
  arkAddress: undefined,
  assetPayment: undefined,
  invoice: undefined,
  lnUrl: undefined,
  lnurlInvoice: undefined,
  pendingLnSend: undefined,
}

// decodeBip21 ignores these, but the SDK can verify an on-chain URI that carries both;
// it matches decoded, lowercased names, so this must too
const hasBrantaParams = (value: string): boolean => {
  const query = value.includes('?') ? value.slice(value.indexOf('?') + 1) : ''
  const names = new Set([...new URLSearchParams(query).keys()].map((name) => name.toLowerCase()))
  return names.has('branta_id') && names.has('branta_secret')
}

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
        !decoded.assetId &&
        !hasBrantaParams(value),
    )
  } catch {
    return false
  }
}

const isHttpsUrl = (val: unknown): boolean => typeof val === 'string' && val.startsWith('https://')

// only a match earns the card; unknown, tampered and incomplete all show nothing
export const brantaCard = (result: VerifyResult): { payment: Payment; verifyUrl?: string } | null => {
  const payment = result.status === VerifyStatus.Match ? result.payments[0] : undefined
  if (!payment) return null
  return {
    payment: {
      ...payment,
      platformLogoUrl: isHttpsUrl(payment.platformLogoUrl) ? payment.platformLogoUrl : undefined,
      platformLogoLightUrl: isHttpsUrl(payment.platformLogoLightUrl) ? payment.platformLogoLightUrl : undefined,
    },
    verifyUrl: isHttpsUrl(result.verifyUrl) ? result.verifyUrl : undefined,
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

export default function SendForm() {
  const { aspInfo } = useContext(AspContext)
  const { config, effectiveTheme, useFiat } = useContext(ConfigContext)
  const { calcOnchainOutputFee } = useContext(FeesContext)
  const { toFiat, fromFiat, fiatDecimals } = useContext(FiatContext)
  const { appIntent, sendInfo, resetFlow, setNoteInfo, setSendInfo } = useContext(FlowContext)
  const { amountIsAboveMaxLimit, amountIsBelowMinLimit, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { navigate } = useContext(NavigationContext)
  const { outcomeOf, sendRouter } = useContext(SwapsContext)
  const { t } = useTranslation()
  const recipientAssetLabelId = useId()
  const {
    assetBalances,
    availableAssetBalances,
    assetMetadataCache,
    availableBalance,
    balance,
    isVerifiedAsset,
    setCacheEntry,
    svcWallet,
  } = useContext(WalletContext)

  const [amount, setAmount] = useState<number>()
  const [amountTextValue, setAmountTextValue] = useState('')
  const [amountIsReadOnly, setAmountIsReadOnly] = useState(false)
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([])
  const [deductFromAmount, setDeductFromAmount] = useState(false)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState('recipient')
  const [label, setLabel] = useState('')
  const [resolvedLnurl, setResolvedLnurl] = useState<LnUrlConditions>()
  const lnUrlResponse = resolvedLnurl?.target === sendInfo.lnUrl ? resolvedLnurl : undefined
  const [keys, setKeys] = useState(false)
  const [proceed, setProceed] = useState(false)
  const [processing, setProcessing] = useState(false)
  // sendInfo.recipient survives a remount when the user comes back from details.
  const [readyToParse, setReadyToParse] = useState(Boolean(sendInfo.recipient))
  const [recipient, setRecipient] = useState(sendInfo.recipient ?? '')
  const [recipientError, setRecipientError] = useState('')
  const [receivingAddresses, setReceivingAddresses] = useState<Addresses>()
  const [scan, setScan] = useState(false)
  const [rawScanData, setRawScanData] = useState('')
  const [brantaPayment, setBrantaPayment] = useState<Payment | null>(null)
  const [brantaVerifyUrl, setBrantaVerifyUrl] = useState<string | undefined>(undefined)
  const [brantaLoading, setBrantaLoading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null)
  const [linkedAssetPayment, setLinkedAssetPayment] = useState<LinkedAssetPayment>()
  const [linkedFunding, setLinkedFunding] = useState<'btc' | 'requested' | undefined>(
    sendInfo.assetPayment ? 'btc' : undefined,
  )
  const [showAssetSelector, setShowAssetSelector] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [contactSheetFor, setContactSheetFor] = useState<string>()
  const [contactName, setContactName] = useState('')
  const [valueSats, setValueSats] = useState<number | undefined>(undefined)
  const [sendAll, setSendAll] = useState(false)

  const timeoutRef = useRef<NodeJS.Timeout>()
  const sendInfoRef = useRef(sendInfo)
  sendInfoRef.current = sendInfo

  const leaveAppSend = () => {
    if (appSendNeedsDriver(appIntent, sendInfo, outcomeOf)) {
      const tracked = trackedAppSwapPayment(appIntent, sendInfo)
      if (tracked && paymentEndedWithoutDelivery(outcomeOf(tracked.swapId))) resetFlow()
      navigate(Pages.Wallet)
      return
    }
    const committed = appIntent?.status === 'send' && (appIntent.committedSwap || appIntent.committedOnchain)
    const handoff = appIntentHandoff(appIntent, committed ? 'sent' : 'denied')
    resetFlow()
    if (handoff) redirectToCallback(handoff.callback, handoff.params)
    else navigate(Pages.Wallet)
  }

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
  const linkedAsset = linkedAssetPayment?.recipient === recipient ? linkedAssetPayment : undefined
  const assetAmt = linkedAsset?.fixedAmount?.atomic ?? sendInfo.account?.amount ?? sendInfo.assets?.[0]?.amount ?? 0n
  const requestedBalance =
    availableAssetBalances.find(({ assetId }) => assetId === linkedAsset?.asset.assetId)?.amount ?? 0n
  const canPayRequestedAsset = Boolean(linkedAsset && requestedBalance > 0n && requestedBalance >= assetAmt)
  const payRequestedAsset = linkedFunding === 'requested' || (linkedFunding === undefined && canPayRequestedAsset)
  const requestedAsset = linkedAsset ? { ...linkedAsset.asset, balance: requestedBalance } : null
  const fundingAsset = linkedAsset ? (payRequestedAsset ? requestedAsset : null) : activeAsset
  const swapAssetRequest =
    linkedAsset && !payRequestedAsset
      ? {
          address: linkedAsset.address,
          assetId: linkedAsset.asset.assetId,
          amount: assetAmt,
          fromAssetId: 'btc' as const,
        }
      : undefined

  const RECIPIENT_DEBOUNCE_MS = 800
  const hasAssets = assetBalances.length > 0
  const reserveApplied = !isAssetSend && hasAssets
  // The SDK's `available` already holds back the dust carrier asset change
  // needs, so a BTC spend may take all of it.
  const liquidBalance = availableBalance
  const linkedFundingAvailable = payRequestedAsset ? canPayRequestedAsset : liquidBalance > 0

  // Also used directly as a promise rejection handler, so it can receive an
  // Error; the banner renders its text as a child and cannot take the object.
  const smartSetError = (input: string | Error | unknown) => {
    const str = typeof input === 'string' ? input : extractError(input)
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
  const currencyConversionUseful = canConvertCurrency(config.currency, toFiat, fromFiat)
  const [entryMode, setEntryMode] = useState<InputAmountMode>(useFiat && currencyConversionUseful ? 'fiat' : 'unit')
  const fiatEntry = entryMode === 'fiat' && useFiat && currencyConversionUseful

  useEffect(() => {
    if (currencyConversionUseful || entryMode !== 'fiat') return
    setEntryMode('unit')
    if (!linkedAsset) setAmountTextValue(sendInfo.satoshis ? getTextValue(sendInfo.satoshis, false) : '')
  }, [config.unit, currencyConversionUseful, entryMode, linkedAsset, sendInfo.satoshis])

  const getTextValue = (sats: number, fiat = fiatEntry) => textFromSats(sats, fiat, config.unit, toFiat, fiatDecimals)

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
          decimals: meta?.metadata?.decimals ?? 0,
          trusted: isVerifiedAsset(ab.assetId),
        })
      }
      setAssetOptions(options)
    }
    loadOptions()
  }, [svcWallet, assetBalances, availableAssetBalances])

  // initialize selected asset from pre-set sendInfo.assets (e.g. from Asset Detail page)
  useEffect(() => {
    if (sendInfo.account) {
      setSelectedAsset(null)
      return
    }
    if (linkedAsset || sendInfo.assetPayment || !sendInfo.assets?.length || assetOptions.length === 0) return
    const presetAssetId = sendInfo.assets[0].assetId
    const found = assetOptions.find((a) => a.assetId === presetAssetId)
    if (found && !selectedAsset) setSelectedAsset(found)
  }, [assetOptions, linkedAsset, sendInfo.account, sendInfo.assetPayment, sendInfo.assets])

  // parse recipient data
  // repeat when asset changes to re-validate addresses (e.g. if user
  // selects an asset and the address is not compatible with it)
  // every branch stores `recipient`: sendDestination trusts a payment URI there,
  // so one left over from an earlier parse would name the wrong payee
  useEffect(() => {
    if (!readyToParse || !svcWallet || linkedAsset) return
    let active = true
    setRecipientError('')
    const parseRecipient = async () => {
      if (!recipient) return
      const lowerCaseData = recipient.toLowerCase().replace(/^lightning:/, '')
      if (isURLWithLightningQueryString(recipient)) {
        const url = new URL(recipient)
        return setRecipient(url.searchParams.get('lightning')!)
      }
      if (isBip21(lowerCaseData)) {
        const {
          address,
          arkAddress,
          invoice,
          lnUrl,
          satoshis,
          assetId: rawAssetId,
          assetAmount,
        } = decodeBip21(recipient.trim())
        if (!address && !arkAddress && !invoice && !lnUrl) return setRecipientError(t('send.unableToParseBip21'))
        if (rawAssetId) {
          if (!arkAddress || !isValidAssetId(rawAssetId)) return setRecipientError(t('send.unableToParseBip21'))
          const assetId = rawAssetId.toLowerCase()
          let meta: AssetDetails | undefined = assetMetadataCache.get(assetId)
          if (!meta) {
            try {
              const fetched = await svcWallet.assetManager.getAssetDetails(assetId)
              if (!active) return
              if (fetched) meta = setCacheEntry(assetId, fetched)
            } catch (err) {
              if (!active) return
              consoleError(err, `error fetching metadata for ${assetId}`)
            }
          }
          if (!meta) return setRecipientError(t('send.assetLinkMetadataUnavailable'))
          const decimals = meta.metadata?.decimals ?? 0
          const units = assetAmount && /[1-9]/.test(assetAmount) ? assetAmount : undefined
          const fraction = units?.split('.')[1]?.replace(/0+$/, '') ?? ''
          if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18 || fraction.length > decimals) {
            return setRecipientError(t('send.invalidAmount'))
          }
          const found = {
            assetId,
            balance: availableAssetBalances.find((entry) => entry.assetId === assetId)?.amount ?? 0n,
            ...rawAssetPresentation(meta?.metadata, `${assetId.slice(0, 8)}...`),
            decimals,
            trusted: isVerifiedAsset(assetId),
          }
          const previous = sendInfoRef.current
          const savedAsset = previous.assets?.[0]
          const savedAmount =
            previous.recipient === recipient && previous.arkAddress === arkAddress && savedAsset?.assetId === assetId
              ? savedAsset.amount
              : 0n
          const fixedAmount = units ? { atomic: unitsToAtomic(units, decimals), units } : undefined
          const rawAmount = fixedAmount?.atomic ?? savedAmount
          setLinkedAssetPayment({ recipient, address: arkAddress, asset: found, fixedAmount })
          setAmountTextValue(units ?? (rawAmount > 0n ? atomicToUnits(rawAmount, decimals) : ''))
          setAmountIsReadOnly(Boolean(units))
          return setSendInfo((prev) => ({
            ...prev,
            ...noTarget,
            account: undefined,
            arkAddress,
            recipient,
            satoshis: 0,
            assets: [{ assetId, amount: rawAmount }],
          }))
        }
        setSendInfo((prev) => {
          const lnurlInvoice =
            lnUrl && prev.lnUrl === lnUrl && prev.recipient === recipient ? prev.lnurlInvoice : undefined
          return {
            ...prev,
            address,
            arkAddress,
            invoice: lnurlInvoice?.pr ?? invoice,
            lnUrl,
            lnurlInvoice,
            recipient,
            satoshis: satoshis ?? prev.satoshis,
            pendingLnSend: invoice && invoice === prev.invoice ? prev.pendingLnSend : undefined,
          }
        })
        if (satoshis) {
          setAmountTextValue(getTextValue(satoshis))
          if (address && !arkAddress && !invoice && !lnUrl) setAmountIsReadOnly(true)
        }
        return
      }
      if (isValidArkAddress(lowerCaseData)) {
        return setSendInfo((prev) => ({ ...prev, ...noTarget, recipient, arkAddress: lowerCaseData }))
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
          ...noTarget,
          recipient,
          invoice: lowerCaseData,
          satoshis,
          pendingLnSend: lowerCaseData === prev.invoice ? prev.pendingLnSend : undefined,
        }))
        setAmountTextValue(getTextValue(satoshis))
        // The field text may be fiat, and cents cannot round-trip sats; this is
        // the amount the invoice named, which the field must never re-derive.
        setValueSats(satoshis)
        setAmountIsReadOnly(true)
        return
      }
      if (isBTCAddress(lowerCaseData)) {
        if (isAssetSend) {
          return setRecipientError(t('send.assetsOnlyToArkade'))
        }
        return setSendInfo((prev) => ({ ...prev, ...noTarget, recipient, address: lowerCaseData }))
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
        return setSendInfo((prev) =>
          prev.lnUrl === lowerCaseData && prev.lnurlInvoice ? prev : { ...prev, ...noTarget, lnUrl: lowerCaseData },
        )
      }
      setRecipientError(t('send.invalidRecipient'))
      setReadyToParse(false)
    }
    void parseRecipient()
    return () => {
      active = false
    }
  }, [recipient, isAssetSend, linkedAsset, readyToParse, svcWallet])

  // verify the current recipient with branta (the SDK only looks up destinations it can encrypt)
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

    if (isArkNote(rawScanData || typed)) {
      setBrantaLoading(false)
      return
    }

    let cancelled = false

    const runLookup = () => {
      if (cancelled) return
      setBrantaLoading(true)
      const lookup = brantaClient.verify(rawScanData || typed)

      lookup
        .then((result) => {
          if (cancelled) return
          const card = brantaCard(result)
          setBrantaPayment(card?.payment ?? null)
          setBrantaVerifyUrl(card?.verifyUrl)
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
    const { minSendable: min, maxSendable: max } = lnUrlResponse
    if (!min || !max) return
    if (min > balance) return setError(t('send.insufficientFundsForLnurl'))
    if (min === max) {
      setAmountIsReadOnly(true)
    } else {
      setAmountIsReadOnly(false)
    }
  }, [lnUrlResponse])

  // check lnurl conditions
  useEffect(() => {
    // Keyed on the target, not the keystroke: re-entering the same LNURL keeps its conditions.
    const target = sendInfo.lnUrl
    if (!target || sendInfo.arkAddress) return setResolvedLnurl(undefined)
    if (sendInfo.invoice && lnUrlResponse) return
    setResolvedLnurl(undefined)
    // A BIP21 carrying an address or invoice beside the LNURL still pays that when the LNURL fails.
    const hasFallback = Boolean(sendInfo.address || (sendInfo.invoice && !sendInfo.lnurlInvoice))
    const lnurlFailed = (message: string) => (hasFallback ? undefined : setRecipientError(message))
    let live = true
    lnurlClient
      .resolve(target)
      .then((conditions) => {
        if (!live) return
        const payRequest = conditions as LnurlPayRequest
        const legacyArk = payRequest.transferAmounts?.some((method) => method.method === 'Ark' && method.available)
        // The top-level pair belongs to default Lightning; Arkade can offer a wider range.
        const {
          ranges: sendRanges,
          min,
          max,
          fixed,
        } = lnurlPayableRanges(legacyArk ? { ...conditions, paymentOptions: undefined } : conditions)
        setAmountIsReadOnly(fixed)
        if (fixed) {
          setSendInfo((prev) => ({ ...prev, satoshis: min }))
          setAmountTextValue(getTextValue(min))
          setValueSats(min)
          setAmountIsReadOnly(true)
        }
        return setResolvedLnurl({ target, payRequest, sendRanges, minSendable: min, maxSendable: max })
      })
      .catch((e) => {
        if (!live) return
        if (e instanceof LnurlError && e.httpStatus === 404) {
          consoleError(e, 'LNURL not found')
          lnurlFailed(t('send.lnurlNotFound'))
          return
        }
        consoleError(e, 'Error checking LNURL conditions')
        lnurlFailed(extractError(e))
      })
    return () => {
      live = false
    }
  }, [sendInfo.arkAddress, sendInfo.lnUrl])

  // check if user wants to send all funds
  useEffect(() => {
    if (sendInfo.lnUrl && sendInfo.satoshis === balance) handleSendAll()
  }, [sendInfo.lnUrl])

  // validate recipient addresses
  useEffect(() => {
    if (!receivingAddresses) return
    const { offchainAddr } = receivingAddresses
    const { address, arkAddress, invoice, lnUrl, satoshis } = sendInfo
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
      if (!haveSameServerPubKey(arkAddress, offchainAddr)) {
        // if there's no other way to pay, show error
        if (!address && !invoice) return setRecipientError(t('send.arkadeServerKeyMismatch'))
        // remove ark address from possibilities to send and continue
        // we will try to pay to lightning or mainnet instead
        setSendInfo((prev) => ({ ...prev, arkAddress: '' }))
      }
    }
    // avoid mixed amounts between invoice amount and bip21 amount field
    if (!arkAddress && invoice && !sendInfo.lnurlInvoice) {
      let sats: number | undefined = satoshis
      let invo: string | undefined = invoice
      try {
        const { amountSats } = decodeInvoice(invoice)
        if (amountSats > 0) {
          sats = amountSats
          setAmountTextValue(getTextValue(amountSats))
          setValueSats(amountSats)
          setAmountIsReadOnly(true)
        }
      } catch {
        invo = undefined
        if (!address && !lnUrl) return setRecipientError(t('send.unableToDecodeInvoice'))
      }
      setSendInfo((prev) => ({ ...prev, satoshis: sats, invoice: invo }))
    }
    // everything is ok, clean error
    setRecipientError('')
  }, [receivingAddresses, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.lnUrl, sendInfo.recipient])

  const lnurlAmountUnavailable = Boolean(
    lnUrlResponse &&
      !lnUrlResponse.sendRanges.some(
        ({ min, max }) => (sendInfo.satoshis ?? 0) >= min && (sendInfo.satoshis ?? 0) <= max,
      ),
  )

  // manage button label and errors
  useEffect(() => {
    if (linkedAsset) {
      setLabel(t(linkedFundingAvailable ? 'send.continue' : 'send.insufficientAssetBalance'))
      return
    }
    if (isAssetSend && activeAsset) {
      const assetAmount = sendInfo.account?.amount ?? sendInfo.assets?.[0]?.amount ?? BigInt(0)
      setLabel(t(assetAmount > activeAsset.balance ? 'send.insufficientAssetBalance' : 'send.continue'))
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
            : lnurlAmountUnavailable
              ? t('send.invalidAmount')
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
    linkedAsset,
    linkedFundingAvailable,
    lnUrlResponse,
    lnurlAmountUnavailable,
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
    if (!sendInfo.address && !sendInfo.arkAddress && !sendInfo.invoice && !sendInfo.pendingLnSend) return
    navigate(Pages.SendDetails)
  }, [proceed, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.pendingLnSend])

  // deal with fees deduction from amount
  useEffect(() => {
    const satoshis = sendInfo.satoshis ?? 0
    const onlyBtcAddress = sendInfo.address && !sendInfo.arkAddress && !sendInfo.invoice
    if (sendInfo.arkAddress) {
      setDeductFromAmount(false)
    } else if (onlyBtcAddress && exactBip21Amount(sendInfo.address, sendInfo.recipient) === undefined) {
      const fees = calcOnchainOutputFee()
      setDeductFromAmount(satoshis + fees > liquidBalance)
    } else {
      setDeductFromAmount(false)
    }
  }, [
    liquidBalance,
    sendInfo.satoshis,
    sendInfo.address,
    sendInfo.arkAddress,
    sendInfo.invoice,
    sendInfo.lnUrl,
    sendInfo.recipient,
  ])

  // The same destination rememberSentDestination will save, so the tick can be checked against it.
  const destination = sendDestination(sendInfo)

  // Another payee drops the tick, so coming back to the first one asks again.
  useEffect(() => {
    if (sendInfo.saveAsContact && sendInfo.saveAsContact.address !== destination) {
      setSendInfo((prev) => ({ ...prev, saveAsContact: undefined }))
    }
  }, [destination])

  if (!svcWallet) return <LoadingLogo text={t('common.loading')} />

  const handleError = (err: any) => {
    consoleError(err, 'error sending payment')
    setError(extractError(err))
    setProcessing(false)
  }

  const handleAmountChange = (value: string) => {
    if (linkedAsset?.fixedAmount) return
    setValueSats(undefined)
    setSendAll(false)
    setAmountTextValue(value)
    if (linkedAsset) {
      const amount = /^\d*(\.\d*)?$/.test(value) ? unitsToAtomic(value, linkedAsset.asset.decimals) : 0n
      setSendInfo({ ...sendInfo, assets: [{ assetId: linkedAsset.asset.assetId, amount }], satoshis: 0 })
    } else if (isAssetSend) {
      if (sendInfo.account) {
        const accountAmount = unitsToAtomic(value, sendInfo.account.decimals)
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
        const cents = unitsToAtomic(value, decimals)
        setSendInfo({
          ...sendInfo,
          assets: [{ assetId: selectedAsset.assetId, amount: cents }],
          satoshis: 0,
        })
      }
    } else {
      const num = Number(value)
      if (Number.isNaN(num) || !Number.isFinite(num)) return setError(t('send.invalidAmount'))
      const sats = satsFromEntry(num, fiatEntry, config.unit, fromFiat)
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
    if (linkedAsset) {
      setLinkedFunding(asset ? 'requested' : 'btc')
      return
    }
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

  const updateRecipient = (next: string, parseNow: boolean, scanned = false) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (next !== recipient) {
      const wasLinked = Boolean(linkedAsset || sendInfo.assetPayment)
      setRecipient(next)
      setLinkedAssetPayment(undefined)
      setLinkedFunding(undefined)
      setShowAssetSelector(false)
      setValueSats(undefined)
      setAmountIsReadOnly(false)
      setSendAll(false)
      if (wasLinked) setSelectedAsset(null)
      if (wasLinked) setAmountTextValue('')
      setSendInfo((prev) => ({
        ...prev,
        ...noTarget,
        recipient: next,
        reviewId: undefined,
        openOffer: undefined,
        ...(wasLinked ? { assets: undefined, satoshis: 0 } : {}),
      }))
    }
    setRawScanData(scanned ? next : '')
    setReadyToParse(parseNow)
    if (!parseNow) timeoutRef.current = setTimeout(() => setReadyToParse(true), RECIPIENT_DEBOUNCE_MS)
  }

  const handleRecipientChange = (recipient: string) => updateRecipient(recipient, false)
  const handleSelectContact = (address: string) => updateRecipient(address, true)

  // Until the field's text is parsed, sendInfo still describes the previous recipient.
  const canSaveRecipient = Boolean(
    sendInfo.recipient === recipient &&
      destination &&
      isReusableContact(destination) &&
      !contactForAddress(destination),
  )
  const savingAsContact = canSaveRecipient && sendInfo.saveAsContact?.address === destination

  const toggleSaveAsContact = () => {
    if (!canSaveRecipient) return
    if (savingAsContact) return setSendInfo((prev) => ({ ...prev, saveAsContact: undefined }))
    setContactName('')
    setContactSheetFor(destination)
  }

  const confirmSaveAsContact = () => {
    if (!contactSheetFor) return
    setSendInfo((prev) => ({ ...prev, saveAsContact: { address: contactSheetFor, name: contactName } }))
    setContactSheetFor(undefined)
  }
  const lnUrlArkMethodAvailable = Boolean(
    lnUrlResponse?.payRequest.transferAmounts?.some((method) => method.method === 'Ark' && method.available),
  )

  const handleContinue = async () => {
    setProcessing(true)
    const satoshis = sendInfo.satoshis ?? 0
    // The recipient and amount stay editable during the awaits below; a result for either's old value is dropped.
    const target = sendInfo.lnUrl
    const stale = () => sendInfoRef.current.lnUrl !== target || (sendInfoRef.current.satoshis ?? 0) !== satoshis
    try {
      if (linkedAsset) {
        setSendInfo({
          ...sendInfo,
          ...noTarget,
          account: undefined,
          arkAddress: linkedAsset.address,
          recipient: linkedAsset.recipient,
          assets: [{ assetId: linkedAsset.asset.assetId, amount: assetAmt }],
          satoshis: 0,
          assetPayment: swapAssetRequest,
          reviewId: sendInfo.reviewId ?? newRequestId(),
          openOffer: undefined,
        })
      } else if (sendInfo.lnUrl && lnUrlResponse) {
        // ?method=ark wins over the router's rails; it pays a plain Arkade send, so no receiver confirmation.
        if (lnUrlArkMethodAvailable) {
          if (!receivingAddresses?.offchainAddr) return setProcessing(false)
          // Fetch Ark address instead of Lightning invoice
          const { address: arkAddress } = await fetchArkAddress(sendInfo.lnUrl)
          if (stale()) return setProcessing(false)
          if (!isValidArkAddress(arkAddress)) {
            handleError(t('send.invalidArkadeAddressFromLnurl'))
            return
          }
          if (!haveSameServerPubKey(arkAddress, receivingAddresses.offchainAddr)) {
            setRecipientError(t('send.arkadeServerKeyMismatch'))
            setProcessing(false)
            return
          }
          setSendInfo((prev) => ({
            ...prev,
            arkAddress,
            assetPayment: undefined,
            invoice: undefined,
            lnurlInvoice: undefined,
            pendingLnSend: undefined,
          }))
        } else if (lnUrlResponse.payRequest.paymentOptions === undefined && !sendAll) {
          if (satoshis < 1) return handleError(t('send.amountTooLow'))
          const cached = sendInfo.lnurlInvoice
          const cachedInvoice = cached && decodeInvoice(cached.pr)
          const result =
            cached && cachedInvoice && cachedInvoice.milliSats === satoshis * 1_000 && !isInvoiceExpired(cachedInvoice)
              ? cached
              : await lnurlClient.requestInvoice(lnUrlResponse.payRequest, { amountSat: satoshis })
          if (stale()) return setProcessing(false)
          if (!('pr' in result)) return handleError(t('send.quoteForDifferentPayment'))
          setSendInfo((prev) => ({
            ...prev,
            arkAddress: undefined,
            assetPayment: undefined,
            invoice: result.pr,
            lnurlInvoice: { pr: result.pr, verify: result.verify, verifyBatch: result.verifyBatch },
            pendingLnSend: undefined,
            reviewId: prev.reviewId ?? newRequestId(),
            openOffer: undefined,
          }))
        } else {
          // The client refuses an invoice for any other amount before a solver is asked.
          if (satoshis < 1) return handleError(t('send.amountTooLow'))
          const router = await sendRouter({ swapsOptional: true })
          let pendingLnSend = await quoteLnurl(router, sendInfo.lnUrl, Number(satoshis))
          // Max means everything leaves the wallet, so a rail's fee comes out of the amount, not on top.
          for (let tries = 0; sendAll && satoshis === liquidBalance && tries < 2; tries++) {
            if (pendingLnSend.total <= liquidBalance) break
            pendingLnSend = await quoteLnurl(router, sendInfo.lnUrl, liquidBalance - pendingLnSend.fee)
          }
          if (stale()) return setProcessing(false)
          const sent = pendingLnSend.amount
          if (sent !== satoshis) {
            setAmount(sent)
            setValueSats(sent)
            setAmountTextValue(getTextValue(sent))
          }
          setSendInfo((prev) => ({
            ...prev,
            arkAddress: undefined,
            assetPayment: undefined,
            invoice: undefined,
            lnurlInvoice: undefined,
            satoshis: sent,
            pendingLnSend,
          }))
        }
      } else {
        setSendInfo({
          ...sendInfo,
          satoshis,
          assetPayment: undefined,
          reviewId: sendInfo.reviewId ?? newRequestId(),
          openOffer: undefined,
        })
      }
      setProceed(true)
    } catch (error) {
      if (stale()) return setProcessing(false)
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
      setAmountTextValue(atomicToUnits(sendInfo.account.balance, sendInfo.account.decimals))
    } else if (isAssetSend && selectedAsset) {
      const { assetId, balance, decimals } = selectedAsset
      const assets = [{ assetId, amount: balance }]
      setSendInfo({ ...sendInfo, assets, satoshis: 0 })
      setAmountTextValue(atomicToUnits(balance, decimals))
    } else {
      setAmount(liquidBalance)
      setValueSats(liquidBalance)
      setSendAll(true)
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

    const label = (
      <Text color='neutral-500' smaller>
        {t('send.available', { amount })}
      </Text>
    )
    if (amountIsReadOnly) return label

    return (
      <div onClick={handleSendAll} style={{ cursor: 'pointer' }}>
        {label}
      </div>
    )
  }

  const { address, arkAddress, lnUrl, invoice, satoshis } = sendInfo

  // a partial asset send leaves asset change, and that change needs a second
  // dust carrier; without one the SDK fails with a bare "Insufficient funds".
  // Derived, not stored: the server-status effect owns `error` and would
  // clear this on recovery.
  const carrierError =
    !processing &&
    fundingAsset &&
    assetAmt > BigInt(0) &&
    assetAmt < fundingAsset.balance &&
    availableBalance < 2 * Number(aspInfo.dust)
      ? t('send.partialSendError')
      : ''

  const buttonDisabled = linkedAsset
    ? arkAddress !== linkedAsset.address ||
      assetAmt <= 0n ||
      !linkedFundingAvailable ||
      Boolean(recipientError) ||
      Boolean(carrierError) ||
      aspInfo.unreachable ||
      Boolean(error) ||
      processing
    : isAssetSend
      ? !(arkAddress && assetAmt > 0) ||
        (activeAsset ? assetAmt > activeAsset.balance : true) ||
        Boolean(recipientError) ||
        Boolean(carrierError) ||
        aspInfo.unreachable ||
        Boolean(error) ||
        processing
      : !((address || arkAddress || lnUrl || invoice) && satoshis && satoshis > 0) ||
        // Unresolved conditions would strand Continue on a locked recipient field.
        (lnUrl && !arkAddress && !address && !invoice && !lnUrlResponse) ||
        (lnUrlArkMethodAvailable && !receivingAddresses?.offchainAddr) ||
        Boolean(recipientError) ||
        lnurlAmountUnavailable ||
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
  const fundingOptions = linkedAsset
    ? requestedAsset && canPayRequestedAsset
      ? [requestedAsset]
      : []
    : verifiedAssetOptions
  const canChooseBitcoin = Boolean(fundingAsset && (!linkedAsset || liquidBalance > 0))
  const canChangeFundingAsset =
    canChooseBitcoin || fundingOptions.some((asset) => asset.assetId !== fundingAsset?.assetId)

  // currency designation only (ticker fallback) — the ticker already rides
  // with the amounts on the right, and long asset names collide with the
  // balance column on narrow screens
  const assetLabelFor = (asset: AssetOption) =>
    verifiedDesignatedCurrency(aspInfo.network, asset.assetId, isVerifiedAsset) ?? asset.ticker
  const selectedAssetLabel = fundingAsset ? assetLabelFor(fundingAsset) : t('send.bitcoin')
  const selectedAssetBalance = fundingAsset
    ? t('send.available', {
        amount: `${prettyAssetAmount(fundingAsset.balance, fundingAsset.decimals)} ${fundingAsset.ticker}`,
      })
    : t('send.available', { amount: prettyUnitBalance(liquidBalance) })
  const recipientAssetLabel = linkedAsset
    ? walletAssetLabel({
        name: linkedAsset.asset.name.trim() || linkedAsset.asset.ticker || t('send.unknownAsset'),
        ticker: linkedAsset.asset.ticker,
      })
    : ''

  const overlayOpen = scan || (keys && !amountIsReadOnly)
  const sendOverlayStyle = { ...overlayStyle, position: 'fixed' as const, zIndex: 20 }

  const Keys = () => (
    <Keyboard
      asset={linkedAsset?.asset ?? activeAsset ?? undefined}
      initialValue={linkedAsset ? assetAmt : undefined}
      hideBalance={Boolean(linkedAsset)}
      back={() => setKeys(false)}
      defaultMode={fiatEntry ? 'fiat' : config.unit === Unit.BTC ? 'btc' : 'sats'}
      onSave={handleKeyboardAmountSave}
    />
  )

  if (keys && !amountIsReadOnly) {
    return prefersReducedMotion ? (
      <div style={sendOverlayStyle}>
        <Keys />
      </div>
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
          <Keys />
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
          setScan(false)
          updateRecipient(data, true, true)
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
        <Header text={t('send.title')} back={appIntent?.status === 'send' ? leaveAppSend : true} />
        <Content>
          <Padded>
            <FlexCol gap='1.25rem' className='send-form-stack'>
              <ErrorMessage error={Boolean(error || carrierError)} text={error || carrierError} />
              <OpenInApp />
              <InputAddress
                disabled={processing}
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
              <ContactPicker disabled={processing} onSelect={handleSelectContact} />
              {canSaveRecipient ? (
                <Checkbox checked={savingAsContact} onChange={toggleSaveAsContact} text={t('contacts.saveAsContact')} />
              ) : null}
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
              {linkedAsset || verifiedAssetOptions.length > 0 || selectedAsset ? (
                <FlexCol gap='0.5rem' className='send-asset-field'>
                  <Text smaller color='neutral-500'>
                    {t(linkedAsset ? 'send.payWith' : 'send.asset')}
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
                      disabled={Boolean(linkedAsset && !canChangeFundingAsset)}
                      data-testid='asset-selector'
                    >
                      <span className='send-asset-trigger__main'>
                        <AssetIcon asset={fundingAsset} />
                        <span className='send-asset-trigger__copy'>
                          <span className='send-asset-trigger__name'>
                            {selectedAssetLabel}
                            {fundingAsset && !isVerifiedAsset(fundingAsset.assetId) ? <UnverifiedBadge /> : null}
                          </span>
                          <span className='send-asset-trigger__balance'>{selectedAssetBalance}</span>
                        </span>
                      </span>
                      {!linkedAsset || canChangeFundingAsset ? (
                        <span className='send-asset-trigger__chevron' aria-hidden='true'>
                          {showAssetSelector ? '▲' : '▼'}
                        </span>
                      ) : null}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='send-asset-menu' align='start' side='bottom' sideOffset={8}>
                      <FlexCol gap='0.25rem'>
                        {canChooseBitcoin ? (
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
                        {fundingOptions
                          .filter(
                            (asset) =>
                              asset.assetId !== fundingAsset?.assetId &&
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
                                  <span className='send-asset-option__name'>
                                    {assetLabelFor(asset)}
                                    {linkedAsset && !isVerifiedAsset(asset.assetId) ? <UnverifiedBadge /> : null}
                                  </span>
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
                {linkedAsset ? (
                  <div className='flex w-full min-w-0 items-center gap-2'>
                    <AssetIcon asset={linkedAsset.asset} />
                    <div className='min-w-0 flex-1' id={recipientAssetLabelId}>
                      <div className='text-xs text-muted-foreground'>{t('send.recipientGets')}</div>
                      <div
                        className='truncate text-sm font-semibold'
                        title={recipientAssetLabel}
                        data-testid='send-recipient-asset'
                      >
                        {recipientAssetLabel}
                      </div>
                    </div>
                    {isVerifiedAsset(linkedAsset.asset.assetId) ? null : <UnverifiedBadge />}
                  </div>
                ) : null}
                <InputAmount
                  label={linkedAsset ? undefined : t('common.amount')}
                  labelledBy={linkedAsset ? recipientAssetLabelId : undefined}
                  name='send-amount'
                  valueSats={valueSats}
                  right={linkedAsset ? undefined : <Available />}
                  onEnter={handleEnter}
                  onFocus={handleFocus}
                  onMax={linkedAsset ? undefined : handleSendAll}
                  value={linkedAsset?.fixedAmount?.units ?? amountTextValue}
                  readOnly={amountIsReadOnly}
                  onChange={handleAmountChange}
                  onModeChange={handleEntryModeChange}
                  mode={entryMode}
                  switchable
                  min={lnUrlResponse?.minSendable}
                  max={lnUrlResponse?.maxSendable}
                  asset={linkedAsset?.asset ?? activeAsset ?? undefined}
                  focus={focus === 'amount' && !isMobileBrowser}
                />
              </FlexCol>
              {deductFromAmount ? <InfoLine color='orange' text={t('send.feesDeductedFromAmount')} /> : null}
            </FlexCol>
          </Padded>
        </Content>
        <ButtonsOnBottom>
          <Button onClick={handleContinue} label={label} disabled={buttonDisabled} />
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
      <SheetModal
        ariaLabel={t('contacts.save')}
        isOpen={Boolean(contactSheetFor)}
        onClose={() => setContactSheetFor(undefined)}
      >
        <div className='contact-form'>
          <p className='settings-section-label'>{t('contacts.save')}</p>
          <InputContainer label={t('contacts.name')}>
            <input
              id='send-contact-name'
              className='input'
              aria-label={t('contacts.name')}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </InputContainer>
          <Button label={t('contacts.save')} onClick={confirmSaveAsContact} />
          <Button label={t('common.cancel')} secondary onClick={() => setContactSheetFor(undefined)} />
        </div>
      </SheetModal>
    </>
  )
}
