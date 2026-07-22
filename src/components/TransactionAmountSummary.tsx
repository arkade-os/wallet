import type { TransactionAmountDisplay } from '../lib/transactionAmountDisplay'
import { PrivacyAmount } from './PrivacyAmount'
import UnverifiedBadge from './UnverifiedBadge'

export default function TransactionAmountSummary({
  amount,
  label,
}: {
  amount: TransactionAmountDisplay
  label: string
}) {
  const primary = amount.configured ?? amount.raw[0]
  const rawPrimary = amount.configured ? undefined : amount.raw[0]
  if (!primary) return null

  return (
    <section className='transaction-amount-summary' aria-label={label}>
      <span className='transaction-amount-summary__label'>{label}</span>
      <PrivacyAmount
        className='transaction-amount-summary__value text-heading-xl'
        masked={primary.masked}
        testId='primary-amount'
      >
        {primary.value}
      </PrivacyAmount>
      {rawPrimary?.assetId && !rawPrimary.trusted ? <UnverifiedBadge /> : null}
    </section>
  )
}
