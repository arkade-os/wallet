// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hex } from '@scure/base'
import { sealClaimPacket } from '@arkade-os/swap'
import { sealingKey } from '../../lib/swapClient'

/**
 * The one piece of the receive leg still on this side of the client.
 *
 * The request, the record, the origin and the claim are all the corridor's now;
 * what the wallet still supplies is the key the claim packet seals to, and the
 * reason it supplies a throwaway one is in `sealingKey`'s own docs.
 */
describe('sealingKey', () => {
  it('is a 33-byte compressed point, the only form ECIES can seal to', async () => {
    const key = sealingKey()
    const bytes = hex.decode(key)
    expect(bytes).toHaveLength(33)
    expect([0x02, 0x03]).toContain(bytes[0])
    // The check is the seal itself: `sealClaimPacket` ECDHs against this key, so
    // a merely well-shaped non-point would fail at request time instead.
    await expect(
      sealClaimPacket({ preimage: new Uint8Array(32).fill(7), covclaimdPubkey: bytes }),
    ).resolves.toBeDefined()
  })

  it('is hex, which is the shape the corridor override takes', () => {
    // `CorridorOverrides.lightning.covclaimd.pubkey` is a `Pubkey`, and that is
    // a hex string — handing it the raw bytes the v1 entrypoint took would
    // typecheck nowhere and fail at seal time.
    expect(sealingKey()).toMatch(/^0[23][0-9a-f]{64}$/)
  })

  it('is fresh per client, so two wallets are not linkable by their packet', () => {
    // One key per client rather than per receive: the corridor takes it as
    // configuration. Two receives in one session share a point, which is the
    // cost recorded in `sealingKey`; two clients must not.
    expect(sealingKey()).not.toEqual(sealingKey())
  })
})
