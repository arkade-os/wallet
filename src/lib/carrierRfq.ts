import { RestArkProvider, type IWallet } from '@arkade-os/sdk'
import { assertArkadeFundable, requestArkadeSwap, type RfqQuote, type RfqTransport } from '@arkade-os/swap'
import {
  assertCarrierRequestAllowed,
  assertReceiverPaidEchoMatchesExpected,
  carrierNow,
  encodeCarrierRequest,
  normalizeXonlyHex,
  parseCarrierEcho,
  parseTopLevelCarrierSats,
  validateReceiverPaidQuoteShape,
  type ArkadeCarrierChoice,
  type ArkadeCarrierRequest,
  type ReceiverPaidCarrierQuote,
  type TaxiIdentity,
  type VerifiedCarrierTerms,
} from './receiveCarrier'

type ArkadeSwapParams = Parameters<typeof requestArkadeSwap>[3]
type ArkadeSwapResult = Awaited<ReturnType<typeof requestArkadeSwap>>

export async function requestCarrierArkadeSwap(
  wallet: IWallet,
  arkServerUrl: string,
  transport: RfqTransport,
  params: ArkadeSwapParams & { carrier?: ArkadeCarrierChoice },
): Promise<ArkadeSwapResult & { carrier?: VerifiedCarrierTerms }> {
  const { carrier: choice, ...genericParams } = params
  const wantAsset = genericParams.wantAsset
  const offerAsset = genericParams.offerAsset
  const requestedReceiveAddress = genericParams.receiveAddress
  const requestedNow = genericParams.now
  let carrierRequest: ArkadeCarrierRequest | undefined
  let expectedReceiverPaid: ReceiverPaidCarrierQuote | undefined
  let expectedCarrierQuote: { receiveAddress: string; senderKey: string; assetId: string } | undefined
  if (choice !== undefined) {
    const mode: unknown = (choice as { mode?: unknown }).mode
    if (mode === 'purchase') {
      carrierRequest = { mode: 'purchase' }
    } else if (mode === 'recycleReceiver') {
      const quote = (choice as { quote?: ReceiverPaidCarrierQuote }).quote
      const taxi = (choice as { taxi?: TaxiIdentity }).taxi
      if (!quote || typeof quote !== 'object') {
        throw new Error('carrier receiver-paid quote is required')
      }
      if (!taxi || typeof taxi !== 'object') {
        throw new Error('carrier receiver-paid taxi identity is required')
      }
      expectedReceiverPaid = {
        quoteId: quote.quoteId,
        receiveAddress: quote.receiveAddress,
        senderKey: quote.senderKey,
        assetId: quote.assetId,
        physicalSats: quote.physicalSats,
        loanSats: quote.loanSats,
        expiresAt: quote.expiresAt,
      }
      validateReceiverPaidQuoteShape(expectedReceiverPaid)
      carrierRequest = {
        mode: 'recycle_receiver',
        quoteId: expectedReceiverPaid.quoteId,
        taxiUrl: taxi.url,
        taxiKey: taxi.operatorKey,
      }
      expectedCarrierQuote = expectedReceiverPaid
    } else {
      throw new Error('carrier request mode must be purchase or recycleReceiver')
    }
  }
  assertCarrierRequestAllowed(carrierRequest, {
    ...(wantAsset !== undefined ? { wantAsset } : {}),
    ...(offerAsset !== undefined ? { offerAsset } : {}),
  })
  const effectiveReceiveAddress =
    expectedCarrierQuote !== undefined ? expectedCarrierQuote.receiveAddress : requestedReceiveAddress
  if (
    requestedReceiveAddress !== undefined &&
    effectiveReceiveAddress !== undefined &&
    requestedReceiveAddress !== effectiveReceiveAddress
  ) {
    throw new Error('receiveAddress must match the carrier quote receiveAddress')
  }
  let verifiedCarrier: VerifiedCarrierTerms | undefined
  let carrierQuote: RfqQuote | undefined
  const carrierTransport: RfqTransport = {
    status: (rfqId) => transport.status(rfqId),
    close: () => transport.close(),
    requestQuote: async (payload) => {
      const profile = payload.profile as Record<string, unknown>
      if (expectedCarrierQuote !== undefined) {
        if (wantAsset === undefined || expectedCarrierQuote.assetId !== wantAsset.toString()) {
          throw new Error('carrier quote assetId differs from the requested wantAsset')
        }
        if (normalizeXonlyHex(profile.maker_public_key as string) !== expectedCarrierQuote.senderKey) {
          throw new Error('carrier quote senderKey differs from the wallet identity')
        }
      }
      const quote = await transport.requestQuote({
        ...payload,
        profile: {
          ...profile,
          ...(carrierRequest === undefined ? {} : { carrier: encodeCarrierRequest(carrierRequest) }),
        },
      })
      if (carrierRequest !== undefined) {
        assertArkadeFundable({
          quote,
          ...(requestedNow === undefined ? {} : { now: requestedNow }),
        })
        const echoRaw = (quote.profile as Record<string, unknown> | undefined)?.carrier
        if (echoRaw === undefined) {
          throw new Error('solver did not return carrier terms for an explicit carrier request')
        }
        const echo = parseCarrierEcho(echoRaw, {
          mode: carrierRequest.mode,
          ...(carrierRequest.mode === 'recycle_receiver'
            ? {
                quoteId: carrierRequest.quoteId,
                taxiUrl: carrierRequest.taxiUrl,
                taxiKey: carrierRequest.taxiKey,
              }
            : {}),
        })
        if (echo.mode === 'recycle_receiver') {
          if (quote.carrier_sats !== undefined) {
            throw new Error('receiver-paid quote must publish no carrier_sats')
          }
        } else {
          const topCarrier = parseTopLevelCarrierSats(quote.carrier_sats)
          if (topCarrier !== echo.physicalSats) {
            throw new Error('carrier echo physical differs from top-level carrier_sats')
          }
        }
        if (quote.valid_until > echo.expiresAt) {
          throw new Error('carrier echo expires before the quote valid_until')
        }
        const { dust } = await new RestArkProvider(arkServerUrl).getInfo()
        if (echo.physicalSats !== dust) {
          const terms = echo.mode === 'purchase' ? 'purchase' : 'receiver-paid'
          throw new Error(`carrier ${terms} physical differs from the server dust`)
        }
        if (echo.mode === 'recycle_receiver') {
          if (expectedReceiverPaid === undefined) {
            throw new Error('carrier receiver-paid request is missing its expected descriptor')
          }
          assertReceiverPaidEchoMatchesExpected(echo, expectedReceiverPaid)
        }
        const now = carrierNow(requestedNow)
        if (now >= quote.valid_until || now >= echo.expiresAt)
          throw Object.assign(new Error('carrier terms lapsed before funding'), {
            reason: 'quote_expired',
          })
        verifiedCarrier = echo
      }
      carrierQuote = quote
      return quote
    },
  }
  const swap = await requestArkadeSwap(wallet, arkServerUrl, carrierTransport, {
    ...genericParams,
    ...(effectiveReceiveAddress === undefined ? {} : { receiveAddress: effectiveReceiveAddress }),
  })
  if (verifiedCarrier !== undefined && carrierQuote !== undefined) {
    const now = carrierNow(requestedNow)
    if (now >= carrierQuote.valid_until || now >= verifiedCarrier.expiresAt) {
      throw Object.assign(new Error('carrier terms lapsed during derivation'), {
        reason: 'quote_expired',
      })
    }
  }
  return { ...swap, ...(verifiedCarrier === undefined ? {} : { carrier: verifiedCarrier }) }
}
