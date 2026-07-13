import { useContext, useEffect, useRef, useState } from 'react'
import { BrantaService, type Payment } from '@branta-ops/branta/v2'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import {
  isArkAddress,
  isBTCAddress,
  decodeArkAddress,
  isLightningInvoice,
  isURLWithLightningQueryString,
} from '../../../lib/address'
import { AspContext } from '../../../providers/asp'
import { isArkNote } from '../../../lib/arknote'
import InputAmount from '../../../components/InputAmount'
import InputAddress from '../../../components/InputAddress'
import Header from '../../../components/Header'
import { WalletContext } from '../../../providers/wallet'
import { fromSatoshis, prettyAmount, prettyFiatAmount, prettyNumber, toSatoshis } from '../../../lib/format'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Keyboard, { KeyboardInputMode } from '../../../components/Keyboard'
import Text from '../../../components/Text'
import Shadow from '../../../components/Shadow'
import Scanner from '../../../components/Scanner'
import LoadingLogo from '../../../components/LoadingLogo'
import { consoleError } from '../../../lib/logs'
import { Addresses, AssetOption, SettingsOptions, Themes, Unit } from '../../../lib/types'
import { aspErrorText, getReceivingAddresses } from '../../../lib/asp'
import { OptionsContext } from '../../../providers/options'
import { isMobileBrowser } from '../../../lib/browser'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { ArkNote, AssetDetails } from '@arkade-os/sdk'
import { LimitsContext } from '../../../providers/limits'
import { checkLnUrlConditions, fetchInvoice, fetchArkAddress, isValidLnUrl, LnUrlResponse } from '../../../lib/lnurl'
import { extractError } from '../../../lib/error'
import { getInvoiceSatoshis } from '@arkade-os/boltz-swap'
import { SwapsContext } from '../../../providers/swaps'
import { decodeBip21, isBip21 } from '../../../lib/bip21'
import { InfoLine } from '../../../components/Info'
import { centsToUnits, prettyAssetAmount, unitsToCents } from '../../../lib/assets'
import { FeesContext } from '../../../providers/fees'
import SheetModal from '../../../components/SheetModal'
import { AnimatePresence, motion } from 'framer-motion'
import { overlaySlideUp, overlayStyle } from '../../../lib/animations'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import TokenLogo, { tokenLogoTickerForTicker } from '../../../components/TokenLogo'
import { walletAssetPresentation } from '../../../lib/accountAssets'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import { hapticLight } from '../../../lib/haptics'
import { testDomains } from '../../../lib/constants'

const isProductionEnv = !testDomains.some((d) => window.location.hostname.includes(d))

const brantaClient = new BrantaService({
  baseUrl: isProductionEnv ? 'Production' : 'Staging',
  privacy: 'strict',
})

function AssetIcon({ asset }: { asset: AssetOption | null }) {
  const tokenTicker = asset ? tokenLogoTickerForTicker(asset.ticker) : 'BTC'

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
  const { sendInfo, setNoteInfo, setSendInfo } = useContext(FlowContext)
  const { calcSubmarineSwapFee, calcArkToBtcSwapFee, createArkToBtcSwap, createSubmarineSwap, connected, getApiUrl } =
    useContext(SwapsContext)
  const {
    amountIsAboveMaxLimit,
    amountIsBelowMinLimit,
    minSwapAllowed,
    maxSwapAllowed,
    utxoTxsAllowed,
    vtxoTxsAllowed,
    validArkToBtc,
  } = useContext(LimitsContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)
  const { assetBalances, assetMetadataCache, balance, setCacheEntry, svcWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState<number>()
  const [amountTextValue, setAmountTextValue] = useState('')
  const [amountIsReadOnly, setAmountIsReadOnly] = useState(false)
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([])
  const [availableBalance, setAvailableBalance] = useState(0)
  const [deductFromAmount, setDeductFromAmount] = useState(false)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState('recipient')
  const [label, setLabel] = useState('')
  const [lnUrlResponse, setLnUrlResponse] = useState<LnUrlResponse>()
  const [keys, setKeys] = useState(false)
  const [nudgeBoltz, setNudgeBoltz] = useState(false)
  const [proceed, setProceed] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [readyToParse, setReadyToParse] = useState(false)
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
  const [tryingToSelfSend, setTryingToSelfSend] = useState(false)
  const [valueSats, setValueSats] = useState<number | undefined>(undefined)

  const timeoutRef = useRef<NodeJS.Timeout>()

  const prefersReducedMotion = useReducedMotion()
  const isAssetSend = selectedAsset !== null

  const DUST_AMOUNT = 330
  const RECIPIENT_DEBOUNCE_MS = 800
  const hasAssets = assetBalances.length > 0
  const reserveApplied = !isAssetSend && hasAssets
  const liquidBalance = availableBalance - (reserveApplied ? DUST_AMOUNT : 0)

  const smartSetError = (str: string) => {
    setError(str === '' ? (aspInfo.unreachable ? aspErrorText(aspInfo, 'Arkade server unreachable') : '') : str)
  }

  const getTextValue = (sats: number) =>
    useFiat
      ? prettyNumber(toFiat(sats), fiatDecimals(), false)
      : config.unit === Unit.BTC
        ? prettyNumber(fromSatoshis(sats), 8, false)
        : prettyNumber(sats, 0, false)

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
          throw new Error('unable to get receiving addresses')
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
        const presentation = walletAssetPresentation(meta?.metadata, `${ab.assetId.slice(0, 8)}...`)
        options.push({
          assetId: ab.assetId,
          balance: ab.amount,
          name: presentation.name,
          ticker: presentation.ticker,
          icon: presentation.icon,
          decimals: meta?.metadata?.decimals ?? 8,
        })
      }
      setAssetOptions(options)
    }
    loadOptions()
  }, [svcWallet, assetBalances, config.apps.assets.enabled])

  // initialize selected asset from pre-set sendInfo.assets (e.g. from Asset Detail page)
  useEffect(() => {
    if (!sendInfo.assets?.length || assetOptions.length === 0) return
    const presetAssetId = sendInfo.assets[0].assetId
    const found = assetOptions.find((a) => a.assetId === presetAssetId)
    if (found && !selectedAsset) setSelectedAsset(found)
  }, [assetOptions, sendInfo.assets])

  // update available balance
  useEffect(() => {
    if (!svcWallet) return
    svcWallet
      .getBalance()
      .then((bal) => setAvailableBalance(bal.available))
      .catch(smartSetError)
  }, [balance])

  // parse recipient data
  // repeat when asset changes to re-validate addresses (e.g. if user
  // selects an asset and the address is not compatible with it)
  useEffect(() => {
    if (!readyToParse) return
    setRecipientError('')
    const parseRecipient = async () => {
      setNudgeBoltz(false)
      if (!recipient) return
      const lowerCaseData = recipient.toLowerCase().replace(/^lightning:/, '')
      if (isURLWithLightningQueryString(recipient)) {
        const url = new URL(recipient)
        return setRecipient(url.searchParams.get('lightning')!)
      }
      if (isBip21(lowerCaseData)) {
        const { address, arkAddress, invoice, lnUrl, satoshis, assetId, assetAmount } = decodeBip21(recipient.trim())
        if (!address && !arkAddress && !invoice && !lnUrl) return setRecipientError('Unable to parse bip21')
        if (assetId) {
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
            const presentation = walletAssetPresentation(meta?.metadata, `${assetId.slice(0, 8)}...`)
            found = {
              assetId,
              balance: BigInt(0),
              name: presentation.name,
              ticker: presentation.ticker,
              icon: presentation.icon,
              decimals: meta?.metadata?.decimals ?? 8,
            }
          }
          setSelectedAsset(found)
          const rawAmount = assetAmount ? unitsToCents(assetAmount, found.decimals) : BigInt(0)
          return setSendInfo({
            address,
            arkAddress,
            invoice,
            recipient,
            satoshis: 0,
            assets: [{ assetId, amount: rawAmount }],
          })
        }
        setSendInfo({
          address,
          arkAddress,
          assets: sendInfo.assets,
          invoice,
          lnUrl,
          recipient,
          satoshis: satoshis ?? sendInfo.satoshis,
        })
        if (satoshis) setAmountTextValue(getTextValue(satoshis))
        return
      }
      if (isArkAddress(lowerCaseData)) {
        return setSendInfo({ ...sendInfo, arkAddress: lowerCaseData })
      }
      if (isLightningInvoice(lowerCaseData)) {
        if (isAssetSend) {
          return setRecipientError('Assets can only be sent to Arkade addresses')
        }
        if (!connected) {
          setRecipientError('Lightning swaps not enabled')
          return setNudgeBoltz(true)
        }
        const satoshis = getInvoiceSatoshis(lowerCaseData)
        if (!satoshis) return setRecipientError('Invoice must have amount defined')
        setSendInfo({ ...sendInfo, invoice: lowerCaseData, satoshis })
        setAmountTextValue(getTextValue(satoshis))
        setAmountIsReadOnly(true)
        return
      }
      if (isBTCAddress(recipient)) {
        if (isAssetSend) {
          return setRecipientError('Assets can only be sent to Arkade addresses')
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
      setRecipientError('Invalid recipient address')
      setReadyToParse(false)
    }
    parseRecipient()
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
    if (min > balance) return setError('Insufficient funds for LNURL')
    if (satoshis && satoshis < min) return setError(`Amount below LNURL min limit`)
    if (satoshis && satoshis > max) return setError(`Amount above LNURL max limit`)
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
    if (sendInfo.lnUrl && sendInfo.invoice) return
    checkLnUrlConditions(sendInfo.lnUrl)
      .then((conditions) => {
        if (!conditions) return setRecipientError('Unable to fetch LNURL conditions')
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
          setRecipientError('LNURL not found')
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
    const { boardingAddr, offchainAddr } = receivingAddresses
    const { address, arkAddress, invoice, lnUrl } = sendInfo
    // check server limits for onchain transactions
    if (address && !arkAddress && !invoice && !lnUrl && !utxoTxsAllowed()) {
      return setRecipientError('Sending onchain not allowed')
    }
    // check server limits for offchain transactions
    if (!address && (arkAddress || invoice || lnUrl) && !vtxoTxsAllowed()) {
      return setRecipientError('Sending offchain not allowed')
    }
    // check swap limits for lightning transactions
    if (!address && !arkAddress && invoice) {
      const min = minSwapAllowed()
      const max = maxSwapAllowed()
      if (min === 0 && max === 0) return // limits not loaded yet
      const amountSats = getInvoiceSatoshis(invoice)
      if (amountSats < min) return setRecipientError(`Invoice amount below min of ${prettyNumber(min)} sats`)
      if (amountSats > max) return setRecipientError(`Invoice amount above max of ${prettyNumber(max)} sats`)
    }
    // check if server key is valid
    if (arkAddress && arkAddress.length > 0) {
      const { serverPubKey } = decodeArkAddress(arkAddress)
      const { serverPubKey: expectedServerPubKey } = decodeArkAddress(offchainAddr)
      if (serverPubKey !== expectedServerPubKey) {
        // if there's no other way to pay, show error
        if (!address && !invoice) return setRecipientError('Arkade server key mismatch')
        // remove ark address from possibilities to send and continue
        // we will try to pay to lightning or mainnet instead
        setSendInfo({ ...sendInfo, arkAddress: '' })
      }
    }
    // check if is trying to self send
    if (address === boardingAddr || arkAddress === offchainAddr) {
      setTryingToSelfSend(true) // nudge user to rollover
      return setRecipientError('Cannot send to yourself')
    } else {
      setTryingToSelfSend(false)
    }
    // everything is ok, clean error
    setRecipientError('')
  }, [receivingAddresses, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.lnUrl])

  // manage button label and errors
  useEffect(() => {
    if (isAssetSend && selectedAsset) {
      const assetAmt = sendInfo.assets?.[0]?.amount ?? 0
      setLabel(assetAmt > selectedAsset.balance ? 'Insufficient asset balance' : 'Continue')
      return
    }
    const satoshis = sendInfo.satoshis ?? 0
    setLabel(
      satoshis > liquidBalance
        ? 'Insufficient funds'
        : lnUrlResponse?.minSendable && satoshis < lnUrlResponse.minSendable
          ? 'Amount below LNURL min limit'
          : lnUrlResponse?.maxSendable && satoshis > lnUrlResponse.maxSendable
            ? 'Amount above LNURL max limit'
            : satoshis && satoshis < 1
              ? 'Amount below 1 satoshi'
              : amountIsAboveMaxLimit(satoshis)
                ? 'Amount above max limit'
                : satoshis && amountIsBelowMinLimit(satoshis)
                  ? 'Amount below min limit'
                  : 'Continue',
    )
  }, [sendInfo.satoshis, sendInfo.assets, liquidBalance, selectedAsset])

  // manage server unreachable error
  useEffect(() => {
    const errTxt = aspErrorText(aspInfo, 'Arkade server unreachable')
    if (!aspInfo.unreachable) {
      // Server reachable again: clear either unavailable variant we may have
      // shown (generic unreachable or the outdated-client message) without
      // clobbering unrelated errors.
      const outdatedTxt = aspErrorText({ ...aspInfo, outdated: true }, errTxt)
      setError((prev) => (prev === errTxt || prev === outdatedTxt ? '' : prev))
      return
    }
    setError(errTxt)
    setLabel('Server unreachable')
  }, [aspInfo.unreachable, aspInfo.outdated])

  // proceed to next step
  useEffect(() => {
    if (!proceed) return
    if (!sendInfo.address && !sendInfo.arkAddress && !sendInfo.invoice) return
    if (sendInfo.arkAddress || sendInfo.pendingSwap) return navigate(Pages.SendDetails)
    if (sendInfo.invoice) {
      createSubmarineSwap(sendInfo.invoice)
        .then((pendingSwap) => {
          if (!pendingSwap) return handleError('Unable to create swap')
          setSendInfo({ ...sendInfo, pendingSwap })
        })
        .catch(handleError)
    } else if (satoshis && sendInfo.address) {
      const amountForSwap = deductFromAmount ? satoshis - calcArkToBtcSwapFee(satoshis) : satoshis
      if (amountForSwap < 1) return handleError('Amount too low to cover fees')
      if (!validArkToBtc(amountForSwap)) return navigate(Pages.SendDetails)
      createArkToBtcSwap(sendInfo.address, amountForSwap)
        .then((result) => {
          if (!result) return navigate(Pages.SendDetails)
          setSendInfo({ ...sendInfo, pendingSwap: result.pendingSwap })
        })
        .catch(() => navigate(Pages.SendDetails))
    }
  }, [proceed, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.pendingSwap])

  // deal with fees deduction from amount
  useEffect(() => {
    const satoshis = sendInfo.satoshis ?? 0
    const onlyBtcAddress = sendInfo.address && !sendInfo.arkAddress && !sendInfo.invoice
    if (sendInfo.arkAddress) {
      setDeductFromAmount(false)
    } else if (sendInfo.lnUrl) {
      const fees = calcSubmarineSwapFee(satoshis)
      setDeductFromAmount(satoshis + fees > liquidBalance)
    } else if (onlyBtcAddress) {
      const fees = validArkToBtc(satoshis) ? calcArkToBtcSwapFee(satoshis) : calcOnchainOutputFee()
      setDeductFromAmount(satoshis + fees > liquidBalance)
    } else {
      setDeductFromAmount(false)
    }
  }, [liquidBalance, sendInfo.satoshis, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.lnUrl])

  if (!svcWallet) return <LoadingLogo text='Loading...' />

  const gotoBoltzApp = () => {
    navigate(Pages.AppBoltzSettings)
  }

  const gotoRollover = () => {
    setOption(SettingsOptions.Vtxos)
    navigate(Pages.Settings)
  }

  const handleError = (err: any) => {
    consoleError(err, 'error sending payment')
    setError(extractError(err))
    setProcessing(false)
  }

  const handleAmountChange = (value: string) => {
    setValueSats(undefined)
    setAmountTextValue(value)
    if (isAssetSend) {
      if (selectedAsset) {
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
      if (Number.isNaN(num) || !Number.isFinite(num)) return setError('Invalid amount')
      const sats = useFiat ? fromFiat(num) : config.unit === Unit.BTC ? toSatoshis(num) : Math.floor(num)
      setSendInfo({ ...sendInfo, satoshis: sats })
    }
  }

  const handleKeyboardAmountSave = (value: string, inputMode: KeyboardInputMode) => {
    setKeys(false)
    if (inputMode === 'asset') return handleAmountChange(value)
    if (useFiat && inputMode !== 'fiat') {
      const sats = inputMode === 'sats' ? Number(value) : toSatoshis(Number(value))
      handleAmountChange(prettyNumber(toFiat(sats), fiatDecimals(), false))
      return
    }
    handleAmountChange(value)
  }

  const handleSelectAsset = (asset: AssetOption | null) => {
    setShowAssetSelector(false)
    setSelectedAsset(asset)
    if (asset) {
      if (isBTCAddress(recipient)) {
        return setError('Assets can only be sent to Arkade addresses')
      }
      setSendInfo({
        ...sendInfo,
        address: '',
        assets: [{ assetId: asset.assetId, amount: BigInt(0) }],
        satoshis: 0,
      })
    } else {
      setSendInfo({ ...sendInfo, assets: undefined, satoshis: 0 })
    }
    setAmountTextValue('')
  }

  const handleRecipientChange = (recipient: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setRecipient(recipient)
    setReadyToParse(false)
    setRawScanData('')
    timeoutRef.current = setTimeout(() => setReadyToParse(true), RECIPIENT_DEBOUNCE_MS)
  }

  const handleContinue = async () => {
    setProcessing(true)
    const satoshis = sendInfo.satoshis ?? 0
    try {
      if (sendInfo.lnUrl && lnUrlResponse) {
        // Check if Ark method is available
        const arkMethod = lnUrlResponse.transferAmounts?.find((method) => method.method === 'Ark' && method.available)

        if (arkMethod) {
          // Fetch Ark address instead of Lightning invoice
          const arkResponse = await fetchArkAddress(sendInfo.lnUrl)
          if (!isArkAddress(arkResponse.address)) {
            handleError('Invalid Arkade address received from LNURL')
            return
          }
          setSendInfo({ ...sendInfo, arkAddress: arkResponse.address, invoice: undefined })
        } else {
          // Fallback to Lightning invoice
          const amountForInvoice = deductFromAmount ? satoshis - calcSubmarineSwapFee(satoshis) : satoshis
          if (amountForInvoice < 1) return handleError('Amount too low to cover fees')
          if (amountForInvoice > BigInt(Number.MAX_SAFE_INTEGER)) return handleError('Amount too large')
          const invoice = await fetchInvoice(sendInfo.lnUrl, Number(amountForInvoice), '')
          setSendInfo({ ...sendInfo, invoice, arkAddress: undefined })
        }
      } else {
        setSendInfo({ ...sendInfo, satoshis })
      }
      setProceed(true)
    } catch (error) {
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
    if (isAssetSend && selectedAsset) {
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
    if (isAssetSend && selectedAsset) {
      return (
        <div onClick={handleSendAll} style={{ cursor: 'pointer' }}>
          <Text color='neutral-500' smaller>
            {`${prettyAssetAmount(selectedAsset.balance, selectedAsset.decimals)} ${selectedAsset.ticker} available`}
          </Text>
        </div>
      )
    }

    const pretty = useFiat
      ? prettyFiatAmount(toFiat(liquidBalance), config.currency, { bitcoinUnit: config.unit })
      : config.unit === Unit.BTC
        ? prettyAmount(fromSatoshis(liquidBalance), config.unit, 8)
        : prettyAmount(liquidBalance)

    return (
      <div onClick={handleSendAll} style={{ cursor: 'pointer' }}>
        <Text color='neutral-500' smaller>
          {`${pretty} available`}
        </Text>
      </div>
    )
  }

  const { address, arkAddress, lnUrl, invoice, satoshis } = sendInfo

  const assetAmt = sendInfo.assets?.[0]?.amount ?? BigInt(0)

  const buttonDisabled = isAssetSend
    ? !(arkAddress && assetAmt > 0) ||
      (selectedAsset ? assetAmt > selectedAsset.balance : true) ||
      Boolean(recipientError) ||
      aspInfo.unreachable ||
      tryingToSelfSend ||
      Boolean(error) ||
      processing
    : !((address || arkAddress || lnUrl || invoice) && satoshis && satoshis > 0) ||
      (lnUrlResponse?.maxSendable && satoshis > lnUrlResponse.maxSendable) ||
      (lnUrlResponse?.minSendable && satoshis < lnUrlResponse.minSendable) ||
      amountIsAboveMaxLimit(satoshis) ||
      amountIsBelowMinLimit(satoshis) ||
      satoshis > liquidBalance ||
      aspInfo.unreachable ||
      tryingToSelfSend ||
      Boolean(error) ||
      satoshis < 1 ||
      processing

  const selectedAssetLabel = selectedAsset ? `${selectedAsset.name} (${selectedAsset.ticker})` : 'Bitcoin'
  const selectedAssetBalance = selectedAsset
    ? `${prettyAssetAmount(selectedAsset.balance, selectedAsset.decimals)} ${selectedAsset.ticker} available`
    : `${
        useFiat
          ? prettyFiatAmount(toFiat(liquidBalance), config.currency, { bitcoinUnit: config.unit })
          : prettyAmount(liquidBalance)
      } available`

  const overlayOpen = scan || (keys && !amountIsReadOnly)
  const sendOverlayStyle = { ...overlayStyle, position: 'fixed' as const, zIndex: 20 }

  const Keys = () => (
    <Keyboard asset={selectedAsset ?? undefined} back={() => setKeys(false)} onSave={handleKeyboardAmountSave} />
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

  const Scan = () => (
    <Scanner
      close={() => setScan(false)}
      label='Recipient address'
      onData={(data) => {
        setRecipient(data)
        setRawScanData(data)
        setReadyToParse(true)
      }}
      onError={smartSetError}
    />
  )

  if (scan) {
    return prefersReducedMotion ? (
      <div style={sendOverlayStyle}>
        <Scan />
      </div>
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
          <Scan />
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
        <Header text='Send' back />
        <Content>
          <Padded>
            <FlexCol gap='1.25rem' className='send-form-stack'>
              <ErrorMessage error={Boolean(error)} text={error} />
              <InputAddress
                error={recipientError}
                focus={focus === 'recipient'}
                label='Recipient address'
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
                  Verifying address...
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
                              Verified by Branta
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
              {assetOptions.length > 0 ? (
                <FlexCol gap='0.5rem' className='send-asset-field'>
                  <Text smaller color='neutral-500'>
                    Asset
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
                        <AssetIcon asset={selectedAsset} />
                        <span className='send-asset-trigger__copy'>
                          <span className='send-asset-trigger__name'>{selectedAssetLabel}</span>
                          <span className='send-asset-trigger__balance'>{selectedAssetBalance}</span>
                        </span>
                      </span>
                      <span className='send-asset-trigger__chevron' aria-hidden='true'>
                        {showAssetSelector ? '▲' : '▼'}
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='send-asset-menu' align='start' side='bottom' sideOffset={8}>
                      <FlexCol gap='0.25rem'>
                        {selectedAsset ? (
                          <DropdownMenuItem className='send-asset-option' onClick={() => handleSelectAsset(null)}>
                            <span className='send-asset-option__main'>
                              <AssetIcon asset={null} />
                              <span>
                                <span className='send-asset-option__name'>Bitcoin</span>
                                <span className='send-asset-option__meta'>
                                  {useFiat
                                    ? prettyFiatAmount(toFiat(liquidBalance), config.currency, {
                                        bitcoinUnit: config.unit,
                                      })
                                    : prettyAmount(liquidBalance)}{' '}
                                  available
                                </span>
                              </span>
                            </span>
                          </DropdownMenuItem>
                        ) : null}
                        {assetOptions
                          .filter((asset) => asset.assetId !== selectedAsset?.assetId)
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
                                    {asset.name} ({asset.ticker})
                                  </span>
                                  <span className='send-asset-option__meta'>Tap to send this asset</span>
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
                  label='Amount'
                  name='send-amount'
                  valueSats={valueSats}
                  right={<Available />}
                  onEnter={handleEnter}
                  onFocus={handleFocus}
                  onMax={handleSendAll}
                  value={amountTextValue}
                  readOnly={amountIsReadOnly}
                  onChange={handleAmountChange}
                  min={lnUrlResponse?.minSendable}
                  max={lnUrlResponse?.maxSendable}
                  asset={selectedAsset ?? undefined}
                  focus={focus === 'amount' && !isMobileBrowser}
                />
              </FlexCol>
              {deductFromAmount ? <InfoLine color='orange' text='Fees will be deducted from the amount sent' /> : null}
              {tryingToSelfSend ? (
                <div style={{ width: '100%' }}>
                  <Text centered color='neutral-500' small>
                    Did you mean <a onClick={gotoRollover}>roll over your VTXOs</a>?
                  </Text>
                </div>
              ) : null}
              {nudgeBoltz && getApiUrl() ? (
                <div style={{ width: '100%' }}>
                  <Text centered color='neutral-500' small>
                    Enable <a onClick={gotoBoltzApp}>Lightning swaps</a> to pay
                  </Text>
                </div>
              ) : null}
            </FlexCol>
          </Padded>
        </Content>
        <ButtonsOnBottom>
          <Button onClick={handleContinue} label={label} disabled={buttonDisabled} />
        </ButtonsOnBottom>
      </div>
      <SheetModal isOpen={showReserveModal} onClose={() => setShowReserveModal(false)}>
        <FlexCol gap='1rem'>
          <Text bold>Balance reserve</Text>
          <Text color='neutral-500' small>
            {`${DUST_AMOUNT} sats are kept in reserve to protect your assets. Your max sendable amount is ${prettyNumber(liquidBalance)} sats.`}
          </Text>
          <FlexCol gap='0.5rem'>
            <Button onClick={confirmSendAll} label='Send max' />
            <Button onClick={() => setShowReserveModal(false)} label='Cancel' secondary />
          </FlexCol>
        </FlexCol>
      </SheetModal>
    </>
  )
}
