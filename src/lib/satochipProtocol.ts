/** @license Adapted from Satochip Development Team / Toporin's Satochip-Java
 * ad297f14d1dbc0bb6f09e6ba17ca468f945d2a62 under Apache-2.0.
 * See satochipProtocol.NOTICE and satochipProtocol.LICENSE. */
import { schnorr, secp256k1 } from '@noble/curves/secp256k1.js'
import { hmac } from '@noble/hashes/hmac.js'
import { sha1 } from '@noble/hashes/legacy.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes, equalBytes, taprootTweakPubkey } from '@scure/btc-signer/utils.js'

export interface SatochipAPDUChannel {
  beginOperation(): Promise<void>
  transmit(command: Uint8Array): Promise<{ data: Uint8Array; statusWord: number }>
  endOperation(): Promise<void>
  disconnect(): Promise<void>
}

export type SatochipProtocolInfo = {
  present: boolean
  version: string
  setupDone: boolean
  seeded: boolean
  needs2FA: boolean
  schnorrEnabled: boolean
  untweakedSchnorrEnabled: boolean
  ready: boolean
}

type Policy = SatochipProtocolInfo & { supported: boolean; needsSecureChannel: boolean }
type ErrorCode =
  | 'INVALID_INPUT'
  | 'CARD_REQUIRED'
  | 'INCOMPATIBLE_CARD'
  | 'WRONG_PIN'
  | 'CARD_CHANGED'
  | 'BUSY'
  | 'CANCELLED'
  | 'INVALID_RESPONSE'

export class SatochipProtocolError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'SatochipProtocolError'
  }
}

const empty = new Uint8Array()
const encoder = new TextEncoder()
const path = Uint8Array.from([0x80, 0, 0, 86, 0x80, 0, 0, 1, 0x80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
const malformed = (): never => {
  throw new SatochipProtocolError('INVALID_RESPONSE', 'The card returned an invalid response. Connect it again.')
}
const required = (): never => {
  throw new SatochipProtocolError('CARD_REQUIRED', 'Connect your Satochip again to continue.')
}
const input = (message: string): never => {
  throw new SatochipProtocolError('INVALID_INPUT', message)
}
const u16 = (value: number): Uint8Array => Uint8Array.of(value >>> 8, value & 0xff)
const buffer = (value: Uint8Array): ArrayBuffer => value.slice().buffer as ArrayBuffer

function apdu(ins: number, data: Uint8Array = empty, p1 = 0, p2 = 0, cla = 0xb0): Uint8Array {
  if (data.length > 255) return input('The card command is too large.')
  return concatBytes(Uint8Array.of(cla, ins, p1, p2, data.length), data)
}

function checkedPolicy(data: Uint8Array): Policy {
  if (data.length < 16) return malformed()
  const version = `${data[0]}.${data[1]}-${data[2]}.${data[3]}`
  const minimum = [0, 16, 0, 1]
  let supported = true
  for (let i = 0; i < 4; i++) {
    if (data[i] !== minimum[i]) {
      supported = data[i] > minimum[i]
      break
    }
  }
  const flags = [8, 9, 10, 11]
  if (flags.some((i) => data[i] !== 0 && data[i] !== 1)) return malformed()
  const policy = {
    present: true,
    version,
    setupDone: data[10] === 1,
    seeded: data[9] === 1,
    needs2FA: data[8] === 1,
    needsSecureChannel: data[11] === 1,
    schnorrEnabled: data[13] === 0,
    untweakedSchnorrEnabled: data[14] === 0,
    supported,
    ready: false,
  }
  policy.ready =
    supported &&
    policy.setupDone &&
    policy.seeded &&
    !policy.needs2FA &&
    policy.schnorrEnabled &&
    policy.untweakedSchnorrEnabled
  return policy
}

function compatible(policy: Policy, ready = false): void {
  const fail = (message: string): never => {
    throw new SatochipProtocolError('INCOMPATIBLE_CARD', message)
  }
  if (!policy.supported) fail('Satochip applet 0.16-0.1 or newer is required.')
  if (policy.needs2FA) fail('This host does not support cards with 2FA enabled.')
  if (!policy.schnorrEnabled || !policy.untweakedSchnorrEnabled)
    fail('Schnorr and untweaked Schnorr signing must be enabled on the card.')
  if (ready && (!policy.setupDone || !policy.seeded)) fail('Set up this empty Satochip before connecting.')
}

function publicInfo(policy: Policy): SatochipProtocolInfo {
  return {
    present: policy.present,
    version: policy.version,
    setupDone: policy.setupDone,
    seeded: policy.seeded,
    needs2FA: policy.needs2FA,
    schnorrEnabled: policy.schnorrEnabled,
    untweakedSchnorrEnabled: policy.untweakedSchnorrEnabled,
    ready: policy.ready,
  }
}

function statusOK(status: number): void {
  if (!Number.isInteger(status) || status < 0 || status > 0xffff) return malformed()
  if (status === 0x9000) return
  if ((status & 0xfff0) === 0x63c0)
    throw new SatochipProtocolError('WRONG_PIN', 'Incorrect PIN. No retry was attempted.')
  if (status === 0x9c0c)
    throw new SatochipProtocolError(
      'WRONG_PIN',
      'The card PIN is blocked. Use your PIN recovery code in a supported recovery app.',
    )
  if (status === 0x9c06)
    throw new SatochipProtocolError(
      'CARD_REQUIRED',
      'Card authentication expired. Connect again; no PIN retry was attempted.',
    )
  throw new SatochipProtocolError('CARD_REQUIRED', 'The card could not complete this operation. Connect it again.')
}

function signedCoordinate(data: Uint8Array, derived: boolean): Uint8Array {
  let offset = derived ? 32 : 0
  if (data.length < offset + 2 || (derived && (data[offset] & 0x80) !== 0)) return malformed()
  const field = (): Uint8Array => {
    if (offset + 2 > data.length) return malformed()
    const length = data[offset] * 256 + data[offset + 1]
    offset += 2
    if (offset + length > data.length) return malformed()
    const value = data.slice(offset, offset + length)
    offset += length
    return value
  }
  const x = field()
  if (x.length !== 32) return malformed()
  const message = data.slice(0, offset)
  const signature = field()
  const authenticationSignature = field()
  if (offset !== data.length) return malformed()
  try {
    const proof = secp256k1.Signature.fromBytes(signature, 'der')
    secp256k1.Signature.fromBytes(authenticationSignature, 'der')
    const hash = sha256(message)
    for (let recovery = 0; recovery < 4; recovery++) {
      try {
        const key = proof.addRecoveryBit(recovery).recoverPublicKey(hash).toBytes(true)
        if (
          equalBytes(key.subarray(1), x) &&
          secp256k1.verify(signature, hash, key, { prehash: false, lowS: false, format: 'der' })
        )
          return key
      } catch {
        /* Not every recovery ID represents a point. */
      }
    }
  } catch {
    return malformed()
  }
  return malformed()
}

export class SatochipProtocol {
  private key?: Uint8Array
  private aes?: CryptoKey
  private mac?: Uint8Array
  private counter = 1
  private generation = 0
  private active = false
  private policy?: Policy

  constructor(private readonly channel: SatochipAPDUChannel) {}

  async inspect(): Promise<SatochipProtocolInfo> {
    return this.operation(async (generation) => {
      await this.select(generation)
      const policy = await this.readStatus(generation)
      compatible(policy)
      return publicInfo(policy)
    })
  }

  async connect(pin: string): Promise<Uint8Array> {
    const bytes = this.pin(pin)
    try {
      return await this.operation(async (generation) => {
        await this.select(generation)
        compatible(await this.readStatus(generation), true)
        await this.command(0x42, bytes, generation)
        this.key = await this.derive(generation)
        return this.key.slice()
      })
    } finally {
      bytes.fill(0)
    }
  }

  async setup(options: {
    pin: string
    puk?: string
    seed: Uint8Array
  }): Promise<SatochipProtocolInfo & { publicKey: Uint8Array }> {
    const pin = this.pin(options.pin)
    const puk = options.puk === undefined ? undefined : encoder.encode(options.puk)
    const seed = options.seed.slice()
    const secondaryPin = new Uint8Array(16)
    const secondaryPuk = new Uint8Array(16)
    try {
      if (seed.length !== 64) return input('A 64-byte BIP39 seed is required.')
      if (options.puk !== undefined && !/^[0-9a-f]{16}$/i.test(options.puk))
        return input('Use a 16-character hexadecimal PIN recovery code.')
      crypto.getRandomValues(secondaryPin)
      crypto.getRandomValues(secondaryPuk)
      return await this.operation(async (generation) => {
        await this.select(generation)
        const policy = await this.readStatus(generation)
        compatible(policy)
        if (policy.seeded) return input('This card already has a wallet; its seed will not be replaced.')
        if (!policy.needsSecureChannel) return input('Card setup requires a secure channel.')
        if (!policy.setupDone) {
          if (!puk) return input('Save a PIN recovery code before setting up the card.')
          const setup = concatBytes(
            Uint8Array.of(8),
            encoder.encode('Muscle00'),
            Uint8Array.of(5, 3, pin.length),
            pin,
            Uint8Array.of(puk.length),
            puk,
            Uint8Array.of(1, 1, 16),
            secondaryPin,
            Uint8Array.of(16),
            secondaryPuk,
            Uint8Array.of(0, 32, 0, 32, 1, 1, 1),
          )
          try {
            await this.command(0x2a, setup, generation)
          } finally {
            setup.fill(0)
          }
        }
        await this.command(0x42, pin, generation)
        await this.command(0x6c, seed, generation, seed.length)
        const initialized = await this.readStatus(generation)
        compatible(initialized, true)
        this.key = await this.derive(generation)
        return { ...publicInfo(initialized), publicKey: this.key.slice() }
      })
    } finally {
      pin.fill(0)
      puk?.fill(0)
      seed.fill(0)
      secondaryPin.fill(0)
      secondaryPuk.fill(0)
    }
  }

  async status(): Promise<SatochipProtocolInfo> {
    return this.operation(async (generation) => {
      const policy = await this.readStatus(generation)
      compatible(policy, this.key !== undefined)
      return publicInfo(policy)
    })
  }

  async getPublicKey(): Promise<Uint8Array> {
    return this.operation((generation) => this.boundKey(generation))
  }

  async signSchnorr(hash: Uint8Array, tweak: Uint8Array | null): Promise<Uint8Array> {
    if (hash.length !== 32) return input('A 32-byte hash is required.')
    if (tweak !== null && tweak.length !== 0 && tweak.length !== 32)
      return input('The Taproot tweak must be empty, 32 bytes, or null.')
    const digest = hash.slice()
    const root = tweak?.slice() ?? null
    return this.operation(async (generation) => {
      const key = await this.boundKey(generation)
      const response = await this.command(
        0x7c,
        concatBytes(Uint8Array.of(root?.length ?? 0), root ?? empty),
        generation,
        0xff,
        root === null ? 1 : 0,
      )
      if (response.length < 2 || response[0] * 256 + response[1] !== response.length - 2) return malformed()
      const stagedKey = response.slice(2)
      let expected: Uint8Array
      try {
        const parsed = secp256k1.Point.fromBytes(stagedKey).toBytes(true)
        expected = root === null ? key.slice(1) : taprootTweakPubkey(key.slice(1), root)[0]
        if (!equalBytes(parsed.subarray(1), expected)) return malformed()
      } catch {
        return malformed()
      }
      const signature = await this.command(0x7b, digest, generation)
      if (signature.length !== 64 || !schnorr.verify(signature, digest, expected)) return malformed()
      return signature
    })
  }

  async signEcdsa(hash: Uint8Array): Promise<Uint8Array> {
    if (hash.length !== 32) return input('A 32-byte hash is required.')
    const digest = hash.slice()
    return this.operation(async (generation) => {
      const key = await this.boundKey(generation)
      const signature = await this.command(0x7a, digest, generation, 0xff)
      if (!secp256k1.verify(signature, digest, key, { prehash: false, format: 'der', lowS: false })) return malformed()
      return signature
    })
  }

  async disconnect(): Promise<void> {
    this.generation++
    this.clear()
    await this.channel.disconnect()
  }

  private pin(pin: string): Uint8Array {
    if (!/^[0-9]{6,16}$/.test(pin)) return input('Use a 6–16 digit PIN.')
    return encoder.encode(pin)
  }

  private clear(): void {
    this.key?.fill(0)
    this.mac?.fill(0)
    this.key = undefined
    this.mac = undefined
    this.aes = undefined
    this.policy = undefined
    this.counter = 1
  }

  private current(generation: number): void {
    if (generation !== this.generation) throw new SatochipProtocolError('CANCELLED', 'Card connection was cancelled.')
  }

  private async operation<T>(work: (generation: number) => Promise<T>): Promise<T> {
    if (this.active) throw new SatochipProtocolError('BUSY', 'The card is busy. Wait for the current action to finish.')
    this.active = true
    const generation = this.generation
    try {
      await this.channel.beginOperation()
      this.current(generation)
      const result = await work(generation)
      this.current(generation)
      await this.channel.endOperation()
      this.current(generation)
      return result
    } catch (error) {
      if (generation !== this.generation) throw new SatochipProtocolError('CANCELLED', 'Card connection was cancelled.')
      if (generation === this.generation) await this.disconnect().catch(() => undefined)
      if (error instanceof SatochipProtocolError) throw error
      throw new SatochipProtocolError('CARD_REQUIRED', 'The card connection ended. Connect it again to continue.')
    } finally {
      this.active = false
    }
  }

  private async send(command: Uint8Array, generation: number): Promise<Uint8Array> {
    this.current(generation)
    try {
      const response = await this.channel.transmit(command)
      this.current(generation)
      if (!(response?.data instanceof Uint8Array) || response.data.length > 4096) return malformed()
      statusOK(response.statusWord)
      return response.data.slice()
    } finally {
      command.fill(0)
    }
  }

  private async select(generation: number): Promise<void> {
    this.clear()
    await this.send(apdu(0xa4, encoder.encode('SatoChip'), 4, 0, 0), generation)
  }

  private async readStatus(generation: number): Promise<Policy> {
    const data = await this.send(apdu(0x3c), generation)
    this.policy = checkedPolicy(data)
    return this.policy
  }

  private async derive(generation: number): Promise<Uint8Array> {
    return signedCoordinate(await this.command(0x6d, path, generation, 5, 0x40), true)
  }

  private async boundKey(generation: number): Promise<Uint8Array> {
    if (!this.key) return required()
    compatible(await this.readStatus(generation), true)
    const key = await this.derive(generation)
    if (!this.key || !equalBytes(this.key, key))
      throw new SatochipProtocolError('CARD_CHANGED', 'The connected card changed. Connect the original Satochip.')
    return key
  }

  private async secureChannel(generation: number): Promise<void> {
    if (this.aes && this.mac) return
    const secret = secp256k1.utils.randomSecretKey()
    let shared: Uint8Array | undefined
    let raw: Uint8Array | undefined
    try {
      const response = await this.send(apdu(0x81, secp256k1.getPublicKey(secret, false)), generation)
      const peer = signedCoordinate(response, false)
      shared = secp256k1.getSharedSecret(secret, peer, true).slice(1)
      raw = hmac(sha1, shared, encoder.encode('sc_key')).slice(0, 16)
      const imported = buffer(raw)
      let key: CryptoKey
      try {
        key = await crypto.subtle.importKey('raw', imported, 'AES-CBC', false, ['encrypt', 'decrypt'])
      } finally {
        new Uint8Array(imported).fill(0)
      }
      this.current(generation)
      this.aes = key
      this.mac = hmac(sha1, shared, encoder.encode('sc_mac'))
      this.counter = 1
    } finally {
      secret.fill(0)
      shared?.fill(0)
      raw?.fill(0)
    }
  }

  private async command(ins: number, data: Uint8Array, generation: number, p1 = 0, p2 = 0): Promise<Uint8Array> {
    const plain = apdu(ins, data, p1, p2)
    try {
      if (!this.policy) return required()
      if (!this.policy.needsSecureChannel) return await this.send(plain, generation)
      await this.secureChannel(generation)
      this.current(generation)
      if (!this.aes || !this.mac || this.counter > 0xfffffffd) return required()
      const iv = crypto.getRandomValues(new Uint8Array(16))
      new DataView(iv.buffer).setUint32(12, this.counter)
      this.counter += 2
      const serialized = buffer(plain)
      let encrypted: Uint8Array
      try {
        encrypted = new Uint8Array(
          await crypto.subtle.encrypt({ name: 'AES-CBC', iv: buffer(iv) }, this.aes, serialized),
        )
      } finally {
        new Uint8Array(serialized).fill(0)
      }
      this.current(generation)
      const authenticated = concatBytes(iv, u16(encrypted.length), encrypted)
      const wrapped = apdu(0x82, concatBytes(authenticated, u16(20), hmac(sha1, this.mac, authenticated)))
      const response = await this.send(wrapped, generation)
      if (response.length === 0) return response
      if (response.length < 34) return malformed()
      const length = response[16] * 256 + response[17]
      if (length !== response.length - 18 || length % 16 !== 0) return malformed()
      const decrypted = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-CBC', iv: buffer(response.slice(0, 16)) },
          this.aes,
          buffer(response.slice(18)),
        ),
      )
      this.current(generation)
      return decrypted
    } finally {
      plain.fill(0)
    }
  }
}
