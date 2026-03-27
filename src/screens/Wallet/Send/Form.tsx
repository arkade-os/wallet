import { useContext, useEffect, useState } from 'react'
import { V2BrantaClient, BrantaServerBaseUrl, Payment } from '@branta-ops/branta'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext, SendInfo } from '../../../providers/flow'
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
import { formatAssetAmount, prettyAmount, prettyNumber } from '../../../lib/format'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Keyboard from '../../../components/Keyboard'
import Text from '../../../components/Text'
import Shadow from '../../../components/Shadow'
import Scanner from '../../../components/Scanner'
import LoadingLogo from '../../../components/LoadingLogo'
import { consoleError } from '../../../lib/logs'
import { Addresses, AssetOption, SettingsOptions } from '../../../lib/types'
import { getReceivingAddresses } from '../../../lib/asp'
import { OptionsContext } from '../../../providers/options'
import { isMobileBrowser } from '../../../lib/browser'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { ArkNote, AssetDetails } from '@arkade-os/sdk'
import { LimitsContext } from '../../../providers/limits'
import { checkLnUrlConditions, fetchInvoice, fetchArkAddress, isValidLnUrl } from '../../../lib/lnurl'
import { extractError } from '../../../lib/error'
import { getInvoiceSatoshis } from '@arkade-os/boltz-swap'
import { SwapsContext } from '../../../providers/swaps'
import { decodeBip21, isBip21 } from '../../../lib/bip21'
import { InfoLine } from '../../../components/Info'
import { centsToUnits, unitsToCents } from '../../../lib/assets'
import { FeesContext } from '../../../providers/fees'
import SheetModal from '../../../components/SheetModal'
import { AnimatePresence, motion } from 'framer-motion'
import { overlaySlideUp, overlayStyle } from '../../../lib/animations'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

const brantaClient = new V2BrantaClient({
  baseUrl: BrantaServerBaseUrl.Production,
})

export default function SendForm() {
  const { aspInfo } = useContext(AspContext)
  const { config, useFiat } = useContext(ConfigContext)
  const { calcOnchainOutputFee } = useContext(FeesContext)
  const { fromFiat, toFiat, fiatDecimals } = useContext(FiatContext)
  const { sendInfo, setNoteInfo, setSendInfo } = useContext(FlowContext)
  const { calcSubmarineSwapFee, calcArkToBtcSwapFee, createArkToBtcSwap, createSubmarineSwap, connected, getApiUrl } =
    useContext(SwapsContext)
  const { amountIsAboveMaxLimit, amountIsBelowMinLimit, utxoTxsAllowed, vtxoTxsAllowed, validArkToBtc } =
    useContext(LimitsContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)
  const { assetBalances, assetMetadataCache, balance, setCacheEntry, svcWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState<number>()
  const [amountIsReadOnly, setAmountIsReadOnly] = useState(false)
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([])
  const [availableBalance, setAvailableBalance] = useState(0)
  const [deductFromAmount, setDeductFromAmount] = useState(false)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState('recipient')
  const [label, setLabel] = useState('')
  const [lnUrlLimits, setLnUrlLimits] = useState<{ min: number; max: number }>({ min: 0, max: 0 })
  const [keys, setKeys] = useState(false)
  const [nudgeBoltz, setNudgeBoltz] = useState(false)
  const [proceed, setProceed] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [receivingAddresses, setReceivingAddresses] = useState<Addresses>()
  const [scan, setScan] = useState(false)
  const [rawScanData, setRawScanData] = useState('')
  const [brantaPayment, setBrantaPayment] = useState<Payment | null>(null)
  const [brantaLoading, setBrantaLoading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null)
  const [showAssetSelector, setShowAssetSelector] = useState(false)
  const [textValue, setTextValue] = useState('')
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [tryingToSelfSend, setTryingToSelfSend] = useState(false)

  const prefersReducedMotion = useReducedMotion()
  const isAssetSend = selectedAsset !== null

  const DUST_AMOUNT = 330
  const hasAssets = assetBalances.length > 0
  const reserveApplied = !isAssetSend && hasAssets
  const liquidBalance = availableBalance - (reserveApplied ? DUST_AMOUNT : 0)

  const smartSetError = (str: string) => {
    setError(str === '' ? (aspInfo.unreachable ? 'Ark server unreachable' : '') : str)
  }

  const setState = (info: SendInfo) => {
    setScan(false)
    setSendInfo(info)
  }

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

  // update form with existing send info
  useEffect(() => {
    const { recipient, satoshis } = sendInfo
    setRecipient(recipient ?? '')
    if (!satoshis) return
    setTextValue(useFiat ? prettyNumber(fromFiat(satoshis)) : prettyNumber(satoshis, 0, false))
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
        options.push({
          assetId: ab.assetId,
          balance: ab.amount,
          name: meta?.metadata?.name ?? `${ab.assetId.slice(0, 8)}...`,
          ticker: meta?.metadata?.ticker ?? '',
          icon: meta?.metadata?.icon,
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
  useEffect(() => {
    smartSetError('')
    const parseRecipient = async () => {
      setNudgeBoltz(false)
      if (!recipient) return
      const lowerCaseData = recipient.toLowerCase().replace(/^lightning:/, '')
      if (isURLWithLightningQueryString(recipient)) {
        const url = new URL(recipient)
        return setRecipient(url.searchParams.get('lightning')!)
      }
      if (isBip21(lowerCaseData)) {
        const { address, arkAddress, invoice, satoshis, assetId, assetAmount } = decodeBip21(recipient.trim())
        if (!address && !arkAddress && !invoice) return setError('Unable to parse bip21')
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
            found = {
              assetId,
              balance: 0,
              name: meta?.metadata?.name ?? `${assetId.slice(0, 8)}...`,
              ticker: meta?.metadata?.ticker ?? '',
              icon: meta?.metadata?.icon,
              decimals: meta?.metadata?.decimals ?? 8,
            }
          }
          setSelectedAsset(found)
          const rawAmount = assetAmount != null ? unitsToCents(assetAmount, found.decimals) : 0
          setTextValue(String(assetAmount))
          return setState({
            address,
            arkAddress,
            invoice,
            recipient,
            satoshis: 0,
            assets: [{ assetId, amount: rawAmount }],
          })
        }
        return setState({ address, arkAddress, invoice, recipient, satoshis, assets: sendInfo.assets })
      }
      if (isArkAddress(lowerCaseData)) {
        return setState({ ...sendInfo, address: '', arkAddress: lowerCaseData })
      }
      if (isLightningInvoice(lowerCaseData)) {
        if (isAssetSend) {
          return setError('Assets can only be sent to Arkade addresses')
        }
        if (!connected) {
          setError('Lightning swaps not enabled')
          return setNudgeBoltz(true)
        }
        const satoshis = getInvoiceSatoshis(lowerCaseData)
        if (!satoshis) return setError('Invoice must have amount defined')
        setState({ ...sendInfo, address: '', arkAddress: '', invoice: lowerCaseData, satoshis })
        setAmountIsReadOnly(true)
        setAmount(satoshis)
        return
      }
      if (isBTCAddress(recipient)) {
        if (isAssetSend) {
          return setError('Assets can only be sent to Arkade addresses')
        }
        return setState({ ...sendInfo, address: recipient, arkAddress: '' })
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
        return setState({ ...sendInfo, lnUrl: lowerCaseData })
      }
      setError('Invalid recipient address')
    }
    parseRecipient()
  }, [recipient])

  // fetch branta payment info for ZK QR-scanned addresses only
  useEffect(() => {
    if (!rawScanData) {
      setBrantaLoading(false)
      return
    }
    setBrantaPayment(null)
    let cancelled = false

    let isValidZKCode = false
    try {
      const url = new URL(rawScanData.trim())
      isValidZKCode = url.searchParams.has('branta_id') && url.searchParams.has('branta_secret')
    } catch {
      // Invalid URL, not a ZK code
    }

    if (!isValidZKCode) {
      setBrantaLoading(false)
      return
    }

    setBrantaLoading(true)
    brantaClient
      .getPaymentsByQRCode(rawScanData)
      .then((payments: Payment[]) => {
        if (cancelled) return
        const payment = payments?.[0] ?? null
        if (payment) {
          const isHttpsUrl = (val: unknown): boolean => typeof val === 'string' && val.startsWith('https://')
          setBrantaPayment({
            ...payment,
            verify_url: isHttpsUrl(payment.verify_url) ? payment.verify_url : undefined,
            platform_logo_url: isHttpsUrl(payment.platform_logo_url) ? payment.platform_logo_url : undefined,
          })
        } else {
          setBrantaPayment(null)
        }
      })
      .catch((err) => {
        if (cancelled) return
        consoleError('Branta API error', err)
        setBrantaPayment(null)
      })
      .finally(() => {
        if (cancelled) return
        setBrantaLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [rawScanData])

  // check lnurl limits
  useEffect(() => {
    const { satoshis } = sendInfo
    const { min, max } = lnUrlLimits
    if (!min || !max) return
    if (min > balance) return setError('Insufficient funds for LNURL')
    if (satoshis && satoshis < min) return setError(`Amount below LNURL min limit`)
    if (satoshis && satoshis > max) return setError(`Amount above LNURL max limit`)
    if (min === max) {
      setAmount(useFiat ? toFiat(min) : min) // set fixed amount automatically
      setAmountIsReadOnly(true)
    } else {
      setAmountIsReadOnly(false)
    }
  }, [lnUrlLimits.min, lnUrlLimits.max])

  // check lnurl conditions
  useEffect(() => {
    if (!sendInfo.lnUrl) return
    if (sendInfo.lnUrl && sendInfo.invoice) return
    checkLnUrlConditions(sendInfo.lnUrl)
      .then((conditions) => {
        if (!conditions) return setError('Unable to fetch LNURL conditions')
        const min = Math.floor(conditions.minSendable / 1000) // from millisatoshis to satoshis
        const max = Math.floor(conditions.maxSendable / 1000) // from millisatoshis to satoshis
        if (min === max) setSendInfo({ ...sendInfo, satoshis: min }) // set amount automatically
        return setLnUrlLimits({ min, max })
      })
      .catch(() => setError('Invalid address or LNURL'))
  }, [sendInfo.lnUrl])

  // check if user wants to send all funds
  useEffect(() => {
    if (sendInfo.lnUrl && sendInfo.satoshis === balance) handleSendAll()
  }, [sendInfo.lnUrl])

  // validate recipient addresses
  useEffect(() => {
    if (!receivingAddresses) return
    const { boardingAddr, offchainAddr } = receivingAddresses
    const { address, arkAddress, invoice } = sendInfo
    // check server limits for onchain transactions
    if (address && !arkAddress && !invoice && !utxoTxsAllowed()) {
      return setError('Sending onchain not allowed')
    }
    // check server limits for offchain transactions
    if (!address && (arkAddress || invoice) && !vtxoTxsAllowed()) {
      return setError('Sending offchain not allowed')
    }
    // check if server key is valid
    if (arkAddress && arkAddress.length > 0) {
      const { serverPubKey } = decodeArkAddress(arkAddress)
      const { serverPubKey: expectedServerPubKey } = decodeArkAddress(offchainAddr)
      if (serverPubKey !== expectedServerPubKey) {
        // if there's no other way to pay, show error
        if (!address && !invoice) return setError('Ark server key mismatch')
        // remove ark address from possibilities to send and continue
        // we will try to pay to lightning or mainnet instead
        setSendInfo({ ...sendInfo, arkAddress: '' })
      }
    }
    // check if is trying to self send
    if (address === boardingAddr || arkAddress === offchainAddr) {
      setTryingToSelfSend(true) // nudge user to rollover
      return setError('Cannot send to yourself')
    } else {
      setTryingToSelfSend(false)
    }
    // everything is ok, clean error
    setError('')
  }, [receivingAddresses, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice])

  // set text value from satoshis
  useEffect(() => {
    if (!sendInfo.satoshis) return
    const sats = sendInfo.satoshis
    const value = useFiat ? toFiat(sats) : sats
    const maximumFractionDigits = useFiat ? 2 : 0
    setTextValue(prettyNumber(value, maximumFractionDigits, false))
  }, [sendInfo.satoshis])

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
        : lnUrlLimits.min && satoshis < lnUrlLimits.min
          ? 'Amount below LNURL min limit'
          : lnUrlLimits.max && satoshis > lnUrlLimits.max
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
    const errTxt = 'Ark server unreachable'
    if (!aspInfo.unreachable) {
      setError((prev) => (prev === errTxt ? '' : prev))
      return
    }
    setError(errTxt)
    setLabel('Server unreachable')
  }, [aspInfo.unreachable])

  // proceed to next step
  useEffect(() => {
    if (!proceed) return
    if (!sendInfo.address && !sendInfo.arkAddress && !sendInfo.invoice) return
    if (sendInfo.arkAddress || sendInfo.pendingSwap) return navigate(Pages.SendDetails)
    if (sendInfo.invoice) {
      createSubmarineSwap(sendInfo.invoice)
        .then((pendingSwap) => {
          if (!pendingSwap) return handleError('Unable to create swap')
          setState({ ...sendInfo, pendingSwap })
        })
        .catch(handleError)
    } else if (satoshis && sendInfo.address) {
      const amountForSwap = deductFromAmount ? satoshis - calcArkToBtcSwapFee(satoshis) : satoshis
      if (amountForSwap < 1) return handleError('Amount too low to cover fees')
      createArkToBtcSwap(sendInfo.address, amountForSwap)
        .then((result) => {
          if (!result) return navigate(Pages.SendDetails)
          setState({ ...sendInfo, pendingSwap: result.pendingSwap })
        })
        .catch(() => navigate(Pages.SendDetails))
    }
  }, [proceed, sendInfo.address, sendInfo.arkAddress, sendInfo.invoice, sendInfo.pendingSwap])

  // deal with fees deduction from amount
  useEffect(() => {
    const satoshis = sendInfo.satoshis ?? 0
    const onlyBtcAddress = sendInfo.address && !sendInfo.arkAddress && !sendInfo.invoice
    if (sendInfo.lnUrl) {
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

  const handleAmountChange = (sats: number) => {
    if (isAssetSend) {
      setTextValue(String(centsToUnits(sats, selectedAsset?.decimals ?? 8)))
      if (selectedAsset) {
        setState({ ...sendInfo, assets: [{ assetId: selectedAsset.assetId, amount: sats }], satoshis: 0 })
      }
    } else {
      setTextValue(useFiat ? prettyNumber(toFiat(sats), 2, false) : prettyNumber(sats, 0, false))
      setState({ ...sendInfo, satoshis: sats })
    }
    setAmount(sats)
  }

  const handleSelectAsset = (asset: AssetOption | null) => {
    setShowAssetSelector(false)
    setSelectedAsset(asset)
    if (asset) {
      if (isBTCAddress(recipient)) {
        return setError('Assets can only be sent to Arkade addresses')
      }
      setState({ ...sendInfo, address: '', assets: [{ assetId: asset.assetId, amount: 0 }], satoshis: 0 })
      setAmount(undefined)
      setTextValue('')
    } else {
      setState({ ...sendInfo, assets: undefined, satoshis: 0 })
    }
  }

  const handleRecipientChange = (recipient: string) => {
    setRawScanData('')
    setBrantaPayment(null)
    if (!recipient) {
      setState({ address: '', arkAddress: '', invoice: '', lnUrl: '', recipient: '', satoshis: 0 })
      setRecipient('')
      setAmountIsReadOnly(false)
      setLnUrlLimits({ min: 0, max: 0 })
      return
    }
    setState({ ...sendInfo, recipient })
    setRecipient(recipient)
  }

  const handleContinue = async () => {
    setProcessing(true)
    const satoshis = sendInfo.satoshis ?? 0
    try {
      if (sendInfo.lnUrl) {
        // Check if Ark method is available
        const conditions = await checkLnUrlConditions(sendInfo.lnUrl)
        const arkMethod = conditions.transferAmounts?.find((method) => method.method === 'Ark' && method.available)

        if (arkMethod) {
          // Fetch Ark address instead of Lightning invoice
          const arkResponse = await fetchArkAddress(sendInfo.lnUrl)
          if (!isArkAddress(arkResponse.address)) {
            handleError('Invalid Arkade address received from LNURL')
            return
          }
          setState({ ...sendInfo, arkAddress: arkResponse.address, invoice: undefined })
        } else {
          // Fallback to Lightning invoice
          const amountForInvoice = deductFromAmount ? satoshis - calcSubmarineSwapFee(satoshis) : satoshis
          if (amountForInvoice < 1) return handleError('Amount too low to cover fees')
          const invoice = await fetchInvoice(sendInfo.lnUrl, amountForInvoice, '')
          setState({ ...sendInfo, invoice, arkAddress: undefined })
        }
      } else {
        setState({ ...sendInfo, satoshis })
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
      const units = centsToUnits(balance, decimals)
      setTextValue(prettyNumber(units, decimals, false))
      setState({
        ...sendInfo,
        assets: [{ assetId, amount: balance }],
        satoshis: 0,
      })
      return
    }
    const maximumFractionDigits = useFiat ? 2 : 0
    const value = useFiat ? toFiat(liquidBalance) : liquidBalance
    setTextValue(prettyNumber(value, maximumFractionDigits, false))
    setState({ ...sendInfo, satoshis: liquidBalance })
    setAmount(liquidBalance)
  }

  const handleSendAll = () => {
    if (reserveApplied) {
      setShowReserveModal(true)
      return
    }
    applySendAll()
  }

  const confirmSendAll = () => {
    setShowReserveModal(false)
    applySendAll()
  }

  const Available = () => {
    if (isAssetSend && selectedAsset) {
      return (
        <div onClick={handleSendAll} style={{ cursor: 'pointer' }}>
          <Text color='dark50' smaller>
            {`${formatAssetAmount(selectedAsset.balance, selectedAsset.decimals)} ${selectedAsset.ticker} available`}
          </Text>
        </div>
      )
    }

    const amount = useFiat ? toFiat(liquidBalance) : liquidBalance
    const pretty = useFiat ? prettyAmount(amount, config.fiat, fiatDecimals()) : prettyAmount(amount)

    return (
      <div onClick={handleSendAll} style={{ cursor: 'pointer' }}>
        <Text color='dark50' smaller>
          {`${pretty} available`}
        </Text>
      </div>
    )
  }

  const { address, arkAddress, lnUrl, invoice, satoshis } = sendInfo

  const assetAmt = sendInfo.assets?.[0]?.amount ?? 0

  const buttonDisabled = isAssetSend
    ? !(arkAddress && assetAmt > 0) ||
      (selectedAsset ? assetAmt > selectedAsset.balance : true) ||
      aspInfo.unreachable ||
      tryingToSelfSend ||
      Boolean(error) ||
      processing
    : !((address || arkAddress || lnUrl || invoice) && satoshis && satoshis > 0) ||
      (lnUrlLimits.max && satoshis > lnUrlLimits.max) ||
      (lnUrlLimits.min && satoshis < lnUrlLimits.min) ||
      amountIsAboveMaxLimit(satoshis) ||
      amountIsBelowMinLimit(satoshis) ||
      satoshis > liquidBalance ||
      aspInfo.unreachable ||
      tryingToSelfSend ||
      Boolean(error) ||
      satoshis < 1 ||
      processing

  const selectedAssetLabel = selectedAsset ? `${selectedAsset.name} (${selectedAsset.ticker})` : 'Bitcoin (BTC)'

  const btcIcon = (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#f7931a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
      }}
    >
      ₿
    </div>
  )

  const overlayOpen = scan || (keys && !amountIsReadOnly)
  const sendOverlayStyle = { ...overlayStyle, position: 'fixed' as const, zIndex: 20 }

  return (
    <>
      {/* @ts-expect-error inert is valid HTML but React types lag behind */}
      <div inert={overlayOpen || undefined}>
      <Header text='Send' back />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            <InputAddress
              name='send-address'
              focus={focus === 'recipient'}
              label='Recipient address'
              onChange={handleRecipientChange}
              onEnter={handleEnter}
              openScan={() => {
                setKeys(false)
                setScan(true)
              }}
              value={recipient}
            />
            {brantaLoading ? (
              <Text color='dark50' smaller>
                Verifying address...
              </Text>
            ) : null}
            {brantaPayment ? (
              <Shadow>
                <FlexRow between padding='0.75rem'>
                  <FlexCol gap='0.1rem'>
                    <Text smaller>{brantaPayment.platform}</Text>
                    <Text smaller color='dark50'>
                      {brantaPayment.verify_url?.startsWith('https://') ? (
                        <a href={brantaPayment.verify_url} target='_blank' rel='noreferrer'>
                          Verified by Branta
                        </a>
                      ) : (
                        'Verified by Branta'
                      )}
                    </Text>
                  </FlexCol>
                  {brantaPayment.platform_logo_url ? (
                    <img src={brantaPayment.platform_logo_url} alt={brantaPayment.platform} width={48} height={48} />
                  ) : null}
                </FlexRow>
              </Shadow>
            ) : null}
            {assetOptions.length > 0 ? (
              <FlexCol gap='0.25rem'>
                <Text smaller color='dark50'>
                  Asset
                </Text>
                <Shadow border onClick={() => setShowAssetSelector(!showAssetSelector)} testId='asset-selector'>
                  <FlexRow between padding='0.5rem'>
                    <FlexRow>
                      {selectedAsset ? (
                        selectedAsset.icon ? (
                          <img src={selectedAsset.icon} alt='' width={24} height={24} style={{ borderRadius: '50%' }} />
                        ) : (
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: 'var(--dark20)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text smaller>{selectedAsset.ticker?.[0] ?? 'A'}</Text>
                          </div>
                        )
                      ) : (
                        btcIcon
                      )}
                      <Text>{selectedAssetLabel}</Text>
                    </FlexRow>
                    <Text color='dark50' smaller>
                      {showAssetSelector ? '▲' : '▼'}
                    </Text>
                  </FlexRow>
                </Shadow>
                {showAssetSelector ? (
                  <div style={{ maxHeight: '40vh', overflowY: 'auto', width: '100%' }}>
                    <FlexCol gap='0.25rem'>
                      {selectedAsset ? (
                        <Shadow onClick={() => handleSelectAsset(null)}>
                          <FlexRow between padding='0.5rem'>
                            <FlexRow>
                              {btcIcon}
                              <Text>Bitcoin (BTC)</Text>
                            </FlexRow>
                          </FlexRow>
                        </Shadow>
                      ) : null}
                      {assetOptions
                        .filter((asset) => asset.assetId !== selectedAsset?.assetId)
                        .map((asset) => (
                          <Shadow
                            key={asset.assetId}
                            onClick={() => handleSelectAsset(asset)}
                            testId={`asset-${asset.ticker.toLowerCase()}-option`}
                          >
                            <FlexRow between padding='0.5rem'>
                              <FlexRow>
                                {asset.icon ? (
                                  <img src={asset.icon} alt='' width={24} height={24} style={{ borderRadius: '50%' }} />
                                ) : (
                                  <div
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      background: 'var(--dark20)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Text smaller>{asset.ticker?.[0] ?? 'A'}</Text>
                                  </div>
                                )}
                                <Text>
                                  {asset.name} ({asset.ticker})
                                </Text>
                              </FlexRow>
                              <Text color='dark50' smaller>
                                {formatAssetAmount(asset.balance, asset.decimals)} {asset.ticker}
                              </Text>
                            </FlexRow>
                          </Shadow>
                        ))}
                    </FlexCol>
                  </div>
                ) : null}
              </FlexCol>
            ) : null}
            <FlexCol gap='0.5rem'>
              <InputAmount
                asset={selectedAsset ?? undefined}
                name='send-amount'
                focus={focus === 'amount' && !isMobileBrowser}
                label='Amount'
                min={lnUrlLimits.min}
                max={lnUrlLimits.max}
                onSats={handleAmountChange}
                onEnter={handleEnter}
                onFocus={handleFocus}
                onMax={handleSendAll}
                readOnly={amountIsReadOnly}
                right={<Available />}
                sats={amount}
                value={textValue ? Number(textValue) : undefined}
              />
            </FlexCol>
            {deductFromAmount ? <InfoLine color='orange' text='Fees will be deducted from the amount sent' /> : null}
            {tryingToSelfSend ? (
              <div style={{ width: '100%' }}>
                <Text centered color='dark50' small>
                  Did you mean <a onClick={gotoRollover}>roll over your VTXOs</a>?
                </Text>
              </div>
            ) : null}
            {nudgeBoltz && getApiUrl() ? (
              <div style={{ width: '100%' }}>
                <Text centered color='dark50' small>
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
          <Text color='dark50' small>
            {`${DUST_AMOUNT} sats are kept in reserve to protect your assets. Your max sendable amount is ${prettyNumber(liquidBalance)} sats.`}
          </Text>
          <FlexCol gap='0.5rem'>
            <Button onClick={confirmSendAll} label='Send max' />
            <Button onClick={() => setShowReserveModal(false)} label='Cancel' secondary />
          </FlexCol>
        </FlexCol>
      </SheetModal>
      {prefersReducedMotion ? (
        <>
          {scan ? (
            <div style={sendOverlayStyle}>
              <Scanner close={() => setScan(false)} label='Recipient address' onData={(data) => { setRawScanData(data); setRecipient(data) }} onError={smartSetError} />
            </div>
          ) : null}
          {keys && !amountIsReadOnly ? (
            <div style={sendOverlayStyle}>
              <Keyboard back={() => setKeys(false)} onSats={handleAmountChange} value={amount} asset={selectedAsset ?? undefined} />
            </div>
          ) : null}
        </>
      ) : (
        <AnimatePresence>
          {scan ? (
            <motion.div key='scanner' variants={overlaySlideUp} initial='initial' animate='animate' exit='exit' style={sendOverlayStyle}>
              <Scanner close={() => setScan(false)} label='Recipient address' onData={(data) => { setRawScanData(data); setRecipient(data) }} onError={smartSetError} />
            </motion.div>
          ) : null}
          {keys && !amountIsReadOnly ? (
            <motion.div key='keyboard' variants={overlaySlideUp} initial='initial' animate='animate' exit='exit' style={sendOverlayStyle}>
              <Keyboard back={() => setKeys(false)} onSats={handleAmountChange} value={amount} asset={selectedAsset ?? undefined} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
    </>
  )
}
