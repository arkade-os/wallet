import { beforeEach, describe, expect, it, vi } from 'vitest'
import { finalizeEvent, generateSecretKey, getPublicKey, nip44, type Event, type SimplePool } from 'nostr-tools'
import { EncryptedDirectMessage } from 'nostr-tools/kinds'
import { NostrStorage } from '../../lib/nostr'

// jsdom's TextEncoder returns a cross-realm Uint8Array that @noble/hashes rejects
const encode = TextEncoder.prototype.encode
TextEncoder.prototype.encode = function (input?: string) {
  return Uint8Array.from(encode.call(this, input))
}

// events the mocked relay pool hands to the subscription
let relayEvents: Event[] = []

const { poolConstructions } = vi.hoisted(() => ({ poolConstructions: [] as unknown[] }))

vi.mock('nostr-tools', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nostr-tools')>()
  class MockPool {
    constructor() {
      poolConstructions.push(this)
    }
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

describe('NostrStorage.save', () => {
  const storageWithRelays = (ensureRelay: ReturnType<typeof vi.fn>) => {
    const pool = { ensureRelay } as unknown as SimplePool
    const storage = new NostrStorage(seckey, pool)
    Object.defineProperty(storage, 'relays', { value: ['wss://failed.example', 'wss://connected.example'] })
    return storage
  }

  it('rejects when all relay connections fail', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const success = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      const ensureRelay = vi.fn().mockRejectedValue(new Error('connection failed'))
      await expect(storageWithRelays(ensureRelay).save('backup')).rejects.toBeInstanceOf(AggregateError)
      expect(ensureRelay).toHaveBeenCalledTimes(2)
      expect(success).not.toHaveBeenCalled()
    } finally {
      log.mockRestore()
      success.mockRestore()
    }
  })

  it('waits for a connected relay acknowledgement after another connection fails', async () => {
    const success = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      let acknowledge: (message: string) => void = () => {}
      const reply = new Promise<string>((resolve) => (acknowledge = resolve))
      const publish = vi.fn().mockReturnValue(reply)
      const ensureRelay = vi.fn((url: string) =>
        url === 'wss://failed.example' ? Promise.reject(new Error('connection failed')) : Promise.resolve({ publish }),
      )
      let settled = false
      const saving = storageWithRelays(ensureRelay)
        .save('backup')
        .then(() => {
          settled = true
        })
      await vi.waitFor(() => expect(publish).toHaveBeenCalledOnce())
      expect(settled).toBe(false)
      expect(success).not.toHaveBeenCalled()

      acknowledge('connection failure: this is an accepted relay message')
      await saving
      expect(success).toHaveBeenCalledWith('Message published to Nostr successfully')
    } finally {
      success.mockRestore()
    }
  })

  it('rejects when a connected relay refuses the event and no other relay accepts it', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const ensureRelay = vi.fn((url: string) =>
        url === 'wss://failed.example'
          ? Promise.reject(new Error('connection failed'))
          : Promise.resolve({ publish: vi.fn().mockRejectedValue(new Error('relay refused event')) }),
      )
      await expect(storageWithRelays(ensureRelay).save('backup')).rejects.toBeInstanceOf(AggregateError)
    } finally {
      log.mockRestore()
    }
  })

  it('clears the timeout after a relay accepts the event', async () => {
    vi.useFakeTimers()
    const success = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      const publish = vi.fn().mockResolvedValue('')
      const ensureRelay = vi.fn().mockResolvedValue({ publish })
      await storageWithRelays(ensureRelay).save('backup')
      expect(publish).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: EncryptedDirectMessage,
          pubkey,
          tags: expect.arrayContaining([['p', pubkey]]),
        }),
      )
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
      success.mockRestore()
    }
  })

  it('times out if no relay acknowledges the event', async () => {
    vi.useFakeTimers()
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const ensureRelay = vi.fn().mockResolvedValue({ publish: () => new Promise<string>(() => {}) })
      const saving = storageWithRelays(ensureRelay).save('backup')
      const rejection = expect(saving).rejects.toThrow('Publish timeout')
      await vi.advanceTimersByTimeAsync(10_000)
      await rejection
    } finally {
      vi.useRealTimers()
      log.mockRestore()
    }
  })
})

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

  it('lends one shared pool to every storage instance', () => {
    const before = poolConstructions.length
    new NostrStorage(seckey)
    new NostrStorage(seckey)
    expect(poolConstructions.length - before).toBeLessThanOrEqual(1)
  })

  it('hands out the same pool on every call', async () => {
    const { sharedNostrPool } = await import('../../lib/nostr')
    expect(sharedNostrPool()).toBe(sharedNostrPool())
  })

  it('reads through an injected pool', async () => {
    relayEvents = [asDelivered(makeEvent('{"injected":true}'))]
    const injected = {
      subscribeMany: (
        _relays: string[],
        _filter: unknown,
        handlers: { onevent: (e: Event) => void; oneose: () => void },
      ) => {
        queueMicrotask(() => {
          for (const event of relayEvents) handlers.onevent(event)
          handlers.oneose()
        })
        return { close: () => {} }
      },
    } as unknown as SimplePool
    const found = await new NostrStorage(seckey, injected).load()
    expect(found).toHaveLength(1)
    expect(found[0].content).toBe('{"injected":true}')
  })
})
