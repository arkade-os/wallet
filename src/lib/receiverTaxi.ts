import { EsploraProvider, type ArkInfo, type NetworkName } from '@arkade-os/sdk'
import { getRestApiExplorerURL } from './explorers'
import { arkadeContextOf as contextOf, type ArkadeContext, type ProbeRefusal } from '@arkade-taxi/client/wallet'
import { getEmulatorPubkeyForNetwork } from './constants'

export {
  boundedFetch,
  probeBitcoinTaxi,
  probeOwnTaxi,
  receiverFareUnits,
  ruleFor,
  taxiClient,
  type TaxiFare,
  type TaxiProbeContext,
} from '@arkade-taxi/client/wallet'

export const TAXI_REFUSAL_TEXT: Record<ProbeRefusal | 'no-receiver-fare' | 'unverifiable', string> = {
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
  'carrier-limits-mismatch': 'it uses different dust limits',
  'bitcoin-not-served': "it doesn't carry sub-dust bitcoin",
  'amount-outside-carrier': "it can't carry this amount",
  'loan-cap-below-shortfall': 'this amount needs a bigger top-up than it lends',
  'no-sats-fare': 'it offers no fare this payment can use',
}

export const arkadeContextOf = (
  info: Pick<ArkInfo, 'network' | 'signerPubkey' | 'dust' | 'vtxoMinAmount' | 'vtxoTreeExpiry'>,
  tipHeight: () => Promise<number>,
): ArkadeContext =>
  contextOf(info, tipHeight, getEmulatorPubkeyForNetwork(info.network as NetworkName) ?? new Uint8Array())

export const walletArkadeContext = (
  info: Pick<ArkInfo, 'network' | 'signerPubkey' | 'dust' | 'vtxoMinAmount' | 'vtxoTreeExpiry'>,
): ArkadeContext => {
  const explorer = getRestApiExplorerURL(info.network as NetworkName)
  return arkadeContextOf(info, async () => {
    if (!explorer) throw new Error(`no explorer to read the ${info.network} chain tip from`)
    return (await new EsploraProvider(explorer).getChainTip()).height
  })
}
