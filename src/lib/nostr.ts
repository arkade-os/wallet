import { finalizeEvent, generateSecretKey, getPublicKey, nip44, SimplePool, UnsignedEvent, Event } from 'nostr-tools'
import { EncryptedDirectMessage } from 'nostr-tools/kinds'

const defaultRelays = ['wss://relay.damus.io', 'wss://relay.primal.net']

export class NostrStorage {
  private secKey: Uint8Array
  private pubKey: string
  private relays: string[]

  constructor(options: { secKey: Uint8Array; relays?: string[] }) {
    this.relays = options.relays || defaultRelays
    this.pubKey = getPublicKey(options.secKey)
    this.secKey = options.secKey
  }

  /**
   * Save a message to Nostr encrypted with nip44
   * @param payload payload to save
   */
  async save(app: string, payload: string): Promise<void> {
    const pool = new SimplePool()
    const sk = generateSecretKey()
    const pk = getPublicKey(sk)

    const event: UnsignedEvent = {
      kind: EncryptedDirectMessage,
      tags: [
        ['p', this.pubKey],
        ['t', app],
      ],
      created_at: Math.floor(Date.now() / 1000),
      content: this.encryptData(payload, sk),
      pubkey: pk,
    }

    const signedEvent = finalizeEvent(event, sk)

    try {
      await Promise.race([
        pool.publish(this.relays, signedEvent),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Publish timeout')), 10000)
        }),
      ])
      console.log('Message published to Nostr successfully')
    } catch (error) {
      console.error('Failed to publish to Nostr:', error)
      throw error
    } finally {
      pool.close(this.relays)
    }
  }

  /**
   * Load last message from Nostr
   * @returns the decrypted message
   */
  async load(app: string): Promise<string | null> {
    const self = this
    const events: Event[] = []
    const pool = new SimplePool()

    return new Promise((resolve) => {
      const sub = pool.subscribeMany(
        this.relays,
        { kinds: [4], '#p': [this.pubKey], '#t': [app] },
        {
          onevent(event: Event) {
            events.push(event)
          },
          oneose() {
            sub.close()
            if (events.length === 0) {
              resolve(null)
              return
            }
            // sort newest first
            events.sort((a, b) => {
              const aDate = a.created_at
              const bDate = b.created_at
              return bDate - aDate
            })
            const { content, pubkey } = events[0] // newest event
            const decrypted = self.decryptData(content, pubkey)
            resolve(decrypted || null)
          },
        },
      )
    })
  }

  /**
   * Encrypt data with nip44
   * @param data the message to encrypt
   * @param secKey the ephemeral secret key
   * @returns data encrypted with nip44
   */
  private encryptData(data: string, secKey: Uint8Array): string {
    const key = nip44.getConversationKey(secKey, this.pubKey)
    return nip44.encrypt(data, key)
  }

  /**
   *
   * @param data message to decrypt
   * @param pubKey the public key of the sender
   * @returns decrypted message
   */
  private decryptData(payload: string, pubKey: string): string {
    const key = nip44.getConversationKey(this.secKey, pubKey)
    return nip44.decrypt(payload, key)
  }
}
