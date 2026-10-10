import { verifyReceiveQuote } from '@arkade-taxi/client'
import {
  taxiClient,
  taxiAssetId,
  type Bip21Taxi,
  type TaxiInfo,
  type TaxiProbeContext,
  type LocktimeDomain,
} from '@arkade-taxi/client/wallet'
import type { ArkadeCarrierChoice } from './receiveCarrier'
export interface ReceiverPaidCarrier {
  choice: Extract<ArkadeCarrierChoice, { mode: 'recycleReceiver' }>
  inputExpiryFloor: { kind: LocktimeDomain; value: bigint }
}
export const receiverPaidCarrier = async (
  taxi: Bip21Taxi,
  info: TaxiInfo,
  ctx: TaxiProbeContext,
  payer: {
    senderKey: Uint8Array

    fundingExpiry: bigint

    minimum: bigint
  },
): Promise<ReceiverPaidCarrier> => {
  if (taxi.payer === 'sender') throw new Error('This request requires sender-covered delivery')
  const { senderKey } = payer
  const assetId = taxiAssetId(ctx.assetId)
  const fare = taxi.fareId ? { fareId: taxi.fareId } : {}
  const fundingExpiry = { kind: ctx.locktimeDomain, value: payer.fundingExpiry }
  const minimum = { kind: ctx.locktimeDomain, value: payer.minimum }
  const quote = await taxiClient(taxi.url, ctx.fetch).requestReceiveQuote({
    receiverAddress: ctx.receiverAddress,
    senderKey,
    assetId,
    payer: 'receiver',
    fundingExpiry,
    ...fare,
  })
  const verified = verifyReceiveQuote({
    quote,
    info,
    trustedServerKey: ctx.serverKey,
    trustedEmulatorKey: ctx.emulatorKey,
    dust: ctx.dust,
    vtxoMinAmount: ctx.vtxoMinAmount,
    hrp: ctx.hrp,
    expect: {
      receiverAddress: ctx.receiverAddress,
      senderKey,
      assetId,
      payer: 'receiver',
      fundingExpiry,
      ...fare,
      maxServiceFareSats: 0n,
      minRecoveryLocktime: minimum,
      minInputExpiryFloor: minimum,
    },
  })
  const { quoteId, receiveAddress, assetId: sdkAssetId, physicalSats, loanSats, expiresAt } = verified.descriptor
  const floor = verified.quote.inputExpiryFloor
  return {
    choice: {
      mode: 'recycleReceiver',
      quote: {
        quoteId,
        receiveAddress,
        senderKey: verified.descriptor.senderKey,
        assetId: sdkAssetId,
        physicalSats,
        loanSats,
        expiresAt,
      },
      taxi: { url: taxi.url, operatorKey: info.operatorKey },
    },
    inputExpiryFloor: { kind: floor.kind, value: BigInt(floor.value) },
  }
}
