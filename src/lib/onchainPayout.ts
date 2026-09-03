/**
 * The wallet's Bitcoin-L1 side of an onchain send: which key claims the HTLC,
 * where the claim pays, and whether this deployment can do either at all.
 *
 * **Two different things, and conflating them misdirects the payment.** The
 * HTLC's claim leaf binds a KEY, and only this wallet can hold it — the
 * recipient cannot sign for us, and an address is not a key in any case. The
 * claim transaction's OUTPUT is a separate choice made by whoever spends, and
 * that is where the recipient's address belongs. Pay the claim to the key's own
 * address and the corridor stops being a payment: the sats land back in this
 * wallet, on L1, while the screen says the recipient was paid.
 *
 * The key is the wallet's own identity key rather than a fresh one. That is
 * the same choice `provisionRefundKey` makes in the SDK, for the same reason:
 * it re-derives from the seed with nothing stored, so a swap survives a
 * restart, a reinstall, or a restore onto another device — and this corridor's
 * claim is the one that cannot simply be waited out. A per-swap key would have
 * to be persisted before funding and would be lost with the record.
 */
import * as btc from '@scure/btc-signer'
import { hex } from '@scure/base'
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

/**
 * The output script for an L1 address — **where the claim actually pays.**
 *
 * The recipient's address, resolved once at quote time and carried on the
 * record, because the claim can happen days later in another process and the
 * send flow's state is long gone by then. Throws on an address this network
 * cannot spend to, which is a reason to exit collaboratively rather than an
 * error: the send itself is perfectly possible, just not through a solver.
 */
export const l1ScriptForAddress = (address: string, network: OnchainNetwork): Uint8Array =>
  btc.OutScript.encode(btc.Address(NETWORKS[network]).decode(address))

/** The x-only key bound into the HTLC's claim leaf. Identity, so it is the
 * same key at claim time without anything having been written down.
 *
 * Note this is the key that AUTHORISES the claim, never where it pays — see
 * {@link l1ScriptForAddress} and the module doc. */
export const l1PayoutPubkey = (wallet: IWallet): Promise<Uint8Array> => wallet.identity.xOnlyPublicKey()

/** Where a stored swap's claim must pay, as the record recorded it. */
export const CLAIM_PAYOUT_SCRIPT = 'payout_pkscript'

/**
 * Read the recipient's script back off a stored record.
 *
 * Throws rather than falling back to anything. A missing script has exactly one
 * safe response, and paying somewhere else is not it: refusing the claim leaves
 * the solver to take its L1 refund and the Arkade lockup to refund to the user,
 * so the money comes back untouched. Claiming to a guessed script would move it
 * somewhere nobody asked for, and that is not reversible.
 */
export const claimPayoutScript = (profile: Record<string, unknown>): Uint8Array => {
  const stored = profile[CLAIM_PAYOUT_SCRIPT]
  if (typeof stored !== 'string' || !stored) {
    throw new Error('swap record carries no payout script — refusing to claim to anywhere else')
  }
  return hex.decode(stored)
}

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
