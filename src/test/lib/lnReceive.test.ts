// @vitest-environment node
import { afterEach, describe, it, expect, vi } from 'vitest'
import { hex } from '@scure/base'
import { HDKey } from '@scure/bip32'
import { SingleKey, provisionClaimSecret, type IWallet, type ProvisionedClaimSecret } from '@arkade-os/sdk'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { sealClaimPacket, swapSecretsToRecord, type LightningReceiveSwap, type RfqQuote } from '@arkade-os/swap'
import { lnReceiveRendezvous, lnSendRendezvous } from '../../lib/lnSwap'
import { claimReceive, requestLnReceive, sealingKey, toReceiveSwap, type LnReceiveRequest } from '../../lib/lnReceive'

const requestLightningReceive = vi.hoisted(() => vi.fn())
const pushClaim = vi.hoisted(() => vi.fn())

// Only the two package calls this module makes are stubbed; `swapSecretsToRecord`
// and `preimageForSwapRecord` stay real, since the round trip between them is
// exactly what the claim tests are about.
vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  requestLightningReceive,
  pushClaim,
}))

/**
 * The two Lightning directions ride the two SIDES of one market: a side bounds
 * what the SOLVER pays out on it, so quote (Lightning) is the send leg and base
 * (arkade) the receive leg. Both selectors otherwise apply identical gates.
 */
const market = (overrides: Record<string, unknown> = {}): DiscoveredMarket =>
  ({
    quote_corridor: 'lightning',
    discovery_pubkey: 'aa'.repeat(32),
    emulator_pubkey: 'cc'.repeat(32),
    transports: { nostr: { relays: ['wss://relay.test'] } },
    min_quote_amount: '500',
    max_quote_amount: '1000',
    min_base_amount: '2000',
    max_base_amount: '9000',
    ...overrides,
  }) as unknown as DiscoveredMarket

describe('lnReceiveRendezvous', () => {
  it('reads the base side, where the solver pays out arkade', () => {
    const rendezvous = lnReceiveRendezvous([market()])
    expect(rendezvous?.minSats).toBe(2000)
    expect(rendezvous?.maxSats).toBe(9000)
    // Same rendezvous data as the send leg — one solver, one relay, one covenant
    // co-signer; only the bounds differ.
    expect(rendezvous?.solverPubkey).toBe(lnSendRendezvous([market()])?.solverPubkey)
    expect(rendezvous?.emulatorPubkey).toBe('cc'.repeat(32))
  })

  it('offers no receive corridor when the base side is disabled', () => {
    // The published card's current state: max "0" means the solver does not pay
    // out arkade, so the direction that receives it must not be offered.
    expect(lnReceiveRendezvous([market({ min_base_amount: '0', max_base_amount: '0' })])).toBeUndefined()
    // ...while the send leg on the very same market stays available.
    expect(lnSendRendezvous([market({ min_base_amount: '0', max_base_amount: '0' })])).toBeDefined()
  })

  it('applies the same rendezvous gates as the send leg', () => {
    expect(lnReceiveRendezvous([market({ emulator_pubkey: undefined })])).toBeUndefined()
    expect(lnReceiveRendezvous([market({ discovery_pubkey: undefined })])).toBeUndefined()
    expect(lnReceiveRendezvous([market({ transports: undefined })])).toBeUndefined()
    expect(lnReceiveRendezvous([market({ quote_corridor: 'onchain' })])).toBeUndefined()
  })
})

describe('sealingKey', () => {
  it('is a 33-byte compressed point, the only form ECIES can seal to', async () => {
    const key = sealingKey()
    expect(key).toHaveLength(33)
    expect([0x02, 0x03]).toContain(key[0])
    // The check is the seal itself: sealClaimPacket ECDHs against this key, so
    // a merely well-shaped non-point would fail at request time instead.
    await expect(sealClaimPacket({ preimage: new Uint8Array(32).fill(7), covclaimdPubkey: key })).resolves.toBeDefined()
  })

  it('is fresh per receive, so two lockups are not linkable by their packet', () => {
    // Not an AEAD concern — sealClaimPacket draws its own ephemeral key and
    // nonce each call — but a reused recipient key would tag every receive of
    // this wallet as one payee to anyone collecting RFQ requests.
    expect(sealingKey()).not.toEqual(sealingKey())
  })
})

/**
 * A quote whose `payment_hash` is deliberately NOT the wallet's own. On a
 * receive leg `H` is ours — the wallet generated `P` — and the quote is the
 * solver echoing it back, so every test below that touches a payment hash reads
 * the wallet's value and asserts the echo was not used.
 */
const SOLVER_ECHOED_HASH = 'ee'.repeat(32)

const quote = (overrides: Partial<RfqQuote> = {}): RfqQuote =>
  ({
    v: 1,
    type: 'rfq_quote',
    rfq_id: 'rfq-1',
    from_amount: 10_500,
    to_amount: 10_000,
    valid_until: 1_800_000_000,
    refund_locktime: 1_800_003_600,
    profile: { payment_hash: SOLVER_ECHOED_HASH },
    ...overrides,
  }) as RfqQuote

const SCRIPT = { pkScript: new Uint8Array([0x51, 0x20]) } as unknown as LnReceiveRequest['script']

const receiveRequest = (overrides: Partial<LnReceiveRequest> = {}): LnReceiveRequest => ({
  rfqId: 'rfq-1',
  invoice: 'lnbc105u1p...',
  payAmount: 10_500,
  expectedAmount: 10_000,
  invoiceExpiresAt: 1_800_000_600,
  address: 'tark1qlockup',
  swapPkScript: new Uint8Array([0x51, 0x20, 0xab]),
  script: SCRIPT,
  payoutAddress: 'tark1qpayout',
  payoutPubkey: new Uint8Array(32).fill(1),
  secrets: {
    descriptor: 'tr(aa)',
    pubkey: new Uint8Array(32).fill(2),
    preimage: new Uint8Array(32).fill(3),
    paymentHash: new Uint8Array(32).fill(4),
    mustPersistPreimage: false,
  },
  quote: quote(),
  ...overrides,
})

describe('toReceiveSwap', () => {
  it('maps the negotiation onto the record RfqSwapManager monitors', () => {
    const request = receiveRequest()
    const swap = toReceiveSwap(request, 'ab'.repeat(32), 1_800_000_100)
    expect(swap).toEqual({
      rfqId: 'rfq-1',
      kind: 'lightning_receive',
      state: 'pending',
      lockupPkScript: request.swapPkScript,
      // the covenant travels with the record so the manager can register it —
      // which is what turns funding and spend into pushed events
      lockup: { script: SCRIPT, address: 'tark1qlockup' },
      paymentHash: 'ab'.repeat(32),
      refundLocktime: 1_800_003_600,
      expectedAmount: 10_000,
      createdAt: 1_800_000_100,
      updatedAt: 1_800_000_100,
    })
  })

  it('carries OUR payment hash, never the one the quote echoes back', () => {
    const swap = toReceiveSwap(receiveRequest(), 'ab'.repeat(32))
    // The manager decides `settled` by hashing a spend's witness against this
    // value, so a solver that named the hash would name the claim we accept.
    expect(swap.paymentHash).toBe('ab'.repeat(32))
    expect(swap.paymentHash).not.toBe(SOLVER_ECHOED_HASH)
  })

  it('refuses a quote with no refund_locktime, which cannot time a claim', () => {
    // Optional on RfqQuote because arkade<->arkade quotes have no refund leaf;
    // on this corridor it is the solver's deadline and the only clock the claim
    // is gated on, so its absence is fatal rather than cosmetic.
    const request = receiveRequest({ quote: quote({ refund_locktime: undefined }) })
    expect(() => toReceiveSwap(request, 'ab'.repeat(32))).toThrow(/refund_locktime/)
  })
})

describe('requestLnReceive', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    requestLightningReceive.mockReset()
  })

  const packageResult = (overrides: Record<string, unknown> = {}) => ({
    rfqId: 'rfq-1',
    quote: quote(),
    invoice: 'lnbc105u1p...',
    payAmount: 10_500,
    expectedAmount: 10_000,
    invoiceExpiresAt: 1_800_000_600,
    address: 'tark1qlockup',
    swapPkScript: new Uint8Array([0x51, 0x20, 0xab]),
    script: SCRIPT,
    payoutAddress: 'tark1qpayout',
    payoutPubkey: new Uint8Array(32).fill(1),
    secrets: receiveRequest().secrets,
    ...overrides,
  })

  const negotiate = (network = 'regtest') =>
    requestLnReceive({
      wallet: {} as never,
      arkServerUrl: 'http://localhost:7070',
      transport: {} as never,
      rendezvous: {} as never,
      network: network as never,
      amountSats: 10_000,
    })

  it('takes the package expectedAmount and invoiceExpiresAt verbatim', async () => {
    // Both used to be recomputed here — from `quote.to_amount` and from a second
    // decode of the invoice. Seeded to disagree so a reconstruction would show.
    requestLightningReceive.mockResolvedValue(
      packageResult({
        quote: quote({ to_amount: 7, valid_until: 1 }),
        expectedAmount: 10_000,
        invoiceExpiresAt: 1_800_000_600,
      }),
    )
    const request = await negotiate()
    expect(request.expectedAmount).toBe(10_000)
    expect(request.invoiceExpiresAt).toBe(1_800_000_600)
  })

  it('keeps the quote and payout key the record and the claim need', async () => {
    requestLightningReceive.mockResolvedValue(packageResult())
    const request = await negotiate()
    expect(request.quote.refund_locktime).toBe(1_800_003_600)
    expect(request.payoutPubkey).toHaveLength(32)
  })

  it('forwards the configured co-signer override in its compressed form', async () => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', `02${'ab'.repeat(32)}`)
    requestLightningReceive.mockResolvedValue(packageResult())
    await negotiate()
    expect(requestLightningReceive).toHaveBeenCalledWith(
      expect.anything(),
      'http://localhost:7070',
      expect.anything(),
      expect.objectContaining({ emulatorPubkey: `02${'ab'.repeat(32)}` }),
    )
  })

  it('sends no override for an x-only value, rather than a guessed prefix', async () => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', 'ab'.repeat(32))
    requestLightningReceive.mockResolvedValue(packageResult())
    await negotiate()
    expect(requestLightningReceive).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ emulatorPubkey: undefined }),
    )
  })

  it('asks for the amount on the TO side — what the user wants to receive', async () => {
    requestLightningReceive.mockResolvedValue(packageResult())
    await negotiate()
    expect(requestLightningReceive.mock.calls[0][3]).toMatchObject({ amount: 10_000, amountSide: 'to' })
  })
})

/**
 * The three arms `provisionClaimSecret` chooses between, each built against a
 * real wallet rather than a hand-written record: which fields a swap must keep
 * in order to recover `P` differs per arm, and a record projected by hand would
 * be a restatement of the mapping instead of a test of it.
 */
const staticWallet = () => ({ identity: SingleKey.fromRandomBytes() }) as unknown as IWallet

const hdWallet = () => {
  const master = HDKey.fromMasterSeed(new Uint8Array(64).fill(9))
  const account = master.derive("m/86'/0'/0'")
  const fingerprint = hex.encode(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
  // A materialized child descriptor is what makes the preimage derivable from
  // the seed alone: the index pins one artifact, so no salt and nothing at rest.
  const descriptorFor = (index: number) => `tr([${fingerprint}/86'/0'/0']${account.publicExtendedKey}/0/${index})`
  const signerFor = (descriptor: string) => {
    const index = Number(descriptor.slice(descriptor.lastIndexOf('/') + 1).replace(')', ''))
    return SingleKey.fromPrivateKey(account.deriveChild(0).deriveChild(index).privateKey!)
  }
  let next = 0
  return {
    identity: signerFor(descriptorFor(0)),
    getNextSigningDescriptor: async () => descriptorFor(next++),
    getCurrentSigningDescriptor: async () => descriptorFor(next),
    getUsedSigningDescriptors: async () => [],
    advanceSigningDescriptorWatermark: async () => {},
    signerForDescriptor: async (descriptor: string) => signerFor(descriptor),
  } as unknown as IWallet
}

const claimSwap = (expectedAmount = 10_000): LightningReceiveSwap & { lockup: { script: never; address: string } } =>
  ({
    rfqId: 'rfq-1',
    kind: 'lightning_receive',
    state: 'claimable',
    lockupPkScript: new Uint8Array([0x51, 0x20, 0xab]),
    lockup: { script: SCRIPT, address: 'tark1qlockup' },
    paymentHash: 'ab'.repeat(32),
    refundLocktime: 1_800_003_600,
    expectedAmount,
    createdAt: 1,
    updatedAt: 1,
  }) as never

const VTXOS = [{ txid: 'aa'.repeat(32), vout: 0, value: 10_000 }] as never

describe('claimReceive', () => {
  afterEach(() => pushClaim.mockReset())

  // ArkAddress.decode is the only piece of the claim that needs a real address;
  // everything else about `pushClaim` is the package's own business.
  const decodable =
    'ark1qqqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszf0akax'

  const arms: [string, () => Promise<{ wallet: IWallet; secrets: ProvisionedClaimSecret }>][] = [
    [
      'HD child',
      async () => {
        const wallet = hdWallet()
        return { wallet, secrets: await provisionClaimSecret(wallet) }
      },
    ],
    [
      'salted static',
      async () => {
        const wallet = staticWallet()
        return { wallet, secrets: await provisionClaimSecret(wallet) }
      },
    ],
    [
      'caller-supplied P',
      async () => {
        const wallet = staticWallet()
        return { wallet, secrets: await provisionClaimSecret(wallet, { preimage: new Uint8Array(32).fill(7) }) }
      },
    ],
  ]

  it.each(arms)('recovers P from the %s projection and publishes it', async (_arm, provision) => {
    const { wallet, secrets } = await provision()
    pushClaim.mockResolvedValue({ arkTxid: 'txid', amount: 10_000 })

    await claimReceive({
      wallet,
      ark: {} as never,
      swap: claimSwap(),
      payoutAddress: decodable,
      // The projection the provider's side map holds — descriptor, plus the
      // stored preimage or the salt where that arm needs one. A descriptor-only
      // record would recover a WRONG P on the salted arm and none at all on the
      // stored one.
      record: { ...swapSecretsToRecord(secrets), paymentHash: hex.encode(secrets.paymentHash) },
      vtxos: VTXOS,
      partiallyClaimed: false,
    })

    expect(pushClaim.mock.calls[0][1].preimage).toEqual(secrets.preimage)
    expect(pushClaim.mock.calls[0][1].expectedAmount).toBe(10_000)
    // Passed through rather than swallowed: the manager's value gate decides
    // WHEN to claim, this one decides whether P is published.
    expect(pushClaim.mock.calls[0][1].partiallyClaimed).toBe(false)
  })

  it('refuses a record whose stored preimage does not hash to its payment hash', async () => {
    const wallet = staticWallet()
    const secrets = await provisionClaimSecret(wallet, { preimage: new Uint8Array(32).fill(7) })
    await expect(
      claimReceive({
        wallet,
        ark: {} as never,
        swap: claimSwap(),
        payoutAddress: decodable,
        record: { ...swapSecretsToRecord(secrets), paymentHash: 'cd'.repeat(32) },
        vtxos: VTXOS,
        partiallyClaimed: false,
      }),
    ).rejects.toThrow()
    // Nothing signed, nothing revealed: publishing a P that opens no leaf
    // settles nothing and gives the secret away for free.
    expect(pushClaim).not.toHaveBeenCalled()
  })

  it('forwards partiallyClaimed, which is what sweeps a piecemeal funding', async () => {
    const wallet = staticWallet()
    const secrets = await provisionClaimSecret(wallet)
    pushClaim.mockResolvedValue({ arkTxid: 'txid', amount: 4_000 })
    await claimReceive({
      wallet,
      ark: {} as never,
      swap: claimSwap(),
      payoutAddress: decodable,
      record: { ...swapSecretsToRecord(secrets), paymentHash: hex.encode(secrets.paymentHash) },
      vtxos: VTXOS,
      partiallyClaimed: true,
    })
    expect(pushClaim.mock.calls[0][1].partiallyClaimed).toBe(true)
  })
})

describe('swapSecretsToRecord', () => {
  // The package's mapping, asserted here because the provider's side map stores
  // exactly this and a claim can only recover P from what it kept.
  it('stores P only when the wallet says it cannot re-derive it', async () => {
    const wallet = staticWallet()
    const record = swapSecretsToRecord(await provisionClaimSecret(wallet, { preimage: new Uint8Array(32).fill(7) }))
    expect(record.preimageHex).toBe('07'.repeat(32))
    expect(record.preimageSaltHex).toBeUndefined()
  })

  it('stores the salt for a repeating descriptor, and no secret', async () => {
    const record = swapSecretsToRecord(await provisionClaimSecret(staticWallet()))
    expect(record.preimageSaltHex).toMatch(/^[0-9a-f]{64}$/)
    expect(record.preimageHex).toBeUndefined()
  })

  it('stores neither for an HD child — the descriptor alone pins the artifact', async () => {
    const record = swapSecretsToRecord(await provisionClaimSecret(hdWallet()))
    expect(record.preimageHex).toBeUndefined()
    expect(record.preimageSaltHex).toBeUndefined()
    expect(record.signingDescriptor).toContain('/0/0')
  })
})
