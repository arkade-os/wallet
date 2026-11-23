import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Button from '../../../components/Button'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Details, { DetailsProps } from '../../../components/Details'
import ErrorMessage from '../../../components/Error'
import { WalletContext } from '../../../providers/wallet'
import { AspContext } from '../../../providers/asp'
import { SwapsContext } from '../../../providers/swaps'
import Header from '../../../components/Header'
import { defaultFee } from '../../../lib/constants'
import { prettyNumber } from '../../../lib/format'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { InsufficientFundsError, maxCollaborativeExit, sendOffChain } from '../../../lib/asp'
import {
  ASSET_RAIL,
  ASSET_SWAP_PAYMENT_RAIL,
  LIGHTNING_RAIL,
  LNURL_ARKADE_RAIL,
  ONCHAIN_ROUTE_LOG,
  ONCHAIN_SWAP_RAIL,
  fundedResult,
  isLnurlRail,
  prepareOnchainSend,
  quoteIsForThisInvoice,
  quoteIsForThisSend,
  trackedPaymentRail,
  withinPricingBudget,
  WALLET_EXIT_RAIL,
} from '../../../lib/sendRouter'
import { extractError } from '../../../lib/error'
import LoadingLogo from '../../../components/LoadingLogo'
import { consoleError, consoleLog } from '../../../lib/logs'
import type { NetworkName, RouteQuote } from '@arkade-os/sdk'
import { assetSwapIdOf, btcOn, type OpenRfqOffer, type Quote } from '@arkade-os/swap'
import { solverId } from '@arkade-os/solver-discovery'
import { lnurlQuoteMeta } from '@arkade-os/lnurl-client/arkade'
import { LimitsContext } from '../../../providers/limits'
import { FeesContext } from '../../../providers/fees'
import { buildTransactionAmountDisplay } from '../../../lib/transactionAmountDisplay'
import { useAmountDisplayContext } from '../../../hooks/useTransactionAmountDisplay'
import TransactionAmountSummary from '../../../components/TransactionAmountSummary'
import { saveTransactionActivityMetadata } from '../../../lib/storage'
import { lnurlSends, recordLnurlSend, watchLnurlConfirmation } from '../../../lib/lnurlSends'
import { useTranslation } from '../../../providers/language'
import { rememberSentDestination } from '../../../lib/contacts'
import { readOpenOfferPolicy, saveOnchainSendPreference } from '../../../lib/openOfferPolicy'
import {
  getSolverRoutingVersion,
  readSolverRouting,
  saveSolverRouting,
  subscribeSolverRouting,
} from '../../../lib/solverRouting'
import { paymentQuoteExpiry, quoteProviderMarket, type PaymentQuoteRequest } from '../../../lib/paymentQuotes'
import { decodeBip21, isBip21 } from '../../../lib/bip21'
import QuoteChoices from '../Swap/QuoteChoices'
import usePaymentQuoteReview from './usePaymentQuoteReview'

type RememberedRoute = { kind: 'provider'; id: string } | { kind: 'onchain'; railId: string; solverId?: string }

export default function SendDetails() {
  const displayContext = useAmountDisplayContext()
  const { navigate } = useContext(NavigationContext)
  const { appIntent, sendInfo, setAppIntent, setSendInfo } = useContext(FlowContext)
  const { calcOnchainOutputFee, intentFee } = useContext(FeesContext)
  const isAssetSend = Boolean(sendInfo.account || sendInfo.assets?.length)
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { assetMetadataCache, availableBalance, balance, reloadWallet, svcWallet } = useContext(WalletContext)
  const { aspInfo } = useContext(AspContext)
  const { sendRouter, onchainPaymentRouteCandidates } = useContext(SwapsContext)
  const readOnchainCandidates = useRef(onchainPaymentRouteCandidates)
  readOnchainCandidates.current = onchainPaymentRouteCandidates
  const { t } = useTranslation()

  const assetPayment = sendInfo.assetPayment?.address === sendInfo.arkAddress ? sendInfo.assetPayment : undefined
  const assetId = assetPayment?.assetId ?? sendInfo.account?.assetId ?? sendInfo.assets?.[0]?.assetId
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const assetDecimals = sendInfo.account?.decimals ?? assetMeta?.metadata?.decimals ?? 0
  const assetAmountValue = sendInfo.account?.amount ?? sendInfo.assets?.[0]?.amount ?? BigInt(0)

  const [buttonLabel, setButtonLabel] = useState('')
  const [details, setDetails] = useState<DetailsProps>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pricing, setPricing] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendDone, setSendDone] = useState(false)
  const [routePicker, setRoutePicker] = useState(false)
  const [searchOnOpen, setSearchOnOpen] = useState<'explicit' | 'automatic'>()
  const [rememberChoice, setRememberChoice] = useState(false)
  const [rememberedRoute, setRememberedRoute] = useState<RememberedRoute>()
  const [submissionPending, setSubmissionPending] = useState(false)
  const [onchainQuote, setOnchainQuote] = useState<RouteQuote>()
  const [onchainOverrideProviderId, setOnchainOverrideProviderId] = useState<string>()
  const [onchainCandidates, setOnchainCandidates] = useState<{ id: string; name: string }[]>([])
  const [overrideMethod, setOverrideMethod] = useState<string>()
  const commitStarted = useRef(false)
  const automaticDiscovery = useRef(false)

  const { address, arkAddress, invoice, lnUrl, pendingLnSend, satoshis, saveAsContact } = sendInfo
  const lnurlTarget = sendInfo.lnurlInvoice && sendInfo.lnurlInvoice.pr === invoice ? lnUrl : undefined
  const lnurlRoute = Boolean(lnUrl && pendingLnSend && isLnurlRail(pendingLnSend.railId))
  const { acceptPaymentQuote } = useContext(SwapsContext)
  const network = aspInfo.network as NetworkName
  const allowOffchain = vtxoTxsAllowed()
  const onchainDraft = Boolean(address && !arkAddress && !invoice && !lnurlRoute && !isAssetSend && sendInfo.reviewId)
  const exactOnchainAmount = useMemo(() => {
    const recipient = sendInfo.recipient
    if (!address || !recipient || !isBip21(recipient)) return
    const payment = decodeBip21(recipient)
    if (payment.address === address && payment.satoshis && payment.satoshis > 0) return payment.satoshis
  }, [address, sendInfo.recipient])
  const exactOnchainRequest = exactOnchainAmount !== undefined
  const firmRequest = useMemo<PaymentQuoteRequest | undefined>(() => {
    if (!allowOffchain) return
    if (assetPayment) return { kind: 'asset', ...assetPayment }
    if (!arkAddress && !lnurlRoute && invoice && sendInfo.reviewId)
      return { kind: 'lightning', invoice, amount: satoshis }
  }, [allowOffchain, arkAddress, invoice, lnurlRoute, satoshis, assetPayment, sendInfo.reviewId])
  const review = usePaymentQuoteReview(firmRequest, network)
  const firm = review.reviewed?.quote
  const firmMarket = firm && quoteProviderMarket(firm)
  const firmTotal = firm ? Number(firm.give.amount) : undefined
  const firmFee = firm && firm.fee.asset === firm.give.asset ? Number(firm.fee.amount) : undefined
  const routeVersion = useSyncExternalStore(subscribeSolverRouting, getSolverRoutingVersion)
  const openOfferPolicy = useMemo(() => readOpenOfferPolicy(network), [network, routeVersion])
  const discoveryRequest = firmRequest?.kind !== 'asset' ? firmRequest : undefined
  const enableDiscovery = Boolean(discoveryRequest && openOfferPolicy !== 'off')

  useEffect(() => {
    if (enableDiscovery && openOfferPolicy === 'when-needed' && review.quoteError && !automaticDiscovery.current) {
      automaticDiscovery.current = true
      setSearchOnOpen('automatic')
      setRoutePicker(true)
    }
  }, [enableDiscovery, openOfferPolicy, review.quoteError])
  const amountDisplay = buildTransactionAmountDisplay({
    ...displayContext,
    assets: assetPayment
      ? [{ assetId: assetPayment.assetId, amount: assetPayment.amount }]
      : sendInfo.account
        ? [{ assetId: sendInfo.account.assetId, amount: sendInfo.account.amount }]
        : sendInfo.assets,
    metadataForAsset: (id) => {
      const metadata = assetMetadataCache.get(id)?.metadata
      return id === assetId ? { ...metadata, decimals: assetDecimals } : metadata
    },
    satoshis: details?.satoshis ?? satoshis ?? 0,
  })

  const offerToSign = (total: number) => {
    if (balance < total) {
      setButtonLabel(t('send.insufficientFunds'))
      setError(t('send.insufficientFundsDetail', { balance: prettyNumber(balance) }))
    } else {
      setButtonLabel(t('send.tapToSign'))
    }
  }

  useEffect(() => {
    if (firmRequest) {
      setDetails({
        destination: firmRequest.kind === 'lightning' ? (lnurlTarget ?? firmRequest.invoice) : firmRequest.address,
        direction: t(firmRequest.kind === 'lightning' ? 'send.payingToLightning' : 'send.payingInsideArkade'),
        satoshis: firmRequest.kind === 'lightning' ? firmRequest.amount : 0,
        ...(firmRequest.kind === 'asset' ? { assetId: firmRequest.assetId } : {}),
      })
      return
    }
    if (!address && !arkAddress && !invoice && !lnurlRoute) return setError(t('send.missingAddress'))
    if (isAssetSend) {
      if (!assetAmountValue) return setError(t('send.missingAssetAmount'))
      const destination = arkAddress ?? ''
      const feeInSats = defaultFee
      setDetails({
        assetId,
        destination,
        direction: t('send.directionSendingAssets'),
        fees: feeInSats,
        satoshis: 0,
        total: feeInSats,
      })
      setButtonLabel(t('send.tapToSign'))
      setError('')
      return
    }
    if (!satoshis) return setError(t('send.missingAmount'))
    const destination =
      lnurlRoute && vtxoTxsAllowed()
        ? lnUrl!
        : arkAddress && vtxoTxsAllowed()
          ? arkAddress
          : invoice && pendingLnSend && vtxoTxsAllowed()
            ? invoice
            : address && utxoTxsAllowed()
              ? address
              : ''
    // Routing is a protocol decision; it must never depend on a localized string,
    // otherwise fee math and labels drift when the language changes.
    const destinationType =
      lnurlRoute && destination === lnUrl
        ? pendingLnSend?.railId === LNURL_ARKADE_RAIL
          ? 'arkade'
          : 'lightning'
        : destination === arkAddress
          ? 'arkade'
          : destination === invoice
            ? 'lightning'
            : destination === address
              ? 'mainnet'
              : 'none'
    // `direction` is display-only; keep logic keyed on `destinationType`.
    const direction =
      destinationType === 'arkade'
        ? t('send.payingInsideArkade')
        : destinationType === 'lightning'
          ? t('send.payingToLightning')
          : destinationType === 'mainnet'
            ? t('send.payingToMainnet')
            : ''

    // The RFQ lockup carries exactly the invoice amount (exact-out, fee_bps
    // from the card; 0 today), so total == satoshis on the Lightning path.
    const total = pendingLnSend ? pendingLnSend.total : satoshis
    const amount = destinationType === 'mainnet' ? (exactOnchainAmount ?? satoshis - calcOnchainOutputFee()) : satoshis
    const fees = total - amount > 0 ? total - amount : 0
    setDetails({
      destination,
      direction,
      fees,
      satoshis: amount,
      total,
    })
    // Provisional on this path until the router settles it below.
    if (destinationType === 'mainnet' && amount > 0) {
      setButtonLabel(t('send.gettingQuote'))
      return setPricing(true)
    }
    offerToSign(total)
  }, [sendInfo, firmRequest])

  useEffect(() => {
    if (!pricing || !details?.destination || !details.satoshis) return
    let live = true
    const asked = details.satoshis
    type Priced = { cost: RouteQuote; most?: number }
    const settle = (priced?: Priced) => {
      if (!live) return
      const cost = priced?.cost
      if (cost) {
        setOnchainQuote(priced?.most === undefined ? cost : undefined)
        setDetails((prev) => (prev ? { ...prev, satoshis: cost.amount, fees: cost.fee, total: cost.total } : prev))
      }
      if (cost && cost.amount < asked) setNotice(t('send.feesDeductedFromAmount'))
      setPricing(false)
      if (!cost) {
        setError(t('send.noPaymentQuote'))
        return
      }
      if (priced?.most === undefined) return offerToSign(cost.total)
      setButtonLabel(t('send.insufficientFunds'))
      setError(t('send.insufficientFundsMax', { max: prettyNumber(priced.most) }))
    }
    // A claim can reduce the recipient output when relay fees rise. Fixed Bitcoin
    // requests use the collaborative exit, which pays the requested amount.
    const exitOnly = exactOnchainRequest || overrideMethod === WALLET_EXIT_RAIL || !allowOffchain
    const priced = sendRouter({
      outputFee: calcOnchainOutputFee,
      intentFee,
      ...(onchainOverrideProviderId ? { onchainSolverId: onchainOverrideProviderId } : {}),
      ...(exitOnly ? { exitOnly: true } : {}),
    })
      .then(async (router): Promise<Priced | undefined> => {
        const method = exitOnly ? WALLET_EXIT_RAIL : overrideMethod
        const cost = await prepareOnchainSend(router, details.destination!, asked, method)
        if (cost || !svcWallet) return cost && { cost }
        if (overrideMethod) return undefined
        const most = (await maxCollaborativeExit(svcWallet, intentFee(), Number(aspInfo.dust))) - calcOnchainOutputFee()
        const atMost =
          most > 0 && most < asked ? await prepareOnchainSend(router, details.destination!, most, method) : undefined
        if (!atMost) return undefined
        // Max asks for the whole balance, so the fees can only come out of the amount, as the exit fee does.
        if (!exactOnchainRequest && satoshis === availableBalance) return { cost: atMost }
        // Any other amount stays as asked, at the fee of spending every coin: more than they hold.
        return { cost: { ...atMost, amount: asked, total: asked + atMost.fee }, most }
      })
      .catch((err) => {
        // The exit rail's own figures stay on screen, and it is what will pay.
        consoleError(err, `${ONCHAIN_ROUTE_LOG} could not price the send`)
        return undefined
      })
    withinPricingBudget(priced)
      .then(async (result) => {
        if (result || exitOnly || overrideMethod || !live) return result
        const exit = sendRouter({ outputFee: calcOnchainOutputFee, intentFee, exitOnly: true })
          .then((router) => prepareOnchainSend(router, details.destination!, asked, WALLET_EXIT_RAIL))
          .catch(() => undefined)
        const cost = await withinPricingBudget(exit, 2_000)
        return cost && { cost }
      })
      .then(settle)
      .catch((err) => consoleError(err, `${ONCHAIN_ROUTE_LOG} could not price the send`))
    return () => {
      live = false
    }
  }, [
    pricing,
    details?.destination,
    details?.satoshis,
    overrideMethod,
    onchainOverrideProviderId,
    exactOnchainRequest,
    allowOffchain,
  ])

  const handleTxid = (txid: string) => {
    if (!txid) return handleError(t('send.errorSendingTransaction'))
    rememberDestination()
    saveTransactionActivityMetadata(txid, {
      destination: details?.destination,
      networkFee: details?.fees,
    })
    // Refresh now instead of waiting on the worker's VTXO_UPDATE broadcast:
    // that message rides on the indexer subscription, and for a transaction
    // this wallet submitted itself it can arrive late or not at all, leaving
    // the balance and the history a payment behind until a manual refresh.
    // The worker persists the spent inputs and the change VTXO before it hands
    // back the txid, so its cache is already current — and the metadata saved
    // just above is what the refreshed history grafts onto this row.
    reloadWallet().catch(consoleError)
    setSendInfo({ ...sendInfo, assetPayment, total: details?.total, txid })
    setSendDone(true)
  }

  /** Every reusable destination becomes a recent; only the opt-in tick makes
   *  it a contact, so the list stays a choice rather than a side effect. */
  const rememberDestination = () => rememberSentDestination(sendInfo, Boolean(saveAsContact))

  /** Unlike {@link handleTxid} a missing txid is not an error: the solver rail
   *  commits by funding. The fee comes off the QUOTE, not the screen — a rail
   *  may charge less than was displayed.
   *
   *  No fallback key: the store and every row builder are keyed BY the funding
   *  txid, so anything else would never be looked up. What made this miss was
   *  WHEN it ran — on the terminal outcome, minutes after the user had gone. */
  const handleSent = (
    txid: string | undefined,
    total: number,
    fee: number | undefined,
    railId: string,
    swapId?: string,
    openOffer?: OpenRfqOffer,
  ) => {
    rememberDestination()
    if (txid) {
      saveTransactionActivityMetadata(txid, { destination: lnurlTarget ?? details?.destination, networkFee: fee })
    }
    reloadWallet().catch(consoleError)
    const trackedRail = trackedPaymentRail(railId)
    if (
      trackedRail &&
      appIntent?.status === 'send' &&
      appIntent.callback &&
      sendInfo.recipient === appIntent.request &&
      !appIntent.committedSwap &&
      !appIntent.committedOnchain
    ) {
      if (swapId && sendInfo.reviewId) {
        setAppIntent({ ...appIntent, committedSwap: { swapId, railId: trackedRail, fundingTxid: txid } })
      } else if (railId === ONCHAIN_SWAP_RAIL) {
        setAppIntent({ ...appIntent, committedOnchain: { swapId, fundingTxid: txid } })
      }
    }
    setSendInfo({ ...sendInfo, assetPayment, total, txid, railId, swapId, openOffer })
    setSendDone(true)
  }

  const handleExitComplete = () => {
    if (error) return setSending(false)
    else navigate(Pages.SendSuccess)
  }

  const handleError = (err: any) => {
    consoleError(err, 'error sending payment')
    setError(extractError(err))
    setSendDone(true)
  }

  const payReviewedQuote = async (quote: Quote, request: PaymentQuoteRequest) => {
    review.validate(quote)
    const swap = await acceptPaymentQuote(quote, request, sendInfo.reviewId)
    const reviewedSwap = swap.id === assetSwapIdOf(request.kind === 'asset' ? 'offer' : 'rfq', quote.id)
    if (
      reviewedSwap &&
      firmMarket &&
      !review.reviewed?.offer &&
      rememberedRoute?.kind === 'provider' &&
      rememberedRoute.id === solverId(firmMarket, network)
    ) {
      const direction = JSON.stringify([network, quote.give.asset, quote.take.asset])
      try {
        saveSolverRouting(network, direction, {
          ...readSolverRouting(network, direction),
          preferFirst: rememberedRoute.id,
        })
      } catch (failure) {
        consoleError(failure, 'could not save preferred payment provider')
      }
    }
    handleSent(
      swap.fundingTxid,
      Number(swap.give.amount),
      swap.fee.asset === swap.give.asset ? Number(swap.fee.amount) : undefined,
      request.kind === 'asset' ? ASSET_SWAP_PAYMENT_RAIL : LIGHTNING_RAIL,
      swap.id,
      reviewedSwap ? review.reviewed?.offer : undefined,
    )
  }

  /** Fund the covenant, then return; both swap rails end here. Funding IS
   *  acceptance, so waiting for the TERMINAL outcome only made the user watch
   *  the counterparty's pipeline — the swaps provider observes that and
   *  outlives this screen. An on-chain send must still claim its L1 HTLC, which
   *  is why the success copy says "on the way" for both rails. The invoice is
   *  re-checked because the quote came from the previous screen. */
  const payLightning = async (quote: RouteQuote, shownInvoice: string) => {
    if (!quoteIsForThisInvoice(quote, shownInvoice)) return handleError(t('send.quoteForDifferentInvoice'))
    const result = await fundedResult(await quote.send())
    handleSent(result?.txid, quote.total, quote.fee, quote.railId, result?.swapId)
  }

  /** The quote came from the previous screen, so it is held to what this one shows. */
  const payLnurl = async (quote: RouteQuote, target: string) => {
    const lnurlMeta = lnurlQuoteMeta(quote)
    if (lnurlMeta?.target !== target || quote.amount !== satoshis)
      return handleError(t('send.quoteForDifferentPayment'))
    const handle = await quote.send()
    recordLnurlSend(handle, quote, target)
    const result = await fundedResult(handle)
    // A rail whose destination cannot identify the payment supplies no verify
    // URL, and absence is "no answer available" rather than a failure.
    if (result?.txid && lnurlMeta.verify)
      watchLnurlConfirmation(
        result.txid,
        lnurlMeta.verify,
        lnurlMeta.verifyBatch,
        lnurlSends().find((sent) => sent.txid === result.txid)?.createdAt,
        lnurlMeta.expect,
      )
    handleSent(result?.txid, quote.total, quote.fee, quote.railId)
  }

  /** One rail and no counterparty; routed so every branch here has one shape. */
  const payAssets = async (arkAddress: string, assets: NonNullable<typeof sendInfo.assets>) => {
    const router = await sendRouter({ assets })
    const options = await router.options({ raw: arkAddress })
    const route = options.find((option) => option.railId === ASSET_RAIL)
    if (!route) throw new Error('No route for this payment')
    const quote = await route.quote()
    const result = await (await quote.send()).settled()
    handleTxid(result.txid ?? '')
  }

  /** Pay an L1 address through the router. The request is built from `address` —
   *  what THIS screen is showing — at the moment of the spend, so no carried
   *  quote exists to go stale. A rail that cannot quote is skipped. */
  const payOnchain = async (address: string, shown: DetailsProps): Promise<void> => {
    const router = await sendRouter({ outputFee: calcOnchainOutputFee, intentFee })
    // Receiver-exact: "what leaves" was subtracted when `details` was built.
    const options = await router.options({ raw: address, amount: shown.satoshis! })
    let repriced: RouteQuote | undefined
    let insufficient = false
    let otherwiseRefused = false

    for (const option of options) {
      let quote
      try {
        quote = await option.quote()
      } catch (err) {
        consoleError(err, `${ONCHAIN_ROUTE_LOG} ${option.railId} could not quote`)
        if (err instanceof InsufficientFundsError) insufficient = true
        else otherwiseRefused = true
        continue
      }
      if (!quoteIsForThisSend(quote, shown, address)) {
        if (quoteIsForThisSend({ ...quote, total: shown.total ?? 0 }, shown, address)) repriced ??= quote
        else otherwiseRefused = true
        consoleLog(
          `${ONCHAIN_ROUTE_LOG} ${option.railId} refused: quote pays ${quote.amount} for ${quote.total}, ` +
            `screen shows ${shown.satoshis} for ${shown.total} to ${shown.destination}`,
        )
        continue
      }
      consoleLog(`${ONCHAIN_ROUTE_LOG} paying via ${option.railId}`)
      // Deliberately NOT caught, and the funding is why: this reaches
      // `ServiceWorkerWallet.send`, whose worker submits the Ark tx and only
      // then replies (#949), so a rejection here can mean a covenant that IS
      // funded. Trying the exit rail next would pay the recipient twice.
      const result = await fundedResult(await quote.send())
      return handleSent(result?.txid, quote.total, quote.fee, option.railId, result?.swapId)
    }
    if (repriced) return askToSignAgain(repriced)
    if (insufficient && !otherwiseRefused) throw new Error(t('send.insufficientFunds'))
    throw new Error('No route for this payment')
  }

  /** A rail that now costs more is shown, never paid: the new total needs its own tap. */
  const askToSignAgain = ({ fee, total }: Pick<RouteQuote, 'fee' | 'total'>) => {
    setDetails((prev) => (prev ? { ...prev, fees: fee, total } : prev))
    setNotice(t('send.feeChanged'))
    offerToSign(total)
    setSending(false)
  }

  const handleContinue = async () => {
    if (!details || !svcWallet || pricing || commitStarted.current) return
    if (firmRequest) {
      if (!firm || review.loading || review.expired || !firmTotal || firmTotal > availableBalance) return
      if (paymentQuoteExpiry(firm) * 1000 <= Date.now()) return
      commitStarted.current = true
      setSending(true)
      void payReviewedQuote(firm, firmRequest).catch((failure) => {
        setSending(false)
        const reason = (failure as Error)?.name
        const pending = reason === 'PaymentSubmissionPending'
        setSubmissionPending(pending)
        if (reason === 'PaymentRequiresNewInvoice') {
          setError(t('send.paymentRequiresNewInvoice'))
          if (lnurlTarget) setSendInfo((previous) => ({ ...previous, lnurlInvoice: undefined }))
          return
        }
        setError(pending ? t('send.submissionPending') : extractError(failure))
        if (['PaymentNotSubmitted', 'QuoteUnavailable', 'QuoteExpired'].includes(reason)) {
          commitStarted.current = false
        }
      })
      return
    }
    if (!isAssetSend && (!details.total || !details.satoshis)) return
    if (isAssetSend && !arkAddress) {
      setError(t('send.assetsOnlyToArkade'))
      return
    }

    setNotice('')
    setSending(true)

    if (isAssetSend && arkAddress) {
      if (!sendInfo.assets || sendInfo.assets.length === 0) return handleError('Missing assets list')
      payAssets(arkAddress, sendInfo.assets).catch(handleError)
    } else if (lnurlRoute && details.destination === lnUrl) {
      payLnurl(pendingLnSend!, lnUrl!).catch(handleError)
    } else if (lnurlRoute && !address) {
      return handleError(t('send.sendingOffchainNotAllowed'))
    } else if (arkAddress) {
      if (!details.total) return handleError(t('send.missingTotalAmount'))
      sendOffChain(svcWallet, details.total, arkAddress)
        .then((txId: string) => handleTxid(txId))
        .catch(handleError)
    } else if (invoice && pendingLnSend) {
      // RFQ Lightning send. The address the rail funds is the wallet's OWN
      // derivation of the lockup covenant (the client refuses a mismatched
      // quote), so funding it IS the acceptance — no further message exists.
      payLightning(pendingLnSend, invoice).catch(handleError)
    } else if (address) {
      if (!details.total) return handleError(t('send.missingTotalAmount'))
      if (!details.satoshis) return handleError(t('send.missingSatoshisAmount'))
      // Blanked by the limit, not by routing: every rail fails `quoteIsForThisSend`.
      if (!details.destination) return handleError('On-chain sends are not permitted on this account')
      if (onchainQuote) {
        if (onchainQuote.validUntil !== undefined && onchainQuote.validUntil * 1000 <= Date.now()) {
          setSending(false)
          setNotice(t('send.feeChanged'))
          setOnchainQuote(undefined)
          setPricing(true)
          return
        }
        if (
          details.destination !== address ||
          onchainQuote.amount !== details.satoshis ||
          onchainQuote.total !== details.total
        )
          return handleError(t('send.quoteForDifferentPayment'))
        commitStarted.current = true
        const method = onchainQuote.railId === WALLET_EXIT_RAIL ? 'exit' : 'solver'
        void onchainQuote
          .send()
          .then(fundedResult)
          .then((result) => {
            if (
              rememberedRoute?.kind === 'onchain' &&
              rememberedRoute.railId === onchainQuote.railId &&
              (!result?.railId || result.railId === rememberedRoute.railId) &&
              (rememberedRoute.solverId === undefined || onchainQuote.meta?.providerId === rememberedRoute.solverId)
            ) {
              try {
                saveOnchainSendPreference(network, method)
                if (rememberedRoute.solverId !== undefined) {
                  const direction = JSON.stringify([network, btcOn('arkade', network), btcOn('bitcoin', network)])
                  saveSolverRouting(network, direction, {
                    ...readSolverRouting(network, direction),
                    preferFirst: rememberedRoute.solverId,
                  })
                }
              } catch (failure) {
                consoleError(failure, 'could not save payment method')
              }
            }
            handleSent(
              result?.txid,
              onchainQuote.total,
              onchainQuote.fee,
              result?.railId ?? onchainQuote.railId,
              result?.swapId,
            )
          })
          .catch(handleError)
      } else if (!onchainDraft && !exactOnchainRequest) {
        payOnchain(address, details).catch(handleError)
      } else {
        setSending(false)
      }
    }
  }

  const isOnchain = Boolean(address && details?.destination === address)
  const verifiedQuoteReady = Boolean(
    firm && !review.loading && !review.expired && firmTotal !== undefined && firmTotal <= availableBalance,
  )
  const statusMessage = firmRequest
    ? error ||
      (review.loading
        ? ''
        : review.expired
          ? t('swap.offerExpired')
          : review.quoteError
            ? t('send.noPaymentQuote')
            : firmTotal !== undefined && firmTotal > availableBalance
              ? t('send.insufficientFunds')
              : review.termsChanged
                ? t('send.routeChanged')
                : '')
    : error || notice
  const preferredProviderId = firmMarket ? solverId(firmMarket, network) : undefined
  const otherCandidates = review.candidates.filter(({ id }) => id !== preferredProviderId)
  const canChooseOnchain = isOnchain && !exactOnchainRequest && allowOffchain
  const onchainAmount = isOnchain ? details?.satoshis : undefined
  useEffect(() => {
    if (!routePicker || !canChooseOnchain || !address || !onchainAmount) return
    let active = true
    setOnchainCandidates([])
    void readOnchainCandidates.current(address, onchainAmount).then(
      (routes) => {
        if (active) setOnchainCandidates(routes)
      },
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [routePicker, canChooseOnchain, address, onchainAmount, routeVersion])
  const onchainProviderName =
    typeof onchainQuote?.meta?.providerName === 'string' ? onchainQuote.meta.providerName : undefined
  const providerName = firmMarket?.solver ?? review.reviewed?.offer?.solverName
  const currentRoute = isOnchain
    ? onchainQuote &&
      (onchainQuote.railId === WALLET_EXIT_RAIL
        ? t('solvers.onchainMethodExit')
        : (onchainProviderName ?? t('solvers.onchainMethodSolver')))
    : providerName
  const showRemember = canChooseOnchain || otherCandidates.length > 0
  const hasRouteOptions = showRemember || enableDiscovery
  const findOffersDirectly = enableDiscovery && !firm && !onchainQuote && Boolean(review.quoteError)
  const togglePicker = (open: boolean) => {
    setRoutePicker(open)
    setSearchOnOpen(undefined)
    setRememberChoice(false)
    if (!open) setOnchainCandidates([])
  }
  const chooseOnchain = (rail: string, providerId?: string) => {
    setOnchainQuote(undefined)
    setOverrideMethod(rail)
    setOnchainOverrideProviderId(providerId)
    setError('')
    setNotice('')
    setButtonLabel(t('send.gettingQuote'))
    setRememberedRoute(rememberChoice ? { kind: 'onchain', railId: rail, solverId: providerId } : undefined)
    setPricing(true)
    togglePicker(false)
  }
  const displayedDetails = details && {
    ...details,
    amountDisplay,
    ...(firmRequest ? { solver: providerName, swapFeeSats: firmFee, total: firmTotal, fees: undefined } : {}),
    ...(isAssetSend && !firmRequest ? { total: undefined } : {}),
    ...(isOnchain && onchainQuote
      ? {
          solver: onchainProviderName,
          rail: t(
            onchainQuote.railId === WALLET_EXIT_RAIL ? 'solvers.onchainMethodExit' : 'solvers.onchainMethodSolver',
          ),
        }
      : {}),
  }

  return (
    <>
      <Header
        text={firmRequest ? t('send.reviewPayment') : t('send.signTransaction')}
        back={!sending && !submissionPending}
      />
      <Content>
        {sending ? (
          <LoadingLogo
            text={details?.direction || t('send.payingInsideArkade')}
            done={sendDone}
            exitMode='fly-up'
            onExitComplete={handleExitComplete}
          />
        ) : (
          <Padded>
            <FlexCol>
              <ErrorMessage error={Boolean(statusMessage)} text={statusMessage} />
              {details && amountDisplay ? (
                <TransactionAmountSummary
                  amount={amountDisplay}
                  label={
                    onchainQuote?.railId === ONCHAIN_SWAP_RAIL
                      ? t('send.estimatedRecipientAmount')
                      : t(firmRequest || exactOnchainRequest ? 'send.recipientGets' : 'send.amountToSend')
                  }
                />
              ) : null}
              <Details details={displayedDetails} />
            </FlexCol>
          </Padded>
        )}
      </Content>
      <ButtonsOnBottom>
        {sending ? null : firmRequest ? (
          <>
            <Button
              onClick={handleContinue}
              label={
                review.loading || pricing
                  ? t('send.gettingQuote')
                  : t(firmRequest.kind === 'asset' ? 'send.swapAndPay' : 'send.pay')
              }
              disabled={!verifiedQuoteReady || Boolean(error) || commitStarted.current}
            />
            {!pricing && !review.loading && !commitStarted.current && (!firm || review.expired || Boolean(error)) ? (
              <Button
                label={t('send.retryQuote')}
                secondary
                onClick={() => {
                  setError('')
                  void review.load(review.reviewed?.solverId)
                }}
              />
            ) : null}
          </>
        ) : (
          <Button
            onClick={handleContinue}
            label={buttonLabel}
            disabled={
              Boolean(error) ||
              pricing ||
              commitStarted.current ||
              ((onchainDraft || exactOnchainRequest) && isOnchain && !onchainQuote)
            }
          />
        )}
        {!sending && !pricing && !review.loading && !commitStarted.current && hasRouteOptions ? (
          <>
            {findOffersDirectly ? (
              <p className='px-2 text-center text-xs text-muted-foreground'>{t('swap.openOffersPrivacy')}</p>
            ) : null}
            <Button
              label={t(findOffersDirectly ? 'swap.findOpenOffers' : 'send.changeRoute')}
              clear
              onClick={() => {
                togglePicker(true)
                if (findOffersDirectly) setSearchOnOpen('explicit')
              }}
            />
          </>
        ) : null}
        {submissionPending ? (
          <Button label={t('send.viewPaymentActivity')} secondary onClick={() => navigate(Pages.Activity)} />
        ) : null}
      </ButtonsOnBottom>
      {hasRouteOptions ? (
        <QuoteChoices
          open={routePicker}
          network={network}
          from={{ assetId: 'btc', ticker: 'sats', decimals: 0 }}
          to={{ assetId: firmRequest?.kind === 'asset' ? firmRequest.assetId : 'btc', ticker: 'sats', decimals: 0 }}
          amount={BigInt(discoveryRequest?.amount ?? details?.satoshis ?? 0)}
          description={
            onchainAmount
              ? `${t(onchainQuote?.railId === ONCHAIN_SWAP_RAIL ? 'send.estimatedRecipientAmount' : 'send.recipientGets')} · ${prettyNumber(onchainAmount, 0)} ${t('common.sats')}`
              : firmRequest?.kind === 'asset'
                ? t('send.reviewPayment')
                : undefined
          }
          allowSmartRouting={false}
          allowOpenOffers={enableDiscovery}
          payment={discoveryRequest}
          autoSearch={Boolean(searchOnOpen)}
          autoSearchConsent={searchOnOpen === 'explicit'}
          onOpenChange={togglePicker}
          onSmartRouting={() => undefined}
          onChoose={(quote, offer) => {
            review.chooseOpenQuote(quote, offer)
            setOnchainQuote(undefined)
            setOverrideMethod(undefined)
            setError('')
            setRememberedRoute(undefined)
            togglePicker(false)
          }}
          routes={
            <>
              {currentRoute ? (
                <div className='flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2.5'>
                  <span className='text-sm font-medium wrap-anywhere'>{currentRoute}</span>
                  <span className='shrink-0 text-xs text-muted-foreground'>{t('send.currentRoute')}</span>
                </div>
              ) : null}
              {showRemember ? (
                <label className='flex cursor-pointer items-center gap-3 px-1 py-3 text-sm'>
                  <input
                    type='checkbox'
                    className='size-4 shrink-0 accent-[var(--purple-700)] scheme-light dark:scheme-dark'
                    checked={rememberChoice}
                    onChange={(event) => setRememberChoice(event.target.checked)}
                  />
                  {t('send.rememberRoute')}
                </label>
              ) : null}
              <div className='settings-row-group'>
                {otherCandidates.map(({ id, name }) => (
                  <button
                    type='button'
                    className='settings-row'
                    key={id}
                    onClick={() => {
                      setError('')
                      setOnchainQuote(undefined)
                      setOverrideMethod(undefined)
                      setRememberedRoute(rememberChoice ? { kind: 'provider', id } : undefined)
                      togglePicker(false)
                      void review.load(id)
                    }}
                  >
                    {name}
                  </button>
                ))}
                {canChooseOnchain && onchainQuote?.railId !== WALLET_EXIT_RAIL ? (
                  <button type='button' className='settings-row' onClick={() => chooseOnchain(WALLET_EXIT_RAIL)}>
                    {t('solvers.onchainMethodExit')}
                  </button>
                ) : null}
                {canChooseOnchain && (onchainQuote?.railId !== ONCHAIN_SWAP_RAIL || onchainOverrideProviderId) ? (
                  <button type='button' className='settings-row' onClick={() => chooseOnchain(ONCHAIN_SWAP_RAIL)}>
                    {t('send.automaticProvider')}
                  </button>
                ) : null}
                {canChooseOnchain
                  ? onchainCandidates
                      .filter(({ id }) => id !== onchainQuote?.meta?.providerId)
                      .map(({ id, name }) => (
                        <button
                          type='button'
                          className='settings-row'
                          key={id}
                          onClick={() => chooseOnchain(ONCHAIN_SWAP_RAIL, id)}
                        >
                          {name}
                        </button>
                      ))
                  : null}
              </div>
            </>
          }
        />
      ) : null}
    </>
  )
}
