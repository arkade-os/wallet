// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { networks, type NetworkName } from '@arkade-os/sdk'
import { onchainClaimEndpoint } from '../../lib/onchainPayout'
import { createSendRouter, ONCHAIN_SWAP_RAIL } from '../../lib/sendRouter'

const ALL = Object.keys(networks) as NetworkName[]

/** This once read `explorers.ts`, which has no mainnet `api`, so the rail went
 *  unregistered for mainnet users while working everywhere it was tested. Two
 *  maps that can disagree is the shape of it — hence every network, not one. */
describe('the on-chain claim endpoint', () => {
  it.each(ALL)('resolves for %s, so the rail can be gated on it', (network) => {
    const base = onchainClaimEndpoint(network)

    expect(typeof base).toBe('string')
    expect(base).toMatch(/^https?:\/\/.+/)
  })

  const client = { resolve: async () => ({ eligible: 1 }) } as never
  const ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'

  it('offers the on-chain swap rail once the fee rate resolves', async () => {
    const router = createSendRouter({ wallet: {} as never, client, claimFeeRateSatVb: 2 })

    const ids = (await router.options({ raw: ADDRESS, amount: 50_000 })).map((o) => o.railId)
    expect(ids).toContain(ONCHAIN_SWAP_RAIL)
  })

  it('offers it not at all without one — the gate the endpoint feeds', async () => {
    const router = createSendRouter({ wallet: {} as never, client })

    const ids = (await router.options({ raw: ADDRESS, amount: 50_000 })).map((o) => o.railId)
    expect(ids).not.toContain(ONCHAIN_SWAP_RAIL)
  })
})

vi.mock('../../lib/asp', () => ({ collaborativeExitWithFees: vi.fn(), sendAssets: vi.fn() }))
