import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Text from '../../../components/Text'
import { centsToUnits } from '../../../lib/assets'
import { prettyNumber } from '../../../lib/format'
import { receiverFareOf, type ClaimPlan, type ReceiverClaim } from '../../../lib/receiverClaims'

interface ClaimSheetProps {
  claim: ReceiverClaim
  plan?: ClaimPlan
  asset?: { ticker: string; decimals?: number }
  claiming?: boolean
  /** A claim was attempted and failed; this page cannot attempt it again. */
  spent?: boolean
  error?: string
  onClaim?: () => void
  onDismiss?: () => void
}

const sats = (value: bigint) => `${prettyNumber(Number(value))} sats`

const planLine = (plan: ClaimPlan, units: (value: bigint) => string): string => {
  if (plan.kind === 'recycle') {
    const coin = sats(BigInt(plan.coin.value))
    return 'feeSats' in plan
      ? `Your ${coin} coin merges with the delivery and comes back as ${sats(plan.mergedSats)}.`
      : `You keep ${units(plan.deliveredUnits)}, and your ${coin} coin comes back whole.`
  }
  return plan.reason === 'fare-exceeds-delivery'
    ? 'The fare would take the whole delivery, so it is better left to return to you.'
    : `Claiming needs a coin of at least ${sats(plan.neededSats)}, and you have none.`
}

/** What claiming a Taxi delivery costs the receiver, shown before he signs anything. */
export default function ClaimSheet({
  claim,
  plan,
  asset,
  claiming,
  spent,
  error,
  onClaim,
  onDismiss,
}: ClaimSheetProps) {
  const descriptor = claim.claim
  const fare = receiverFareOf(claim)
  if (!descriptor || !fare) return null

  const units = (value: bigint) => `${centsToUnits(value, asset?.decimals ?? 0)} ${asset?.ticker || 'units'}`
  const { kind, value } = descriptor.recoveryLocktime
  const locktime = kind === 'height' ? `block ${value}` : new Date(Number(value) * 1000).toLocaleString()

  return (
    <FlexCol gap='1rem'>
      <Text big bold>
        Claim your Taxi delivery
      </Text>
      <Text wrap>{`${units(BigInt(descriptor.assetUnits ?? 0))} arrived through your Taxi.`}</Text>
      <Text wrap testId='claim-fare'>
        {fare.currency === 'sats'
          ? `Fare: ${sats(fare.units)}, paid off your own coin as it merges with this delivery.`
          : `Fare: ${units(fare.units)}, paid out of the delivery.`}
      </Text>
      {plan ? (
        <Text wrap small color='neutral-500' testId='claim-plan'>
          {planLine(plan, units)}
        </Text>
      ) : null}
      {descriptor.unclaimedMode === 'reclaim' ? (
        <Text wrap small color='neutral-500' testId='unclaimed-note'>
          {`If you don't claim, this returns to you at ${locktime} and no fare is charged.`}
        </Text>
      ) : null}
      {error ? <ErrorMessage error text={error} /> : null}
      {spent ? (
        <Text wrap small testId='claim-spent'>
          This claim was already attempted. Reload the wallet to retry.
        </Text>
      ) : null}
      <FlexCol gap='0.5rem'>
        <Button
          label='Claim'
          onClick={() => onClaim?.()}
          disabled={plan?.kind !== 'recycle' || claiming || spent}
          loading={claiming}
        />
        <Button label='Not now' onClick={() => onDismiss?.()} secondary />
      </FlexCol>
    </FlexCol>
  )
}
