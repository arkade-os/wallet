/** Where the onchain corridor reads L1 from, and which L1 it is. The payout
 *  script is not named here: the corridor carries it on the swap. */
import { ESPLORA_URL, type NetworkName } from '@arkade-os/sdk'
import type { OnchainNetwork } from '@arkade-os/swap/protocol'

/** Deliberate, not a fallthrough: signet and mutinynet derive HTLC scripts from
 *  the same parameters as testnet, and `OnchainNetwork` names only the three. */
export const l1NetworkOf = (network: NetworkName | string): OnchainNetwork =>
  network === 'bitcoin' ? 'bitcoin' : network === 'regtest' ? 'regtest' : 'testnet'

/** The SDK's map, not `explorers.ts`: that one builds explorer LINKS, has no
 *  mainnet `api`, and reading it here is what kept the solver rail off mainnet. */
export const onchainClaimEndpoint = (network: NetworkName): string => ESPLORA_URL[network]
