import { useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { OpenRfqAuction, OpenRfqOffer, Quote } from '@arkade-os/swap'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer'
import UnverifiedBadge from '../../../components/UnverifiedBadge'
import ArrowIcon from '../../../icons/Arrow'
import XIcon from '../../../icons/X'
import { extractError } from '../../../lib/error'
import { hapticTap } from '../../../lib/haptics'
import { newRequestId } from '../../../lib/requestId'
import { SwapsContext } from '../../../providers/swaps'
import { useTranslation } from '../../../providers/language'
import { paymentQuoteExpiry, type PaymentQuoteRequest } from '../../../lib/paymentQuotes'

interface DisplayAsset {
  assetId: string
  ticker: string
  decimals: number
  networkLabel?: string
  unverified?: boolean
}

interface QuoteChoicesProps {
  open: boolean
  network: string
  from: DisplayAsset
  to: DisplayAsset
  amount: bigint
  automaticAmount?: bigint
  allowSmartRouting?: boolean
  autoSearch?: boolean
  autoSearchConsent?: boolean
  allowOpenOffers?: boolean
  payment?: PaymentQuoteRequest
  routes?: ReactNode
  destination?: string
  description?: string
  onOpenChange: (open: boolean) => void
  onSmartRouting: () => void
  onChoose: (quote: Quote, offer: OpenRfqOffer) => void
}

export default function QuoteChoices({
  open,
  network,
  from,
  to,
  amount,
  automaticAmount,
  allowSmartRouting = true,
  autoSearch = false,
  autoSearchConsent = false,
  allowOpenOffers = true,
  payment,
  routes,
  destination,
  description,
  onOpenChange,
  onSmartRouting,
  onChoose,
}: QuoteChoicesProps) {
  const { openSwapQuotes, openPaymentQuotes, cancelOpenSwapQuotes, chooseSwapQuote } = useContext(SwapsContext)
  const api = useRef({ openSwapQuotes, openPaymentQuotes, cancelOpenSwapQuotes, chooseSwapQuote })
  api.current = { openSwapQuotes, openPaymentQuotes, cancelOpenSwapQuotes, chooseSwapQuote }
  const { t } = useTranslation()
  const descriptionId = useId()
  const [searchResult, setSearchResult] = useState<{ inputKey: string; auction: OpenRfqAuction }>()
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState<string>()
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const request = useRef<string>()
  const selection = useRef<string>()
  const epoch = useRef(0)
  const searched = useRef(false)
  const openingInput = useRef<string>()
  const paymentKey =
    payment?.kind === 'asset'
      ? [payment.kind, payment.address, payment.assetId, String(payment.amount), payment.fromAssetId ?? 'btc']
      : [payment?.kind, payment?.invoice, payment?.amount]
  const inputKey = JSON.stringify([
    network,
    from.assetId,
    from.decimals,
    to.assetId,
    to.decimals,
    String(amount),
    destination,
    paymentKey,
  ])
  const current = useRef({ inputKey, open, allowOpenOffers })
  current.current = { inputKey, open, allowOpenOffers }
  const auction = searchResult?.inputKey === inputKey ? searchResult.auction : undefined

  useEffect(() => {
    setSearchResult(undefined)
    setLoading(false)
    setSelecting(undefined)
    setError('')
    searched.current = false
    return () => {
      epoch.current += 1
      if (request.current)
        void Promise.resolve(api.current.cancelOpenSwapQuotes(request.current)).catch(() => undefined)
      request.current = undefined
      selection.current = undefined
      searched.current = false
      openingInput.current = undefined
    }
  }, [inputKey, open, allowOpenOffers])

  useEffect(() => {
    openingInput.current = open ? current.current.inputKey : undefined
  }, [open])

  useEffect(() => {
    if (!open) return
    setNow(Math.floor(Date.now() / 1000))
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [open])

  const isCurrent = useCallback(
    (started: number) =>
      epoch.current === started &&
      current.current.inputKey === inputKey &&
      current.current.open &&
      current.current.allowOpenOffers,
    [inputKey],
  )

  const findOffers = useCallback(
    async (explicitConsent = false) => {
      if (!isCurrent(epoch.current) || loading || selecting || request.current) return
      searched.current = true
      const started = ++epoch.current
      setLoading(true)
      setSearchResult(undefined)
      setError('')
      try {
        const requestId = newRequestId()
        request.current = requestId
        const result = payment
          ? await api.current.openPaymentQuotes(payment, requestId, explicitConsent)
          : await api.current.openSwapQuotes(from.assetId, to.assetId, amount, requestId, destination)
        if (isCurrent(started)) setSearchResult({ inputKey, auction: result })
      } catch (cause) {
        if (isCurrent(started)) setError(extractError(cause))
      } finally {
        if (isCurrent(started)) {
          request.current = undefined
          setLoading(false)
        }
      }
    },
    [amount, destination, from.assetId, to.assetId, inputKey, isCurrent, loading, payment, selecting],
  )

  useEffect(() => {
    if (open && autoSearch && openingInput.current === inputKey && !searched.current) void findOffers(autoSearchConsent)
  }, [open, autoSearch, autoSearchConsent, inputKey, findOffers])

  const choose = async (offer: OpenRfqOffer) => {
    if (
      !isCurrent(epoch.current) ||
      !auction ||
      loading ||
      selection.current ||
      offer.expiresAt <= Math.floor(Date.now() / 1000)
    )
      return
    const started = epoch.current
    selection.current = offer.id
    setSelecting(offer.id)
    setError('')
    try {
      const quote = await api.current.chooseSwapQuote(auction.id, offer.id)
      if (!isCurrent(started)) return
      if (Math.min(paymentQuoteExpiry(quote), offer.expiresAt) <= Math.floor(Date.now() / 1000))
        throw new Error(t('swap.offerExpired'))
      // `quoteBid` refuses this too; the screen still enforces the terms it showed.
      if (
        ((!payment || payment.kind === 'asset') && quote.take.amount < offer.toAmount) ||
        quote.give.amount > offer.fromAmount
      )
        throw new Error(t('swap.offerTermsChanged'))
      onChoose(quote, offer)
    } catch (cause) {
      if (isCurrent(started))
        setError((cause as Error)?.name === 'QuoteExpired' ? t('swap.offerExpired') : extractError(cause))
    } finally {
      if (isCurrent(started)) {
        selection.current = undefined
        setSelecting(undefined)
      }
    }
  }

  const offers = [...(auction?.bids ?? [])].sort((left, right) => {
    const expiryOrder = Number(left.expiresAt <= now) - Number(right.expiresAt <= now)
    if (expiryOrder) return expiryOrder
    if (payment && left.fromAmount !== right.fromAmount) return left.fromAmount < right.fromAmount ? -1 : 1
    return left.toAmount === right.toAmount ? left.id.localeCompare(right.id) : left.toAmount > right.toAmount ? -1 : 1
  })

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='swap-drawer-content swap-quotes'>
        <DrawerHeader className='block px-5 pt-3 pb-4'>
          <div className='flex items-center justify-between gap-3 text-left'>
            <div className='min-w-0'>
              <DrawerTitle className='text-lg'>{t(routes ? 'send.changeRoute' : 'swap.selectQuote')}</DrawerTitle>
              <DrawerDescription className='mt-1 text-[13px]'>
                {description ??
                  (payment
                    ? `${t('send.recipientGets')} ${formatQuoteAmount(amount, to.decimals)} ${to.ticker}`
                    : `${formatQuoteAmount(amount, from.decimals)} ${from.ticker} ${t('swap.routeConnector')} ${to.ticker}`)}
                {to.networkLabel ? ` (${to.networkLabel})` : ''}
                {to.unverified ? <UnverifiedBadge /> : null}
              </DrawerDescription>
            </div>
            <button
              type='button'
              aria-label={t('common.close')}
              className='flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary'
              onClick={() => onOpenChange(false)}
            >
              <XIcon />
            </button>
          </div>
        </DrawerHeader>
        <div className='flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pb-5'>
          {routes}
          {allowSmartRouting && automaticAmount !== undefined ? (
            <button
              type='button'
              aria-label={t('swap.useSmartRouting')}
              aria-describedby={`${descriptionId}-smart-amount`}
              className='flex min-h-16 items-center gap-3 rounded-xl bg-muted/50 px-3 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50'
              disabled={loading || Boolean(selecting)}
              onClick={() => {
                hapticTap()
                onSmartRouting()
              }}
            >
              <span className='min-w-0 flex-1 font-medium'>{t('swap.smartRouting')}</span>
              <strong
                id={`${descriptionId}-smart-amount`}
                className='max-w-[55%] text-right tabular-nums [overflow-wrap:anywhere]'
              >
                {formatQuoteAmount(automaticAmount, to.decimals)} {to.ticker}
              </strong>
              <span aria-hidden='true' className='text-muted-foreground'>
                <ArrowIcon />
              </span>
            </button>
          ) : null}
          {allowOpenOffers ? (
            <section aria-label={t('swap.openOffers')}>
              <div className='flex min-h-11 items-center justify-between gap-3'>
                <h3 className='text-sm font-medium'>{t('swap.openOffers')}</h3>
                <button
                  type='button'
                  aria-label={t(auction ? 'swap.refreshOffers' : 'swap.findOpenOffers')}
                  aria-busy={loading || undefined}
                  className='min-h-11 rounded-lg px-2 text-sm font-medium text-[var(--purpletext)] focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50'
                  disabled={loading || Boolean(selecting)}
                  onClick={() => {
                    hapticTap()
                    void findOffers(true)
                  }}
                >
                  {t(auction ? 'swap.refreshOffersShort' : 'swap.findOpenOffers')}
                </button>
              </div>
              <div className='flex flex-col gap-3'>
                <p className='text-xs text-muted-foreground'>{t('swap.openOffersPrivacy')}</p>
                {loading ? (
                  <p role='status' className='py-4 text-sm text-muted-foreground'>
                    {t('swap.collectingOffers')}
                  </p>
                ) : null}
                {auction && offers.length === 0 ? (
                  <p role='status' className='py-4 text-sm text-muted-foreground'>
                    {t('swap.noOpenOffers')}
                  </p>
                ) : null}
                {offers.length > 0 ? (
                  <div className='divide-y divide-border overflow-hidden rounded-xl border border-border'>
                    {offers.map((offer, index) => {
                      const expired = offer.expiresAt <= now
                      const best = index === 0 && !expired
                      return (
                        <article key={offer.id}>
                          <button
                            type='button'
                            aria-label={t('swap.selectProvider', { provider: offer.solverName })}
                            aria-describedby={`${descriptionId}-${offer.id}-identity ${descriptionId}-${offer.id}-amount${best && !payment ? ` ${descriptionId}-${offer.id}-best` : ''}`}
                            aria-busy={selecting === offer.id || undefined}
                            disabled={expired || loading || Boolean(selecting)}
                            className={`grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left hover:bg-muted/50 focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-45 ${best ? 'bg-[var(--purple10)]' : ''}`}
                            onClick={() => {
                              hapticTap()
                              void choose(offer)
                            }}
                          >
                            <span className='min-w-0'>
                              <span className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                                <span className='font-medium [overflow-wrap:anywhere]'>{offer.solverName}</span>
                                {best && !payment ? (
                                  <span
                                    id={`${descriptionId}-${offer.id}-best`}
                                    className='text-[11px] font-medium text-[var(--purpletext)]'
                                  >
                                    {t('swap.bestReceiveAmount')}
                                  </span>
                                ) : null}
                              </span>
                              <span
                                id={`${descriptionId}-${offer.id}-identity`}
                                className='mt-1 block text-[11px] text-muted-foreground'
                              >
                                {offer.solverPubkey.slice(0, 6)}…{offer.solverPubkey.slice(-6)}
                              </span>
                            </span>
                            <span id={`${descriptionId}-${offer.id}-amount`} className='min-w-0 text-right'>
                              <strong className='block text-sm font-semibold tabular-nums [overflow-wrap:anywhere]'>
                                {payment
                                  ? `${formatQuoteAmount(offer.fromAmount, from.decimals)} ${from.ticker}`
                                  : `${formatQuoteAmount(offer.toAmount, to.decimals)} ${to.ticker}`}
                              </strong>
                              <span className='mt-1 block text-[11px] text-muted-foreground'>
                                {expired
                                  ? t('swap.offerExpired')
                                  : t('swap.offerExpiresIn', { seconds: offer.expiresAt - now })}
                              </span>
                            </span>
                            <span
                              aria-hidden='true'
                              className='flex w-4 items-center justify-center text-muted-foreground'
                            >
                              {selecting === offer.id ? (
                                <span className='block size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none' />
                              ) : (
                                <ArrowIcon />
                              )}
                            </span>
                          </button>
                        </article>
                      )
                    })}
                  </div>
                ) : null}
                {offers.length > 0 ? (
                  <p className='text-xs text-muted-foreground'>{t('swap.offerPricingNote')}</p>
                ) : null}
                {to.networkLabel ? (
                  <p className='text-xs text-muted-foreground'>{t('swap.offerBitcoinFeeNote')}</p>
                ) : null}
              </div>
            </section>
          ) : null}
          {error ? (
            <p role='alert' className='swap-confirm-error'>
              {error}
            </p>
          ) : null}
          {allowOpenOffers ? (
            <details className='text-xs text-muted-foreground'>
              <summary className='min-h-11 cursor-pointer rounded py-3 focus-visible:outline-2 focus-visible:outline-primary'>
                {t('swap.aboutOffers')}
              </summary>
              <p className='pt-1 leading-relaxed'>{t('swap.openOffersDisclosure')}</p>
            </details>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export function formatQuoteAmount(amount: bigint, decimals: number): string {
  if (amount < 0n) return `-${formatQuoteAmount(-amount, decimals)}`
  if (decimals === 0) return amount.toString()
  const digits = amount.toString().padStart(decimals + 1, '0')
  const fraction = digits.slice(-decimals).replace(/0+$/, '')
  return `${digits.slice(0, -decimals)}${fraction ? `.${fraction}` : ''}`
}
