/** Which L1 the onchain corridor is on, and where its claim reads a fee
 *  estimate. The payout script is not named here: the corridor carries it on the swap. */
import { ESPLORA_URL, type NetworkName } from '@arkade-os/sdk'
import type { OnchainNetwork } from '@arkade-os/swap/protocol'

/** Deliberate, not a fallthrough: signet and mutinynet derive HTLC scripts from
 *  the same parameters as testnet, and `OnchainNetwork` names only the three. */
export const l1NetworkOf = (network: NetworkName | string): OnchainNetwork =>
  network === 'bitcoin' ? 'bitcoin' : network === 'regtest' ? 'regtest' : 'testnet'

/** Fee estimates only; L1 reads go through `electrum.ts`. The SDK's map, not
 *  `explorers.ts`: that one builds explorer LINKS. */
export const onchainClaimEndpoint = (network: NetworkName): string => ESPLORA_URL[network]
