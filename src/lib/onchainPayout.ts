/**
 * The wallet's Bitcoin-L1 side of an onchain send: which key claims the HTLC,
 * where the claim pays, and whether this deployment can do either at all.
 *
 * The key is the wallet's own identity key rather than a fresh one. That is
 * the same choice `provisionRefundKey` makes in the SDK, for the same reason:
 * it re-derives from the seed with nothing stored, so a swap survives a
 * restart, a reinstall, or a restore onto another device — and this corridor's
 * claim is the one that cannot simply be waited out. A per-swap key would have
 * to be persisted before funding and would be lost with the record.
 */
import * as btc from '@scure/btc-signer'
import type { IWallet, NetworkName } from '@arkade-os/sdk'
import type { OnchainNetwork } from '@arkade-os/swap'
import { getRestApiExplorerURL } from './explorers'

const NETWORKS: Record<OnchainNetwork, typeof btc.NETWORK> = {
  bitcoin: btc.NETWORK,
  testnet: btc.TEST_NETWORK,
  regtest: { bech32: 'bcrt', pubKeyHash: 0x6f, scriptHash: 0xc4, wif: 0xef },
}

/**
 * The Arkade network name mapped onto a Bitcoin one, mirroring the private
 * narrowing `requestOnchainSend` applies (`l1NetworkFromArk`): signet,
 * mutinynet and testnet4 all settle on the same L1 rules as testnet.
 *
 * Duplicated rather than imported because the SDK does not export it, and only
 * used to build the chain source — every stored swap carries the SDK's own
 * answer in `profile.network`, which is what the claim re-derives from.
 */
export const l1NetworkOf = (network: NetworkName | string): OnchainNetwork =>
  network === 'bitcoin' ? 'bitcoin' : network === 'regtest' ? 'regtest' : 'testnet'

/** The P2TR script an L1 claim pays to, for an x-only key this wallet holds. */
export const l1PayoutScript = (xOnlyPubkey: Uint8Array, network: OnchainNetwork): Uint8Array =>
  btc.p2tr(xOnlyPubkey, undefined, NETWORKS[network]).script

/** The x-only key bound into the HTLC's claim leaf. Identity, so it is the
 * same key at claim time without anything having been written down. */
export const l1PayoutPubkey = (wallet: IWallet): Promise<Uint8Array> => wallet.identity.xOnlyPublicKey()

/**
 * Whether this wallet can complete an onchain send at all.
 *
 * The gate exists because funding is irreversible and one-sided: the solver
 * fills an L1 HTLC that only this wallet can open, before a deadline, and a
 * wallet with no way to watch or broadcast on L1 would fund it and then sit
 * there. Falling back to a collaborative exit is strictly better than that, so
 * a network with no esplora endpoint configured simply has no solver route.
 *
 * Returns the endpoint so the caller does not look it up twice.
 */
export const onchainClaimEndpoint = (network: NetworkName): string | undefined => getRestApiExplorerURL(network)
