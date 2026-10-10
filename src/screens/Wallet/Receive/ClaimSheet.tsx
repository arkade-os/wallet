import { useContext, useEffect, useState } from 'react'
import AssetCard from '../../../components/AssetCard'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Text from '../../../components/Text'
import { accountAssetLabel, rawAssetPresentation, verifiedDesignatedCurrency } from '../../../lib/accountAssets'
import { prettyCurrencyAssetAmount, prettyNumber } from '../../../lib/format'
import { truncatedAssetId } from '../../../lib/assets'
import { consoleError } from '../../../lib/logs'
import { deliveredAssetId, receiverFareOf, type ClaimPlan, type ReceiverClaim } from '../../../lib/receiverClaims'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import type { AssetDetails } from '@arkade-os/sdk'

interface ClaimSheetProps {
  claim: ReceiverClaim
  plan?: ClaimPlan
  claiming?: boolean
  /** A claim was attempted and failed; this page cannot attempt it again. */
  spent?: boolean
  error?: string
  onClaim?: () => void
  onDismiss?: () => void
}

const sats = (value: bigint) => `${prettyNumber(Number(value))} sats`

const planLine = (plan: ClaimPlan, units: (value: bigint) => string, isAsset: boolean): string => {
  if (plan.kind === 'purchase')
    return `The sender paid for the carrier. You receive ${sats(plan.receivedSats)} with no sats needed.`
  if (plan.kind === 'recycle') {
    const coin = sats(BigInt(plan.coin.value))
    if (isAsset) {
      const retained = 'deliveredUnits' in plan ? `You receive ${units(plan.deliveredUnits)}. ` : ''
      return plan.mergedSats === BigInt(plan.coin.value)
        ? `${retained}Your sats balance stays unchanged: your ${coin} coin comes back whole.`
        : `${retained}Your ${coin} coin comes back as ${sats(plan.mergedSats)} after the fare.`
    }
    return 'feeSats' in plan
      ? `Your ${coin} coin merges with the delivery and comes back as ${sats(plan.mergedSats)}.`
      : `You keep ${units(plan.deliveredUnits)}, and your ${coin} coin comes back whole.`
  }
  return plan.reason === 'fare-exceeds-delivery'
    ? 'The fare would take the whole delivery, so it is better left to return to you.'
    : `Claiming needs a coin of at least ${sats(plan.neededSats)}, and you have none.`
}

/** What claiming a Taxi delivery costs the receiver, shown before he signs anything. */
export default function ClaimSheet({ claim, plan, claiming, spent, error, onClaim, onDismiss }: ClaimSheetProps) {
  const { assetMetadataCache, svcWallet, setCacheEntry, isVerifiedAsset } = useContext(WalletContext)
  const { aspInfo } = useContext(AspContext)
  const assetId = deliveredAssetId(claim)
  const [loadedAsset, setLoadedAsset] = useState<{ id: string; details: AssetDetails }>()
  useEffect(() => {
    if (!assetId || assetMetadataCache.get(assetId)?.metadata || !svcWallet?.assetManager) return
    let cancelled = false
    svcWallet.assetManager
      .getAssetDetails(assetId)
      .then((details) => {
        if (!cancelled && details) setLoadedAsset({ id: assetId, details: setCacheEntry(assetId, details) })
      })
      .catch((err) => consoleError(err, 'error fetching Taxi delivery asset details'))
    return () => {
      cancelled = true
    }
  }, [assetId, svcWallet])

  const descriptor = claim.claim
  const fare = receiverFareOf(claim)
  if (!descriptor) return null

  const metadata =
    (assetId && assetMetadataCache.get(assetId)?.metadata) ||
    (loadedAsset?.id === assetId ? loadedAsset?.details.metadata : undefined)
  const hasDecimals =
    metadata?.decimals !== undefined &&
    Number.isInteger(metadata.decimals) &&
    metadata.decimals >= 0 &&
    metadata.decimals <= 18
  const decimals = hasDecimals ? metadata!.decimals! : 0
  const purchase = descriptor.params.claimMode === 'purchase' || Boolean(assetId && plan?.kind === 'purchase')
  const presentation = rawAssetPresentation(metadata, assetId ? truncatedAssetId(assetId) : 'Asset')
  const ticker = hasDecimals && presentation.ticker ? presentation.ticker : 'atomic units'
  const designatedCurrency = verifiedDesignatedCurrency(aspInfo.network, assetId, isVerifiedAsset)
  const trustedTicker = assetId && hasDecimals && isVerifiedAsset(assetId) ? presentation.ticker : undefined
  const units = (value: bigint) => `${prettyCurrencyAssetAmount(value, decimals, trustedTicker)} ${ticker}`
  const { kind, value } = descriptor.recoveryLocktime
  const locktime = kind === 'height' ? `block ${value}` : new Date(Number(value) * 1000).toLocaleString()
  const delivery = assetId
    ? units(BigInt(descriptor.assetUnits ?? 0))
    : sats(
        BigInt(descriptor.params.dust) + BigInt(descriptor.params.paymentSats ?? 0) - BigInt(descriptor.params.topup),
      )

  return (
    <FlexCol gap='1rem'>
      <Text big bold>
        Claim your Taxi delivery
      </Text>
      {assetId ? (
        <AssetCard
          assetId={assetId}
          balance={BigInt(descriptor.assetUnits ?? 0)}
          decimals={decimals}
          name={accountAssetLabel(designatedCurrency, { name: presentation.name, ticker: '' })}
          ticker={ticker}
          icon={presentation.icon}
          logoTicker={designatedCurrency}
        />
      ) : (
        <Text wrap>{`${delivery} arrived through your Taxi.`}</Text>
      )}
      <Text wrap testId='claim-fare'>
        {!fare || fare.units === 0n
          ? purchase
            ? 'The sender paid the fare and carrier. You do not need sats to claim.'
            : assetId
              ? 'Taxi service fare: Free for you. The sender covers the fare.'
              : 'The sender paid the fare. Recycling repays Taxi’s loan using your own sats.'
          : fare.currency === 'sats'
            ? `Fare: ${sats(fare.units)}, paid off your own coin as it merges with this delivery.`
            : `Fare: ${units(fare.units)}, paid out of the delivery.`}
      </Text>
      {assetId && !purchase ? (
        <Text wrap small color='neutral-500' testId='claim-carrier'>
          {`Carrier repayment: ${sats(BigInt(descriptor.params.topup))} returned to Taxi when you claim. You need a sats coin to complete this.`}
        </Text>
      ) : null}
      {plan ? (
        <Text wrap small color='neutral-500' testId='claim-plan'>
          {planLine(plan, units, Boolean(assetId))}
        </Text>
      ) : null}
      {descriptor.unclaimedMode === 'reclaim' || descriptor.params.recoveryRecipient !== 'receiver' ? (
        <Text wrap small color='neutral-500' testId='unclaimed-note'>
          {descriptor.params.recoveryRecipient === 'receiver'
            ? `If you don't claim, this returns to you at ${locktime} and no fare is charged.`
            : `If you don't claim, Taxi can return this to the sender at ${locktime}.`}
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
          disabled={!plan || plan.kind === 'wait-for-reclaim' || claiming || spent}
          loading={claiming}
        />
        <Button label='Not now' onClick={() => onDismiss?.()} secondary />
      </FlexCol>
    </FlexCol>
  )
}
