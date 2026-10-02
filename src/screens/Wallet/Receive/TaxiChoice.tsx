import { useContext, useEffect, useState } from 'react'
import { ArkAddress, type IWallet, type NetworkName } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import Button from '../../../components/Button'
import FlexCol from '../../../components/FlexCol'
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
  probeBitcoinTaxi,
  probeOwnTaxi,
  receiverFareUnits,
  ruleFor,
  TAXI_REFUSAL_TEXT,
  type TaxiFare,
  type TaxiProbeContext,
} from '../../../lib/receiverTaxi'

type Fare = { fare: TaxiFare; units: bigint }

type TaxiOffer =
  | { status: 'checking' }
  | { status: 'unavailable'; reason: string }
  | { status: 'available'; url: string; operatorKey: string; fares: Fare[]; topup?: bigint; claimCoin?: boolean }

/** Whether a recycle claim finds a coin to merge, as planReceiverClaim picks it: here, covering the top-up. */
const holdsClaimCoin = async (wallet: Pick<IWallet, 'getSpendableVtxos'>, receiverAddress: string, topup: bigint) => {
  const script = hex.encode(ArkAddress.decode(receiverAddress).pkScript)
  const coins = await unreservedCoins(wallet, assetSwapRepository)
  return coins.some((coin) => coin.script === script && BigInt(coin.value) >= topup)
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
      fetch: (input, init) => fetch(input, init),
      pageProtocol: window.location.protocol,
    }
  } catch (error) {
    consoleError(error, 'cannot check the Taxi against this wallet')
    return unavailable('unverifiable')
  }
  if (!assetId) {
    const vet = await probeBitcoinTaxi({ url }, base, receiverAddress, BigInt(satoshis))
    if (!vet.ok) return unavailable(vet.reason)
    const claimCoin = wallet
      ? await holdsClaimCoin(wallet, receiverAddress, vet.topup).catch((error) => {
          consoleError(error, 'cannot read the coins a Taxi claim would use')
          return undefined
        })
      : undefined
    return {
      status: 'available',
      url,
      operatorKey: vet.info.operatorKey,
      fares: vet.fares,
      topup: vet.topup,
      claimCoin,
    }
  }
  const ctx = { ...base, assetId }
  const probe = await probeOwnTaxi(url, ctx)
  if (!probe.ok) return unavailable(probe.reason)
  const fares = (ruleFor(probe.info, assetId)?.fares ?? []).flatMap((fare) => {
    const units = receiverFareUnits(fare, ctx.dust)
    return units === undefined ? [] : [{ fare, units }]
  })
  if (fares.length === 0) return unavailable('no-receiver-fare')
  return { status: 'available', url, operatorKey: probe.info.operatorKey, fares }
}

const fareLabel = ({ fare, units }: Fare, assetUnits: (units: bigint) => string): string =>
  `${fare.id} · ${fare.currency === 'sats' ? `${units} sats` : assetUnits(units)}`

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
  const [open, setOpen] = useState(false)

  useEffect(() => {
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
        if (!cancelled) setOffer(next)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, aspInfo.url, aspInfo.signerPubkey, assetId, satoshis, receiverAddress, svcWallet])

  if (!url || offer.status === 'checking') return null
  if (offer.status === 'unavailable') return <TextSecondary>{`Taxi unavailable: ${offer.reason}`}</TextSecondary>

  const assetUnits = (units: bigint) => `${centsToUnits(units, decimals)} ${ticker}`
  const chosen = offer.fares.find(({ fare }) => fare.id === value?.fareId)
  const choose = (fare?: Fare) => {
    onChange(fare && { url: offer.url, operatorKey: offer.operatorKey, fareId: fare.fare.id })
    setOpen(false)
  }
  const optionClass = 'rounded-md px-3 py-2 text-left aria-selected:bg-neutral-100 dark:aria-selected:bg-neutral-800'

  return (
    <FlexCol gap='0.25rem'>
      <Button
        secondary
        label={`Taxi: ${chosen ? fareLabel(chosen, assetUnits) : 'off'}`}
        onClick={() => setOpen(!open)}
      />
      {open ? (
        <div role='listbox' aria-label='Taxi fare' className='flex flex-col gap-1'>
          <button type='button' role='option' aria-selected={!chosen} className={optionClass} onClick={() => choose()}>
            No Taxi
          </button>
          {offer.fares.map((fare) => (
            <button
              key={fare.fare.id}
              type='button'
              role='option'
              aria-selected={chosen?.fare.id === fare.fare.id}
              className={optionClass}
              onClick={() => choose(fare)}
            >
              {fareLabel(fare, assetUnits)}
            </button>
          ))}
        </div>
      ) : null}
      {chosen ? (
        <TextSecondary>
          {offer.topup === undefined
            ? 'The payer needs no carrier; you pay this fare when you claim.'
            : `The payer pays this fare, and it arrives as a full ${aspInfo.dust}-sat coin. ` +
              (offer.claimCoin === false
                ? `Claiming may need a coin of at least ${offer.topup} sats of your own, and you have none; if you can't claim it, it can go back to the payer.`
                : `Claiming may use ${offer.topup} sats of your own.`)}
        </TextSecondary>
      ) : null}
    </FlexCol>
  )
}
