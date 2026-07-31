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
  const primary = amount.primary
  if (!primary) return null
  const showUnverifiedBadge = !amount.configured && amount.raw[0]?.unverified

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
      {showUnverifiedBadge ? <UnverifiedBadge /> : null}
    </section>
  )
}
