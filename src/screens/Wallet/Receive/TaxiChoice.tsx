import { useContext, useEffect, useRef, useState } from 'react'
import { ArkAddress, type IWallet, type NetworkName } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import TaxiDeliveryOptions from '../../../components/TaxiDeliveryOptions'
import { TextSecondary } from '../../../components/Text'
import { AspContext, type AspInfo } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { centsToUnits } from '../../../lib/assets'
import type { Bip21Taxi } from '../../../lib/bip21'
import { getReceiverTaxiUrlForNetwork } from '../../../lib/constants'
import { consoleError } from '../../../lib/logs'
import { assetSwapRepository, unreservedCoins } from '../../../lib/swapRepository'
import {
  arkadeContextOf,
  boundedFetch,
  probeBitcoinTaxi,
  probeOwnTaxi,
  receiverFareUnits,
  ruleFor,
  TAXI_REFUSAL_TEXT,
  type TaxiFare,
  type TaxiProbeContext,
} from '../../../lib/receiverTaxi'

type Fare = { fare: TaxiFare; units: bigint; claimCoin?: boolean }

type TaxiOffer =
  | { status: 'checking' }
  | { status: 'unavailable'; reason: string }
  | { status: 'available'; url: string; operatorKey: string; fares: Fare[]; topup?: bigint }

/** Whether a recycle claim finds a coin to merge, as planReceiverClaim picks it: one of at least `needed` sats. */
const holdsClaimCoin = async (wallet: Pick<IWallet, 'getSpendableVtxos'>, receiverAddress: string, needed: bigint) => {
  const script = hex.encode(ArkAddress.decode(receiverAddress).pkScript)
  const coins = await unreservedCoins(wallet, assetSwapRepository)
  return coins.some((coin) => coin.script === script && BigInt(coin.value) >= needed)
}

const checkOwnTaxi = async (
  url: string,
  aspInfo: AspInfo,
  assetId: string | undefined,
  receiverAddress: string,
  satoshis = 0,
  wallet?: Pick<IWallet, 'getSpendableVtxos'>,
): Promise<TaxiOffer> => {
  const unavailable = (reason: keyof typeof TAXI_REFUSAL_TEXT): TaxiOffer => ({
    status: 'unavailable',
    reason: TAXI_REFUSAL_TEXT[reason],
  })
  let base: Omit<TaxiProbeContext, 'assetId'>
  try {
    base = {
      ...arkadeContextOf(aspInfo, () => Promise.reject(new Error('offering a Taxi reads no chain tip'))),
      receiverAddress,
      fetch: boundedFetch,
      pageProtocol: window.location.protocol,
    }
  } catch (error) {
    consoleError(error, 'cannot check the Taxi against this wallet')
    return unavailable('unverifiable')
  }
  if (!assetId) {
    const amount = satoshis > 0 ? BigInt(satoshis) : base.vtxoMinAmount
    const vet = await probeBitcoinTaxi({ url }, base, receiverAddress, amount)
    if (!vet.ok) return unavailable(vet.reason)
    if (!vet.modes.includes('recycle')) return unavailable('recycle-not-allowed')
    const claimCoin = wallet
      ? await holdsClaimCoin(wallet, receiverAddress, base.dust - amount).catch((error) => {
          consoleError(error, 'cannot read the coins a Taxi claim would use')
          return undefined
        })
      : undefined
    return {
      status: 'available',
      url,
      operatorKey: vet.info.operatorKey,
      fares: vet.fares.map((fare) => ({ ...fare, claimCoin })),
      topup: vet.topup,
    }
  }
  const ctx = { ...base, assetId }
  const probe = await probeOwnTaxi(url, ctx)
  if (!probe.ok) return unavailable(probe.reason)
  const rule = ruleFor(probe.info, assetId)
  const fares = (rule?.claim === 'purchase' ? [] : (rule?.fares ?? [])).flatMap((fare) => {
    const units = receiverFareUnits(fare, ctx.dust)
    return units === undefined ? [] : [{ fare, units }]
  })
  if (fares.length === 0 && !rule?.fares.some((fare) => fare.currency === 'sameAsset'))
    return unavailable('no-receiver-fare')
  const checkedFares = await Promise.all(
    fares.map(async (fare) => ({
      ...fare,
      claimCoin: wallet
        ? await holdsClaimCoin(
            wallet,
            receiverAddress,
            base.dust + (fare.fare.currency === 'sats' ? fare.units : 0n),
          ).catch(() => undefined)
        : undefined,
    })),
  )
  return { status: 'available', url, operatorKey: probe.info.operatorKey, fares: checkedFares }
}

const fareLabel = ({ fare, units }: Fare, assetUnits: (units: bigint) => string): string =>
  units === 0n ? 'Free' : fare.currency === 'sats' ? `${units} sats` : assetUnits(units)

interface TaxiChoiceProps {
  /** Absent for a sub-dust bitcoin request of `satoshis`. */
  assetId?: string
  satoshis?: number
  receiverAddress: string
  ticker?: string
  decimals?: number
  value?: Bip21Taxi
  onChange: (taxi?: Bip21Taxi) => void
}

export default function TaxiChoice({
  assetId,
  satoshis,
  receiverAddress,
  ticker,
  decimals,
  value,
  onChange,
}: TaxiChoiceProps) {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  const url = aspInfo.network ? getReceiverTaxiUrlForNetwork(aspInfo.network as NetworkName) : undefined
  const [offer, setOffer] = useState<TaxiOffer>({ status: 'checking' })
  const userChoice = useRef(false)

  useEffect(() => {
    userChoice.current = false
    onChange(undefined)
    if (!url) return
    let cancelled = false
    setOffer({ status: 'checking' })
    checkOwnTaxi(url, aspInfo, assetId, receiverAddress, satoshis, svcWallet)
      .catch((error): TaxiOffer => {
        consoleError(error, 'error checking the Taxi')
        return { status: 'unavailable', reason: TAXI_REFUSAL_TEXT.unreachable }
      })
      .then((next) => {
        if (cancelled) return
        setOffer(next)
        if (!assetId && next.status === 'available' && !userChoice.current) {
          const fare = next.fares.find(({ units }) => units === 0n) ?? next.fares[0]
          onChange(
            fare.claimCoin !== true
              ? { url: next.url, operatorKey: next.operatorKey, payer: 'sender' }
              : {
                  url: next.url,
                  operatorKey: next.operatorKey,
                  ...(next.fares.length === 1 && fare.units === 0n ? {} : { fareId: fare.fare.id }),
                  payer: 'receiver',
                },
          )
        }
      })
    return () => {
      cancelled = true
    }
    // Not svcWallet: the service worker's self-heal replaces it, and re-running would drop her chosen Taxi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, aspInfo.url, aspInfo.signerPubkey, assetId, satoshis, receiverAddress])

  if (!url || offer.status === 'checking') return null
  if (offer.status === 'unavailable') return <TextSecondary>{`Taxi unavailable: ${offer.reason}`}</TextSecondary>

  const assetUnits = (units: bigint) => `${centsToUnits(units, decimals)} ${ticker}`
  const chosen =
    value && value.payer !== 'sender'
      ? value.fareId
        ? offer.fares.find(({ fare }) => fare.id === value.fareId)
        : offer.fares.length === 1
          ? offer.fares[0]
          : undefined
      : undefined
  const choose = (fareId: string) => {
    userChoice.current = true
    const fare = offer.fares.find(({ fare }) => `receiver:${fare.id}` === fareId)
    onChange(
      fareId === 'sender'
        ? { url: offer.url, operatorKey: offer.operatorKey, payer: 'sender' }
        : fare && {
            url: offer.url,
            operatorKey: offer.operatorKey,
            ...(offer.fares.length === 1 && fare.units === 0n ? {} : { fareId: fare.fare.id }),
            payer: 'receiver',
          },
    )
  }
  const description =
    !assetId && !satoshis && value
      ? value.payer === 'sender'
        ? 'The sender covers any carrier. Exact sub-dust delivery is unavailable without sats of your own; request at least the dust amount.'
        : 'The sender chooses the amount. Taxi is used only below the dust amount; you use your own sats to repay its carrier when claiming.'
      : value?.payer === 'sender'
        ? assetId
          ? 'The sender provides the carrier. You receive the asset without using sats from your wallet.'
          : 'Sender-covered delivery cannot preserve this exact sub-dust amount. You need your own sats to claim it, or request at least the dust amount.'
        : chosen
          ? offer.topup === undefined
            ? chosen.units === 0n
              ? 'The payer needs no carrier. Taxi has no service fee; you use your own sats to claim the delivery.'
              : 'The payer needs no carrier. You pay the service fee when you claim the delivery.'
            : `Taxi adds ${offer.topup} sats to deliver a full ${Number(offer.topup) + satoshis!}-sat coin. To claim your ${satoshis} sats, use a coin of at least ${Number(aspInfo.dust) - satoshis!} sats from your wallet to repay Taxi. This is not a service fee.` +
              (chosen.claimCoin === false
                ? ' You do not currently have a compatible coin to claim it. If unclaimed, the payment can return to the payer.'
                : '')
          : assetId
            ? 'The payer must provide the sats needed to carry this asset.'
            : !satoshis
              ? 'Taxi is off. Sub-dust payments cannot be spent directly.'
              : 'Without Taxi, this amount arrives as a sub-dust coin and cannot be spent directly.'

  return (
    <TaxiDeliveryOptions
      value={value?.payer === 'sender' ? 'sender' : chosen ? `receiver:${chosen.fare.id}` : 'none'}
      onChange={choose}
      description={description}
      options={[
        {
          value: 'none',
          label: 'No Taxi',
          description: assetId
            ? 'The payer provides the carrier sats.'
            : 'Receive a sub-dust coin that cannot be spent directly.',
        },
        {
          value: 'sender',
          label: 'Sender covers carrier',
          description: assetId
            ? 'Receive without using your own sats.'
            : 'Unavailable for an exact sub-dust payment; request at least the dust amount.',
        },
        ...offer.fares.map((fare) => ({
          value: `receiver:${fare.fare.id}`,
          label: offer.fares.length === 1 ? 'I have sats' : `I have sats · ${fareLabel(fare, assetUnits)}`,
          cost: fareLabel(fare, assetUnits),
          disabled: fare.claimCoin === false,
          description:
            fare.claimCoin === false
              ? 'You do not currently have a compatible coin to repay Taxi.'
              : offer.topup === undefined
                ? 'Claim the asset delivery using sats from your wallet.'
                : 'Claim your payment using sats from your wallet to repay Taxi.',
        })),
      ]}
    />
  )
}
