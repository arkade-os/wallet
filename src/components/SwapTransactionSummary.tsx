import { useContext } from 'react'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { Tx } from '../lib/types'
import { isCompletedAssetPayment, swapRouteLabel, swapUnitOfAccountAmount } from '../lib/swapDisplay'
import { useTranslation } from '../providers/language'
import { PrivacyAmount } from './PrivacyAmount'
import SwapRouteIcon from './SwapRouteIcon'

interface SwapTransactionSummaryProps {
  fromIcon?: string
  toIcon?: string
  tx: Tx
}

export default function SwapTransactionSummary({ fromIcon, toIcon, tx }: SwapTransactionSummaryProps) {
  const { config } = useContext(ConfigContext)
  const { toFiatAmount } = useContext(FiatContext)
  const { t } = useTranslation()
  const swap = tx.assetSwap

  if (!swap) return null

  const amount = swapUnitOfAccountAmount({
    currency: config.currency,
    toFiatAmount,
    tx,
  })

  return (
    <section className='swap-transaction-summary' aria-labelledby='swap-transaction-title'>
      <SwapRouteIcon
        from={{ assetId: swap.fromAssetId, icon: fromIcon, ticker: swap.fromTicker }}
        size='hero'
        to={{ assetId: swap.toAssetId, icon: toIcon, ticker: swap.toTicker }}
      />
      <div className='swap-transaction-summary__identity'>
        <h2 id='swap-transaction-title'>{t(isCompletedAssetPayment(tx) ? 'send.paymentSent' : 'transaction.swap')}</h2>
        <p>{swapRouteLabel(tx)}</p>
      </div>
      {amount ? (
        <div className='swap-transaction-summary__amount'>
          <PrivacyAmount masked={amount.masked}>{amount.value}</PrivacyAmount>
        </div>
      ) : null}
    </section>
  )
}
