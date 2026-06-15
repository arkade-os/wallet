import { describe, test, expect } from 'vitest'
import { hex } from '@scure/base'
import { ArkAddress } from '@arkade-os/sdk'
import { Offer } from '../../lib/banco/offer'

// Cross-implementation golden test: proves the TS client and the Go solver
// derive the SAME swap address for a fixed full-fill (no ratio) offer.
//
// The keys, offer fields, and expected address are kept in lockstep with the
// Go test solver/pkg/banco/contract/golden_test.go (TestSwapAddress_Golden_FullFill).
// Both sides derive the keys from fixed 32-byte scalars (0x11/0x22/0x33).
const SERVER_PUBKEY = '4f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa'
const EMULATOR_PUBKEY = '466d7fcae563e5cb09a0d1870bb580344804617879a14949cf22285f1bae3f27'
const MAKER_PUBKEY = '3c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1'
const MAKER_PK_SCRIPT = '51203c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1'

const GOLDEN_SWAP_ADDRESS =
  'tark1qp8n2k7uklxq4aegau7vawtptkgxsja4kt99lpv6krctwpq8tpc65v3ewwuvc2gxfcjnfmuykarp4vz3a80szwsunrg6rwe7nnuyqxh75cpzw0'

describe('banco offer golden (full-fill, no ratio)', () => {
  test('TS swap address matches the Go solver golden', () => {
    const serverPubKey = hex.decode(SERVER_PUBKEY)

    const offer: Omit<Offer.Data, 'swapPkScript'> = {
      wantAmount: 50_000n,
      makerPkScript: hex.decode(MAKER_PK_SCRIPT),
      makerPublicKey: hex.decode(MAKER_PUBKEY),
      emulatorPubkey: hex.decode(EMULATOR_PUBKEY),
      exitTimelock: { value: 144n, type: 'blocks' },
    }

    const vtxo = Offer.vtxoScript(offer, serverPubKey)
    const address = new ArkAddress(serverPubKey, vtxo.tweakedPublicKey, 'tark').encode()

    expect(address).toBe(GOLDEN_SWAP_ADDRESS)
  })
})
