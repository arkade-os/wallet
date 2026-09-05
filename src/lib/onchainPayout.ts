/** The HTLC's claim leaf binds a KEY; the claim transaction's OUTPUT is a
 *  separate choice, and paying it to the key's own address lands the sats back
 *  here while the screen says the recipient was paid. */
import { hex } from '@scure/base'
import { ESPLORA_URL, type IWallet, type NetworkName } from '@arkade-os/sdk'
import type { OnchainNetwork } from '@arkade-os/swap'

/** Deliberate, not a fallthrough: signet and mutinynet derive HTLC scripts from
 *  the same parameters as testnet, and `OnchainNetwork` names only the three. */
export const l1NetworkOf = (network: NetworkName | string): OnchainNetwork =>
  network === 'bitcoin' ? 'bitcoin' : network === 'regtest' ? 'regtest' : 'testnet'

export const l1PayoutPubkey = (wallet: IWallet): Promise<Uint8Array> => wallet.identity.xOnlyPublicKey()

export const CLAIM_PAYOUT_SCRIPT = 'payout_pkscript'

/** Throws rather than guessing: refusing lets both sides refund. */
export const claimPayoutScript = (profile: Record<string, unknown>): Uint8Array => {
  const stored = profile[CLAIM_PAYOUT_SCRIPT]
  if (typeof stored !== 'string' || !stored) {
    throw new Error('swap record carries no payout script — refusing to claim to anywhere else')
  }
  return hex.decode(stored)
}

/** The SDK's map, not `explorers.ts`: that one builds explorer LINKS, has no
 *  mainnet `api`, and reading it here is what kept the solver rail off mainnet. */
export const onchainClaimEndpoint = (network: NetworkName): string => ESPLORA_URL[network]
