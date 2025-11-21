import { finalizeEvent, generateSecretKey, getPublicKey, nip44, SimplePool, UnsignedEvent, Event } from 'nostr-tools'
import { EncryptedDirectMessage } from 'nostr-tools/kinds'
import { consoleError } from './logs'

const nostrAppName = 'arkade_backup'
const defaultRelays = ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nostr.arkade.sh']
const relays = import.meta.env.VITE_NOSTR_RELAY_URL ? [import.meta.env.VITE_NOSTR_RELAY_URL] : defaultRelays

export class NostrStorage {
  private seckey: Uint8Array | null
  private pubkey: string
  private relays: string[]
  private pool: SimplePool

  /**
   * Initialize NostrStorage with either a secret key or public key
   * @param options.seckey - Optional secret key (Uint8Array). If provided, pubkey is derived.
   * @param options.pubkey - Optional public key (hex string, with or without '0x' prefix). Required if seckey not provided.
   * @param options.relays - Optional array of relay URLs. Defaults to hardcoded relay list.
   * @throws Error if neither seckey nor pubkey is provided, or if pubkey format is invalid
   */
  constructor(options: { seckey?: Uint8Array; pubkey?: string; relays?: string[] }) {
    this.pool = new SimplePool()
    this.relays = options.relays || relays
    if (options.seckey) {
      this.pubkey = getPublicKey(options.seckey)
      this.seckey = options.seckey
    } else if (options.pubkey) {
      this.pubkey = options.pubkey
      if (this.pubkey.length === 66) {
        this.pubkey = options.pubkey.slice(2)
      }
      if (this.pubkey.length !== 64) {
        throw new Error('Invalid pubkey length')
      }
      this.seckey = null
    } else {
      throw new Error('Either seckey or pubkey must be provided')
    }
  }

  /**
   * Save a message to Nostr encrypted with nip44
   * @param payload data to save
   */
  async save(payload: string): Promise<void> {
    const sk = generateSecretKey()
    const pk = getPublicKey(sk)

    const event: UnsignedEvent = {
      kind: EncryptedDirectMessage,
      tags: [
        ['p', this.pubkey],
        ['t', nostrAppName],
      ],
      created_at: Math.floor(Date.now() / 1000),
      content: this.encryptData(payload, sk),
      pubkey: pk,
    }

    const signedEvent = finalizeEvent(event, sk)

    try {
      await Promise.race([
        this.pool.publish(this.relays, signedEvent),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Publish timeout')), 10000)
        }),
      ])
      console.log('Message published to Nostr successfully')
    } catch (error) {
      console.error('Failed to publish to Nostr:', error)
      throw error
    }
  }

  /**
   * Load last message from Nostr
   * @returns the decrypted message
   */
  async load(): Promise<Event[]> {
    const self = this
    const events: Event[] = []
    let timeoutHandler: ReturnType<typeof setTimeout>

    if (!this.seckey) throw new Error('Secret key is required for loading data')

    return Promise.race([
      new Promise<Event[]>((resolve) => {
        const sub = this.pool.subscribeMany(
          this.relays,
          { kinds: [4], '#p': [this.pubkey], '#t': [nostrAppName] },
          {
            onevent(event: Event) {
              try {
                const content = self.decryptEvent(event)
                events.push({ ...event, content })
              } catch (error) {
                consoleError(error, 'Failed to decrypt event')
              }
            },
            oneose() {
              sub.close()
              if (timeoutHandler) clearTimeout(timeoutHandler)
              resolve(events)
            },
          },
        )
      }),
      new Promise<Event[]>((resolve) => {
        timeoutHandler = setTimeout(() => {
          consoleError(new Error('Load timeout'), 'Failed to load backup data')
          resolve([])
        }, 10000)
      }),
    ])
  }

  /**
   * Encrypt data with nip44
   * @param data the message to encrypt
   * @param seckey the ephemeral secret key
   * @returns data encrypted with nip44
   */
  private encryptData(data: string, seckey: Uint8Array): string {
    const key = nip44.getConversationKey(seckey, this.pubkey)
    return nip44.encrypt(data, key)
  }

  /**
   *
   * @param event event to decrypt
   * @returns string encrypted in the event
   */
  private decryptEvent(event: Event): string {
    if (!this.seckey) throw new Error('Secret key is required for decryption')
    const { content, pubkey } = event
    const key = nip44.getConversationKey(this.seckey, pubkey)
    return nip44.decrypt(content, key)
  }
}
