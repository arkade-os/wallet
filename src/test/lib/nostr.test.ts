import { beforeEach, describe, expect, it, vi } from 'vitest'
import { finalizeEvent, generateSecretKey, getPublicKey, nip44, type Event } from 'nostr-tools'
import { EncryptedDirectMessage } from 'nostr-tools/kinds'
import { NostrStorage } from '../../lib/nostr'

// jsdom's TextEncoder returns a cross-realm Uint8Array that @noble/hashes rejects
const encode = TextEncoder.prototype.encode
TextEncoder.prototype.encode = function (input?: string) {
  return Uint8Array.from(encode.call(this, input))
}

// events the mocked relay pool hands to the subscription
let relayEvents: Event[] = []

vi.mock('nostr-tools', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nostr-tools')>()
  class MockPool {
    subscribeMany(_relays: string[], _filter: unknown, handlers: { onevent: (e: Event) => void; oneose: () => void }) {
      // relays deliver asynchronously; load() closes the subscription on eose
      queueMicrotask(() => {
        for (const event of relayEvents) handlers.onevent(event)
        handlers.oneose()
      })
      return { close: () => {} }
    }
  }
  return { ...actual, SimplePool: MockPool }
})

const seckey = generateSecretKey()
const pubkey = getPublicKey(seckey)

const makeEvent = (payload: string, sk = seckey): Event => {
  return finalizeEvent(
    {
      kind: EncryptedDirectMessage,
      tags: [
        ['p', pubkey],
        ['t', 'arkade_backup'],
      ],
      created_at: Math.floor(Date.now() / 1000),
      content: nip44.encrypt(payload, nip44.getConversationKey(sk, pubkey)),
    },
    sk,
  )
}

// relays deliver JSON, so drop the in-memory verification flag nostr-tools caches
const asDelivered = (event: Event): Event => JSON.parse(JSON.stringify(event))

describe('NostrStorage.load', () => {
  beforeEach(() => {
    relayEvents = []
  })

  it('returns decrypted events', async () => {
    relayEvents = [asDelivered(makeEvent('{"hello":"world"}'))]

    const events = await new NostrStorage(seckey).load()

    expect(events).toHaveLength(1)
    expect(events[0].content).toBe('{"hello":"world"}')
    expect(events[0].receivedAt).toBeGreaterThan(0)
  })

  it('skips an event not signed by us', async () => {
    const sk = generateSecretKey() // ephemeral secret key
    const tampered = { ...asDelivered(makeEvent('{"hello":"world"}', sk)) }
    relayEvents = [tampered]

    expect(await new NostrStorage(seckey).load()).toHaveLength(0)
  })

  it('skips an event whose signature does not match', async () => {
    const tampered = { ...asDelivered(makeEvent('{"hello":"world"}')), sig: '00'.repeat(64) }
    relayEvents = [tampered]

    expect(await new NostrStorage(seckey).load()).toHaveLength(0)
  })

  it('keeps valid events alongside invalid ones', async () => {
    const sk = generateSecretKey()
    const valid = asDelivered(makeEvent('{"keep":true}'))
    const signedByOther = { ...asDelivered(makeEvent('{"drop":true"}', sk)) }
    const invalidSig = { ...asDelivered(makeEvent('{"drop":true}')), sig: '00'.repeat(64) }
    relayEvents = [signedByOther, invalidSig, valid]

    const events = await new NostrStorage(seckey).load()

    expect(events.map((e) => e.content)).toEqual(['{"keep":true}'])
  })
})
