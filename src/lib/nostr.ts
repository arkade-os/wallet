import { finalizeEvent, generateSecretKey, getPublicKey, nip44, SimplePool, UnsignedEvent, Event } from 'nostr-tools'
import { EncryptedDirectMessage } from 'nostr-tools/kinds'
import { Config } from './types'
import { PendingReverseSwap, PendingSubmarineSwap } from '@arkade-os/boltz-swap'
import { consoleError } from './logs'

export const nostrAppName = 'arkade_backup'

const defaultRelays = ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nostr.arkade.sh']

export type NostrStorageData = {
  config: Config
  reverseSwaps: PendingReverseSwap[]
  submarineSwaps: PendingSubmarineSwap[]
}

export class NostrStorage {
  private seckey: Uint8Array | null
  private pubkey: string
  private relays: string[]

  /**
   * Initialize NostrStorage with either a secret key or public key
   * @param options.seckey - Optional secret key (Uint8Array). If provided, pubkey is derived.
   * @param options.pubkey - Optional public key (hex string, with or without '0x' prefix). Required if seckey not provided.
   * @param options.relays - Optional array of relay URLs. Defaults to hardcoded relay list.
   * @throws Error if neither seckey nor pubkey is provided, or if pubkey format is invalid
   */
  constructor(options: { seckey?: Uint8Array; pubkey?: string; relays?: string[] }) {
    this.relays = options.relays || defaultRelays
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
   * @param payload payload to save
   */
  async save(app: string, payload: NostrStorageData): Promise<void> {
    const pool = new SimplePool()
    const sk = generateSecretKey()
    const pk = getPublicKey(sk)

    const event: UnsignedEvent = {
      kind: EncryptedDirectMessage,
      tags: [
        ['p', this.pubkey],
        ['t', app],
      ],
      created_at: Math.floor(Date.now() / 1000),
      content: this.encryptData(JSON.stringify(payload), sk),
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
  async load(app: string): Promise<NostrStorageData | null> {
    const self = this
    const events: Event[] = []
    const pool = new SimplePool()

    if (!this.seckey) throw new Error('Secret key is required for loading data')

    return Promise.race([
      new Promise<NostrStorageData | null>((resolve) => {
        const sub = pool.subscribeMany(
          this.relays,
          { kinds: [4], '#p': [this.pubkey], '#t': [app] },
          {
            onevent(event: Event) {
              events.push(event)
            },
            oneose() {
              sub.close()
              pool.close(self.relays)
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
              try {
                const { content, pubkey } = events[0] // newest event
                const decrypted = self.decryptData(content, pubkey)
                if (!decrypted) return resolve(null)
                resolve(JSON.parse(decrypted) as NostrStorageData)
              } catch (error) {
                consoleError(error, 'Failed to decrypt/parse backup data')
                resolve(null)
              }
            },
          },
        )
      }),
      new Promise<NostrStorageData | null>((resolve) => {
        setTimeout(() => {
          pool.close(self.relays)
          consoleError(new Error('Load timeout'), 'Failed to load backup data')
          resolve(null)
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
   * @param data message to decrypt
   * @param pubkey the public key of the sender
   * @returns decrypted message
   */
  private decryptData(payload: string, pubkey: string): string {
    if (!this.seckey) throw new Error('Secret key is required for decryption')
    const key = nip44.getConversationKey(this.seckey, pubkey)
    return nip44.decrypt(payload, key)
  }
}
