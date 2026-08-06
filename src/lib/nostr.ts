import { finalizeEvent, getPublicKey, nip44, SimplePool, UnsignedEvent, Event, verifyEvent } from 'nostr-tools'
import { EncryptedDirectMessage } from 'nostr-tools/kinds'
import { consoleError } from './logs'

/** A loaded event, with the local time it arrived at (seconds). */
export type BackupEvent = Event & { receivedAt: number }

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
   */
  constructor(seckey?: Uint8Array) {
    if (!seckey) throw new Error('Secret key must be provided')
    this.pubkey = getPublicKey(seckey)
    this.pool = new SimplePool()
    this.seckey = seckey
    this.relays = relays
  }

  /**
   * Save a message to Nostr encrypted with nip44
   * @param payload data to save
   */
  async save(payload: string): Promise<void> {
    const sk = this.seckey!
    const pk = this.pubkey!

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
  async load(): Promise<BackupEvent[]> {
    const self = this
    const events: BackupEvent[] = []
    let timeoutHandler: ReturnType<typeof setTimeout>

    if (!this.seckey) throw new Error('Secret key is required for loading data')

    return Promise.race([
      new Promise<BackupEvent[]>((resolve) => {
        const sub = this.pool.subscribeMany(
          this.relays,
          { kinds: [4], '#p': [this.pubkey], '#t': [nostrAppName] },
          {
            onevent(event: Event) {
              if (event.pubkey !== self.pubkey) {
                consoleError('Received nostr event from wrong pubkey')
                return
              }
              // relays are not trusted to have checked the signature themselves
              if (!verifyEvent(event)) {
                consoleError(new Error(`Invalid signature on event ${event.id}`), 'Skipped event')
                return
              }
              try {
                const content = self.decryptEvent(event)
                events.push({ ...event, content, receivedAt: Math.floor(Date.now() / 1000) })
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
      new Promise<BackupEvent[]>((resolve) => {
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
