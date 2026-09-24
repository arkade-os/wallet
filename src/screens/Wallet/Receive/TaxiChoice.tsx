import { useContext, useEffect, useState } from 'react'
import type { NetworkName } from '@arkade-os/sdk'
import Button from '../../../components/Button'
import FlexCol from '../../../components/FlexCol'
import { TextSecondary } from '../../../components/Text'
import { AspContext, type AspInfo } from '../../../providers/asp'
import { centsToUnits } from '../../../lib/assets'
import type { Bip21Taxi } from '../../../lib/bip21'
import { getReceiverTaxiUrlForNetwork } from '../../../lib/constants'
import { consoleError } from '../../../lib/logs'
import {
  arkadeContextOf,
  probeOwnTaxi,
  receiverFareUnits,
  ruleFor,
  type ProbeRefusal,
  type TaxiFare,
  type TaxiProbeContext,
} from '../../../lib/receiverTaxi'

type Fare = { fare: TaxiFare; units: bigint }

type TaxiOffer =
  | { status: 'checking' }
  | { status: 'unavailable'; reason: string }
  | { status: 'available'; url: string; operatorKey: string; fares: Fare[] }

const REASONS: Record<ProbeRefusal | 'no-receiver-fare' | 'unverifiable', string> = {
  unreachable: "it can't be reached",
  'operator-key-mismatch': 'it reported inconsistent keys',
  'server-key-mismatch': 'it serves a different Arkade server',
  'emulator-key-mismatch': 'it uses a different co-signer',
  'network-mismatch': 'it serves a different network',
  paused: 'it is paused',
  'asset-not-served': "it doesn't carry this asset",
  'unsupported-unclaimed-mode': "its terms for unclaimed deliveries aren't supported",
  'recycle-not-allowed': "it doesn't let you claim by merging the delivery into a coin",
  'loan-cap-below-dust': "it won't lend enough to carry a delivery",
  'fare-unavailable': 'it offers no fare a receiver can pay',
  'no-receiver-fare': 'it offers no fare a receiver can pay',
  unverifiable: "it can't be checked against this wallet's server",
}

const checkOwnTaxi = async (
  url: string,
  aspInfo: AspInfo,
  assetId: string,
  receiverAddress: string,
): Promise<TaxiOffer> => {
  const unavailable = (reason: keyof typeof REASONS): TaxiOffer => ({ status: 'unavailable', reason: REASONS[reason] })
  let ctx: TaxiProbeContext
  try {
    ctx = {
      ...arkadeContextOf(aspInfo, () => Promise.reject(new Error('offering a Taxi reads no chain tip'))),
      assetId,
      receiverAddress,
      fetch: (input, init) => fetch(input, init),
      pageProtocol: window.location.protocol,
    }
  } catch (error) {
    consoleError(error, 'cannot check the Taxi against this wallet')
    return unavailable('unverifiable')
  }
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
  assetId: string
  receiverAddress: string
  ticker: string
  decimals?: number
  value?: Bip21Taxi
  onChange: (taxi?: Bip21Taxi) => void
}

export default function TaxiChoice({ assetId, receiverAddress, ticker, decimals, value, onChange }: TaxiChoiceProps) {
  const { aspInfo } = useContext(AspContext)
  const url = aspInfo.network ? getReceiverTaxiUrlForNetwork(aspInfo.network as NetworkName) : undefined
  const [offer, setOffer] = useState<TaxiOffer>({ status: 'checking' })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    onChange(undefined)
    if (!url) return
    let cancelled = false
    setOffer({ status: 'checking' })
    checkOwnTaxi(url, aspInfo, assetId, receiverAddress)
      .catch((error): TaxiOffer => {
        consoleError(error, 'error checking the Taxi')
        return { status: 'unavailable', reason: REASONS.unreachable }
      })
      .then((next) => {
        if (!cancelled) setOffer(next)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, aspInfo.url, aspInfo.signerPubkey, assetId, receiverAddress])

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
      {chosen ? <TextSecondary>The payer needs no carrier; you pay this fare when you claim.</TextSecondary> : null}
    </FlexCol>
  )
}
