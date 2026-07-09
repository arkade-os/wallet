import {
  MnemonicIdentity,
  DefaultVtxo,
  DelegateVtxo,
  getNetwork,
  RestDelegateProvider,
  type NetworkName,
  type RelativeTimelock,
} from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { AspInfo } from '../providers/asp'
import { getDelegateUrlForNetwork } from './constants'
import { Network } from '@arkade-os/boltz-swap'

/**
 * Computes the offchain (Ark) address a NEW wallet identity will use, without
 * switching the active service-worker wallet. Mirrors the SDK's wallet setup
 * exactly (chunk setupWalletConfig): BIP86 index-0 x-only key + server signer
 * key + unilateral-exit timelock — and, when the app runs with a delegate,
 * the DelegateVtxo script (the delegate changes the taproot key, hence the
 * address). Used by the seed→passkey migration to know where to send funds
 * before the new wallet ever boots.
 */
export const computeNewWalletAddress = async (
  mnemonic: string,
  aspInfo: AspInfo,
  delegateEnabled: boolean,
): Promise<string> => {
  if (!aspInfo.signerPubkey || aspInfo.unreachable) throw new Error('Ark server info unavailable')

  const mainnet = isMainnet(aspInfo.network)
  const identity = MnemonicIdentity.fromMnemonic(mnemonic, { isMainnet: mainnet })
  const pubKey = await identity.xOnlyPublicKey()
  const serverPubKey = hex.decode(aspInfo.signerPubkey).slice(1)

  const delay = aspInfo.unilateralExitDelay
  const csvTimelock: RelativeTimelock = { value: delay, type: delay < BigInt(512) ? 'blocks' : 'seconds' }

  // delegate mode changes the address: mirror the SDK's best-effort fetch
  const delegateUrl = delegateEnabled ? getDelegateUrlForNetwork(aspInfo.network as Network) : undefined
  const delegatePubKey = delegateUrl
    ? await new RestDelegateProvider(delegateUrl)
        .getDelegateInfo()
        .then((info) => hex.decode(info.pubkey).slice(1))
        .catch(() => undefined)
    : undefined

  const script = delegatePubKey
    ? new DelegateVtxo.Script({ pubKey, serverPubKey, delegatePubKey, csvTimelock })
    : new DefaultVtxo.Script({ pubKey, serverPubKey, csvTimelock })

  return script.address(getNetwork(aspInfo.network as NetworkName).hrp, serverPubKey).encode()
}

// same predicate as initWallet (src/providers/wallet.tsx)
const isMainnet = (network: string): boolean =>
  network !== 'testnet' && network !== 'mutinynet' && network !== 'signet' && network !== 'regtest'
