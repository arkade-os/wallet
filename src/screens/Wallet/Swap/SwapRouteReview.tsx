import { useEffect, useState } from 'react'
import { parseAssetId, type AssetId, type Quote } from '@arkade-os/swap'
import Button from '../../../components/Button'
import QrCode from '../../../components/QrCode'
import UnverifiedBadge from '../../../components/UnverifiedBadge'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer'
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard'
import { quoteProviderMarket } from '../../../lib/paymentQuotes'
import { useTranslation } from '../../../providers/language'
import { formatQuoteAmount } from './QuoteChoices'
import { canAdvanceRoute, type default as useSwapRouteReview } from './useSwapRouteReview'

type AssetLabel = { ticker: string; decimals: number; name?: string; assetId?: string; unverified?: boolean }

export default function SwapRouteReview({
  review,
  assetLabel,
  canStart,
  onActivity,
}: {
  review: ReturnType<typeof useSwapRouteReview>
  assetLabel: (id: AssetId) => AssetLabel
  canStart: boolean
  onActivity: () => void
}) {
  const { t, language } = useTranslation()
  const copy = useCopyToClipboard()
  const { shown, operation } = review
  const { plan, progress } = shown ?? {}
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1_000))
  useEffect(() => {
    if (!plan) return
    const tick = () => setNow(Math.floor(Date.now() / 1_000))
    tick()
    const timer = window.setInterval(tick, 1_000)
    return () => window.clearInterval(timer)
  }, [plan])
  const secondsLeft = Math.max(0, (plan?.expiresAt ?? 0) - now)
  const invoice = progress?.invoice
  const payable = invoice && now < invoice.expiresAt && secondsLeft > 0
  const first = plan?.quotes[0]
  const last = plan?.quotes.at(-1)
  const externalWait = progress?.step === 0 && first && parseAssetId(first.give.asset).rail === 'bolt11'
  const canAdvance = Boolean(plan && progress && canAdvanceRoute(plan, progress))
  const format = (leg: Quote['give']) => {
    const { ticker, decimals } = assetLabel(leg.asset)
    const amount = decimals === 0 ? leg.amount.toLocaleString(language) : formatQuoteAmount(leg.amount, decimals)
    return `${amount} ${ticker}`
  }
  const status =
    progress?.phase === 'waiting'
      ? t(externalWait && !secondsLeft ? 'swap.routeInvoiceWindowClosed' : 'swap.routeWait', {
          step: progress.step + 1,
        })
      : progress?.phase === 'ready'
        ? t(canAdvance ? 'swap.routeContinueHint' : 'swap.routeStopped')
        : progress?.phase === 'complete'
          ? t('swap.routeComplete')
          : progress?.phase === 'stopped'
            ? t(progress.reason === 'returned' ? 'swap.routeReturned' : 'swap.routeStopped')
            : undefined
  const isClosed = review.discardable

  return (
    <Drawer open={Boolean(shown)} dismissible={!review.funding} onOpenChange={(open) => !open && review.close()}>
      <DrawerContent className='swap-drawer-content'>
        <DrawerHeader>
          <DrawerTitle>{t('swap.routeReview')}</DrawerTitle>
          <DrawerDescription>{t('swap.routeReviewDescription')}</DrawerDescription>
        </DrawerHeader>
        <div className='swap-review-drawer-body space-y-3'>
          {plan && first && last ? (
            <>
              <div className='swap-review-card space-y-2' data-testid='swap-route-summary'>
                <h3 className='font-medium'>
                  {[first.give.asset, ...plan.quotes.map(({ take }) => take.asset)].map((id, index) => {
                    const label = assetLabel(id)
                    return (
                      <span key={id}>
                        {index > 0 ? ` ${t('swap.routeConnector')} ` : ''}
                        <span className='break-all' title={label.assetId}>
                          {label.name ?? label.ticker}
                        </span>
                        {label.unverified ? <UnverifiedBadge /> : null}
                      </span>
                    )
                  })}
                </h3>
                <div className='grid grid-cols-2 gap-2 text-sm'>
                  <span>{t('swap.routeGive')}</span>
                  <strong className='break-all text-right'>{format(first.give)}</strong>
                  <span>{t('swap.receive')}</span>
                  <strong className='break-all text-right'>{format(last.take)}</strong>
                </div>
              </div>
              <ol className='space-y-2' aria-label={t('swap.routeLegs')}>
                {plan.quotes.map((quote) => (
                  <li key={quote.id} className='rounded-xl bg-muted p-3 text-sm'>
                    <p className='font-medium'>
                      {format(quote.give)} {t('swap.routeConnector')} {format(quote.take)}
                    </p>
                    <p>{quoteProviderMarket(quote)?.solver ?? t('swap.smartRouting')}</p>
                    <p>
                      {t('swap.fees')} · {format(quote.fee)}
                    </p>
                    {quote.carrierSats !== undefined && quote.carrierSats > 0n ? (
                      <p>
                        {t('send.chainCarrier')} · {formatQuoteAmount(quote.carrierSats, 0)} {t('common.sats')}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
          {payable && first ? (
            <section className='space-y-2' aria-label={t('receive.lightningInvoice')}>
              <p className='font-medium'>{t('swap.routePayInvoice', { amount: format(first.give) })}</p>
              <div className='mx-auto max-w-48' data-testid='swap-route-invoice-qr'>
                <QrCode value={`lightning:${invoice.bolt11}`} />
              </div>
              <Button label={t('swap.routeCopyInvoice')} secondary onClick={() => void copy(invoice.bolt11)} />
              <p className='text-sm text-muted-foreground'>{t('swap.routeInvoiceTiming')}</p>
            </section>
          ) : null}
          {!progress && plan && !shown?.id ? (
            <p className='text-sm text-muted-foreground'>{t('swap.routeTerms')}</p>
          ) : null}
          {status ? (
            <p role='status' data-testid='swap-route-status'>
              {status}
            </p>
          ) : null}
          {!progress && operation ? <p role='status'>{t('swap.routeLoading')}</p> : null}
          {review.error || review.statusUnavailable ? (
            <p role='alert' className='text-destructive'>
              {review.error || t('swap.routeStatusUnavailable')}
            </p>
          ) : null}
        </div>
        <div className='swap-review-action'>
          {(!shown?.id || payable) && plan && secondsLeft > 0 ? (
            <p className='text-center text-xs text-muted-foreground'>
              {t('swap.offerExpiresIn', { seconds: secondsLeft })}
            </p>
          ) : null}
          {!shown?.id && plan ? (
            <Button
              label={t('swap.confirmSwap')}
              disabled={!canStart || !secondsLeft || Boolean(operation)}
              onClick={review.start}
            />
          ) : null}
          {plan && progress?.phase === 'ready' ? (
            <Button
              label={t('swap.routeContinue')}
              disabled={!canAdvance || Boolean(operation)}
              loading={operation === 'advance'}
              onClick={review.advance}
            />
          ) : null}
          {shown?.id && !operation ? (
            <Button label={t('send.viewPaymentActivity')} secondary onClick={onActivity} />
          ) : null}
          <Button
            label={t(isClosed ? 'send.paymentReceiptDone' : 'common.close')}
            clear
            disabled={review.funding}
            onClick={isClosed ? review.dismiss : review.close}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
