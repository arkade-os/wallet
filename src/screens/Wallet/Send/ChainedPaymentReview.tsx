import { useContext } from 'react'
import type { Quote } from '@arkade-os/swap'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import UnverifiedBadge from '../../../components/UnverifiedBadge'
import { rawAssetPresentation } from '../../../lib/accountAssets'
import { isValidAssetId, prettyAssetAmount, prettyAssetAmountHide } from '../../../lib/assets'
import { quoteProviderMarket } from '../../../lib/paymentQuotes'
import { ConfigContext } from '../../../providers/config'
import { useTranslation } from '../../../providers/language'
import { WalletContext } from '../../../providers/wallet'
import type useChainedPaymentReview from './useChainedPaymentReview'

export default function ChainedPaymentReview({
  chain,
  lightning,
  providerName,
  canChangeSource,
}: {
  chain: ReturnType<typeof useChainedPaymentReview>
  lightning: Quote | undefined
  providerName: string | undefined
  canChangeSource: boolean
}) {
  const { t, language } = useTranslation()
  const { config } = useContext(ConfigContext)
  const { availableAssetBalances, assetMetadataCache, isVerifiedAsset, availableBalance } = useContext(WalletContext)
  const choices = availableAssetBalances
    .filter(({ assetId, amount }) => amount > 0n && isValidAssetId(assetId))
    .map(({ assetId, amount }) => {
      const metadata = assetMetadataCache.get(assetId)?.metadata
      const { name, ticker } = rawAssetPresentation(metadata, t('send.unknownAsset'))
      return { assetId, amount, ticker: ticker || name, decimals: metadata?.decimals ?? 0 }
    })
  const selected = choices.find(({ assetId }) => assetId === chain.selectedId)
  const conversion = chain.conversion
  const carrier = conversion?.carrierSats
  const sats = (amount: bigint) =>
    config.showBalance
      ? `${amount.toLocaleString(language)} ${t('common.sats')}`
      : prettyAssetAmountHide(amount, t('common.sats'))
  const assetAmount = (amount: bigint, decimals: number, ticker = '') =>
    config.showBalance
      ? [prettyAssetAmount(amount, decimals), ticker].filter(Boolean).join(' ')
      : prettyAssetAmountHide(amount, ticker)
  const status = chain.status
  const showProgress = chain.busy || chain.awaitingFill || Boolean(status)
  const allowSelection = Boolean(lightning && !chain.busy && !chain.awaitingFill && chain.canPick)

  return (
    <>
      {showProgress ? (
        <div className='rounded-xl bg-muted px-3 py-2.5 text-sm' role='status' data-testid='chained-payment-status'>
          {chain.busy
            ? t('send.chainSubmitting')
            : status?.phase === 'credited'
              ? t(chain.awaitingFill ? 'send.chainWaitingForBtc' : 'send.chainCredited', { amount: sats(status.sats) })
              : status?.phase === 'returned'
                ? t('send.chainReturned')
                : status?.phase === 'recovery'
                  ? t('send.chainRecovery')
                  : t('send.chainConverting')}
        </div>
      ) : null}
      {chain.startFailure && allowSelection ? (
        <ErrorMessage error text={chain.startFailure.message ?? t('send.chainStartFailed')} />
      ) : null}
      {chain.choosing && allowSelection ? (
        <section className='space-y-2.5' aria-label={t('send.chainChooseAsset')}>
          <h2 className='text-sm font-semibold'>{t('send.chainChooseAsset')}</h2>
          <div className='settings-row-group'>
            {choices.map(({ assetId, amount, ticker, decimals }) => (
              <button
                key={assetId}
                type='button'
                className='settings-row'
                aria-pressed={assetId === chain.selectedId}
                data-testid={`chain-payment-asset-${assetId}`}
                onClick={() => chain.select(assetId)}
              >
                <span className='min-w-0'>
                  <span className='break-all font-medium'>{ticker}</span>
                  {!isVerifiedAsset(assetId) ? <UnverifiedBadge /> : null}
                  <span className='block break-all text-xs text-muted-foreground'>{assetId}</span>
                </span>
                <span className='shrink-0 pl-1 text-right'>{assetAmount(amount, decimals)}</span>
              </button>
            ))}
          </div>
          {selected && !conversion && !chain.quoteFailed && lightning ? (
            <p role='status' className='text-sm text-muted-foreground'>
              {t('send.gettingQuote')}
            </p>
          ) : null}
          {chain.quoteFailed ? <ErrorMessage error text={t('send.chainQuoteUnavailable')} /> : null}
          {chain.expired ? <ErrorMessage error text={t('swap.offerExpired')} /> : null}
          {conversion && carrier !== undefined && lightning && selected ? (
            <div className='space-y-2 rounded-xl bg-muted px-3 py-2.5 text-sm' data-testid='chained-payment-quote'>
              <dl className='grid grid-cols-2 gap-x-3 gap-y-1.5'>
                <dt>{t('send.chainAssetDebit')}</dt>
                <dd className='text-right break-words'>
                  {assetAmount(conversion.give.amount, selected.decimals, selected.ticker)}
                </dd>
                <dt>{t('send.chainCarrier')}</dt>
                <dd className='text-right'>{sats(carrier)}</dd>
                <dt>{t('send.chainConversionProvider')}</dt>
                <dd className='text-right break-words'>
                  {quoteProviderMarket(conversion)?.solver ?? t('send.automaticProvider')}
                </dd>
                <dt>{t('send.chainBridgeAmount')}</dt>
                <dd className='text-right'>{sats(conversion.take.amount)}</dd>
                <dt>{t('send.chainLightningProvider')}</dt>
                <dd className='text-right break-all'>
                  {providerName ?? quoteProviderMarket(lightning)?.solver ?? t('send.automaticProvider')}
                </dd>
                {lightning.fee.asset === lightning.give.asset ? (
                  <>
                    <dt>{t('send.chainLightningFee')}</dt>
                    <dd className='text-right'>{sats(lightning.fee.amount)}</dd>
                  </>
                ) : null}
              </dl>
              <p className='text-xs text-muted-foreground'>{t('send.chainPaymentTerms')}</p>
              {conversion.give.amount > selected.amount ? (
                <p className='text-xs text-muted-foreground'>{t('send.insufficientAssetBalance')}</p>
              ) : null}
              {carrier > BigInt(availableBalance) ? (
                <p className='text-xs text-muted-foreground'>{t('send.chainCarrierUnavailable')}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
      {!chain.choosing && allowSelection && canChangeSource && choices.length > 0 ? (
        <Button label={t('send.chainPayWithAsset')} secondary onClick={() => chain.select()} />
      ) : null}
    </>
  )
}
