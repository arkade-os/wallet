// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCipheriv, createDecipheriv, createECDH, createHmac, timingSafeEqual } from 'node:crypto'
import { secp256k1, schnorr } from '@noble/curves/secp256k1.js'
import { concatBytes, taprootTweakPrivKey } from '@scure/btc-signer/utils.js'
import { SatochipProtocol, type SatochipAPDUChannel } from '../../lib/satochipProtocol'
import javaFixture from './fixtures/satochip-java.json'

const secret = (value: number): Uint8Array => {
  const bytes = new Uint8Array(32)
  bytes[31] = value
  return bytes
}
const length = (data: Uint8Array): Uint8Array => concatBytes(Uint8Array.of(data.length >>> 8, data.length & 255), data)
const hex = (data: Uint8Array): string => Buffer.from(data).toString('hex')
const pin = '135790'
const digest = new Uint8Array(32).fill(7)

function proof(key: Uint8Array, derived: boolean): Uint8Array {
  const x = secp256k1.getPublicKey(key).slice(1)
  const message = concatBytes(derived ? new Uint8Array(32).fill(0x42) : new Uint8Array(), length(x))
  const signature = secp256k1.sign(message, key, { format: 'der' })
  const authenticated = concatBytes(message, length(signature))
  return concatBytes(authenticated, length(secp256k1.sign(authenticated, secret(4), { format: 'der' })))
}

class Applet implements SatochipAPDUChannel {
  wallet = secret(3)
  ephemeral = secret(2)
  statusBytes = Uint8Array.from([0, 16, 0, 1, 5, 3, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0])
  commands: Uint8Array[] = []
  wire: Uint8Array[] = []
  encryptKey?: Buffer
  macKey?: Buffer
  staged?: Uint8Array
  authenticated = false
  pinStatus = 0x9000
  corruptResponse?: 'length' | 'padding' | 'oversize' | 'proof' | 'signature'
  initialProof?: Uint8Array
  derivedProof?: Uint8Array
  derivedResponse?: Uint8Array
  failInstruction?: number
  pauseInstruction?: number
  release?: () => void
  beginOperation = vi.fn(async () => {})
  endOperation = vi.fn(async () => {})
  disconnect = vi.fn(async () => {
    this.authenticated = false
    this.encryptKey = undefined
    this.macKey = undefined
  })

  async transmit(command: Uint8Array): Promise<{ data: Uint8Array; statusWord: number }> {
    this.wire.push(command.slice())
    const ins = command[1]
    if (ins === 0xa4) {
      expect(hex(command)).toBe('00a40400085361746f43686970')
      this.authenticated = false
      return { data: new Uint8Array(), statusWord: 0x9000 }
    }
    if (ins === 0x3c) return { data: this.statusBytes.slice(), statusWord: 0x9000 }
    if (ins === 0x81) {
      const ecdh = createECDH('secp256k1')
      ecdh.setPrivateKey(this.ephemeral)
      const shared = ecdh.computeSecret(command.slice(5))
      this.encryptKey = createHmac('sha1', shared).update('sc_key').digest().subarray(0, 16)
      this.macKey = createHmac('sha1', shared).update('sc_mac').digest()
      const data = this.initialProof?.slice() ?? proof(this.ephemeral, false)
      if (this.corruptResponse === 'proof') data[10] ^= 1
      return { data, statusWord: 0x9000 }
    }
    expect(ins).toBe(0x82)
    expect(command.length).toBe(command[4] + 5)
    const payload = command.slice(5)
    const ciphertextLength = payload[16] * 256 + payload[17]
    const authenticated = payload.slice(0, 18 + ciphertextLength)
    const mac = payload.slice(20 + ciphertextLength)
    expect(payload[18 + ciphertextLength] * 256 + payload[19 + ciphertextLength]).toBe(20)
    expect(timingSafeEqual(createHmac('sha1', this.macKey!).update(authenticated).digest(), mac)).toBe(true)
    const decipher = createDecipheriv('aes-128-cbc', this.encryptKey!, payload.slice(0, 16))
    const plain = new Uint8Array(
      Buffer.concat([decipher.update(payload.slice(18, 18 + ciphertextLength)), decipher.final()]),
    )
    this.commands.push(plain.slice())
    expect(plain.length).toBe(plain[4] + 5)
    if (this.pauseInstruction === plain[1])
      await new Promise<void>((resolve) => {
        this.release = resolve
      })
    if (this.failInstruction === plain[1]) return { data: new Uint8Array(), statusWord: 0x9c06 }
    let data: Uint8Array = new Uint8Array()
    let statusWord = 0x9000
    switch (plain[1]) {
      case 0x42:
        expect(new TextDecoder().decode(plain.slice(5))).toBe(pin)
        this.authenticated = this.pinStatus === 0x9000
        statusWord = this.pinStatus
        break
      case 0x2a:
        expect(this.statusBytes[9]).toBe(0)
        this.statusBytes[10] = 1
        break
      case 0x6c:
        expect(this.authenticated).toBe(true)
        expect(plain[2]).toBe(64)
        expect(plain[4]).toBe(64)
        this.statusBytes[9] = 1
        break
      case 0x6d:
        expect(this.authenticated).toBe(true)
        expect(hex(plain)).toBe('b06d0540148000005680000001800000000000000000000000')
        data = this.derivedProof?.slice() ?? proof(this.wallet, true)
        break
      case 0x7c: {
        expect(this.authenticated).toBe(true)
        expect(plain[2]).toBe(0xff)
        expect(plain[5]).toBe(plain.length - 6)
        this.staged = plain[3] === 1 ? this.wallet.slice() : taprootTweakPrivKey(this.wallet, plain.slice(6))
        data = length(secp256k1.getPublicKey(this.staged, false))
        break
      }
      case 0x7b:
        expect(plain[2]).toBe(0)
        expect(plain[3]).toBe(0)
        data = schnorr.sign(plain.slice(5), this.staged!, new Uint8Array(32))
        if (this.corruptResponse === 'signature') data[0] ^= 1
        break
      case 0x7a:
        expect(plain[2]).toBe(0xff)
        data = secp256k1.sign(plain.slice(5), this.wallet, { prehash: false, format: 'der' })
        break
      default:
        throw new Error('Unexpected applet instruction')
    }
    if (statusWord !== 0x9000 || data.length === 0) return { data: new Uint8Array(), statusWord }
    if (plain[1] === 0x6d && this.derivedResponse) return { data: this.derivedResponse.slice(), statusWord }
    const iv = Buffer.from('505152535455565758595a5b00000002', 'hex')
    const cipher = createCipheriv('aes-128-cbc', this.encryptKey!, iv)
    const encrypted = new Uint8Array(Buffer.concat([cipher.update(data), cipher.final()]))
    const response = concatBytes(iv, length(encrypted))
    if (this.corruptResponse === 'length') response[17] ^= 1
    if (this.corruptResponse === 'padding') response[response.length - 1] ^= 0xff
    return { data: this.corruptResponse === 'oversize' ? new Uint8Array(4097) : response, statusWord }
  }
}

afterEach(() => vi.restoreAllMocks())

describe('Satochip protocol over a native raw APDU transport', () => {
  it('matches the pinned Java client AES/HMAC wire vectors and high-S signed proofs', async () => {
    vi.spyOn(secp256k1.utils, 'randomSecretKey').mockImplementation(() => secret(javaFixture.clientPrivateScalar))
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      if (!array) throw new Error('Missing randomness destination')
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
      for (let i = 0; i < bytes.length; i++) bytes[i] = i
      return array
    })
    const card = new Applet()
    card.initialProof = Uint8Array.from(Buffer.from(javaFixture.initProof, 'hex'))
    card.derivedProof = Uint8Array.from(Buffer.from(javaFixture.deriveProof, 'hex'))
    card.derivedResponse = Uint8Array.from(Buffer.from(javaFixture.encryptedResponse, 'hex'))
    const client = new SatochipProtocol(card)
    await expect(client.connect(pin)).resolves.toEqual(secp256k1.getPublicKey(secret(javaFixture.walletPrivateScalar)))
    expect(hex(card.wire.find((x) => x[1] === 0x81)!.slice(5))).toBe(javaFixture.clientPublicKey)
    expect(card.encryptKey!.toString('hex')).toBe(javaFixture.aesKey)
    expect(card.macKey!.toString('hex')).toBe(javaFixture.macKey)
    expect(card.wire.filter((x) => x[1] === 0x82).map(hex)).toEqual([javaFixture.verifyPin, javaFixture.derive])
  })

  it('inspects 0.16 policy without a PIN, secure session or writes', async () => {
    const card = new Applet()
    const client = new SatochipProtocol(card)
    await expect(client.inspect()).resolves.toMatchObject({ version: '0.16-0.1', ready: true, seeded: true })
    expect(card.wire.map((x) => x[1])).toEqual([0xa4, 0x3c])
    expect(card.beginOperation).toHaveBeenCalledOnce()
    expect(card.endOperation).toHaveBeenCalledOnce()
  })

  it('establishes interoperable raw-X ECDH/AES/HMAC and proves the signing key', async () => {
    const card = new Applet()
    const client = new SatochipProtocol(card)
    await expect(client.connect(pin)).resolves.toEqual(secp256k1.getPublicKey(card.wallet))
    expect(card.wire.map((x) => x[1])).toEqual([0xa4, 0x3c, 0x81, 0x82, 0x82])
    expect(card.commands.map((x) => x[1])).toEqual([0x42, 0x6d])
    const counters = card.wire.filter((x) => x[1] === 0x82).map((x) => new DataView(x.buffer).getUint32(17))
    expect(counters).toEqual([1, 3])
    await expect(client.getPublicKey()).resolves.toEqual(secp256k1.getPublicKey(card.wallet))
  })

  it.each([null, new Uint8Array(), new Uint8Array(32), new Uint8Array(32).fill(9)])(
    'stages each Schnorr mode on the same card session: %s',
    async (root) => {
      const card = new Applet()
      const client = new SatochipProtocol(card)
      await client.connect(pin)
      const signature = await client.signSchnorr(digest, root)
      expect(signature).toHaveLength(64)
      expect(card.commands.slice(-3).map((x) => x[1])).toEqual([0x6d, 0x7c, 0x7b])
      const staged = card.commands[card.commands.length - 2]
      expect(staged[3]).toBe(root === null ? 1 : 0)
      expect(staged[5]).toBe(root?.length ?? 0)
      expect(card.commands.filter((x) => x[1] === 0x42)).toHaveLength(1)
    },
  )

  it('verifies an ECDSA hash signature without host hashing it again', async () => {
    const card = new Applet()
    const client = new SatochipProtocol(card)
    await client.connect(pin)
    const signature = await client.signEcdsa(digest)
    expect(
      secp256k1.verify(signature, digest, secp256k1.getPublicKey(card.wallet), { prehash: false, format: 'der' }),
    ).toBe(true)
  })

  it('does not retry a wrong PIN or authentication expiry', async () => {
    const card = new Applet()
    card.pinStatus = 0x63c4
    const client = new SatochipProtocol(card)
    await expect(client.connect(pin)).rejects.toMatchObject({ code: 'WRONG_PIN' })
    expect(card.commands.map((x) => x[1])).toEqual([0x42])
    expect(card.disconnect).toHaveBeenCalledOnce()
    card.pinStatus = 0x9000
    await client.connect(pin)
    card.failInstruction = 0x6d
    await expect(client.signSchnorr(digest, null)).rejects.toThrow('no PIN retry')
    expect(card.commands.filter((x) => x[1] === 0x42)).toHaveLength(2)
    expect(card.commands.filter((x) => x[1] === 0x7b)).toHaveLength(0)
  })

  it('binds each signature to the original derived key', async () => {
    const card = new Applet()
    const client = new SatochipProtocol(card)
    await client.connect(pin)
    card.wallet = secret(8)
    await expect(client.signSchnorr(digest, null)).rejects.toMatchObject({ code: 'CARD_CHANGED' })
    expect(card.commands.some((x) => x[1] === 0x7b)).toBe(false)
    expect(card.disconnect).toHaveBeenCalledOnce()
  })

  it.each(['length', 'padding', 'oversize', 'proof'] as const)(
    'fails closed on malformed secure-channel response: %s',
    async (corruption) => {
      const card = new Applet()
      card.corruptResponse = corruption
      await expect(new SatochipProtocol(card).connect(pin)).rejects.toThrow()
      expect(card.disconnect).toHaveBeenCalledOnce()
    },
  )

  it('rejects an invalid returned signature', async () => {
    const card = new Applet()
    const client = new SatochipProtocol(card)
    await client.connect(pin)
    card.corruptResponse = 'signature'
    await expect(client.signSchnorr(digest, null)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    expect(card.disconnect).toHaveBeenCalledOnce()
  })

  it('refuses setup of an initialized card before sending any credential or seed', async () => {
    const card = new Applet()
    await expect(
      new SatochipProtocol(card).setup({ pin, puk: '0123456789abcdef', seed: new Uint8Array(64) }),
    ).rejects.toThrow('will not be replaced')
    expect(card.wire.map((x) => x[1])).toEqual([0xa4, 0x3c])
    expect(card.commands).toHaveLength(0)
  })

  it('sets up a blank card only on explicit request and imports the provided seed once', async () => {
    const card = new Applet()
    card.statusBytes[9] = 0
    card.statusBytes[10] = 0
    const seed = new Uint8Array(64).fill(0x39)
    const result = await new SatochipProtocol(card).setup({ pin, puk: '0123456789abcdef', seed })
    expect(result.ready).toBe(true)
    expect(result.publicKey).toEqual(secp256k1.getPublicKey(card.wallet))
    expect(card.commands.map((x) => x[1])).toEqual([0x2a, 0x42, 0x6c, 0x6d])
    expect(card.commands.find((x) => x[1] === 0x6c)!.slice(5)).toEqual(seed)
    const setup = card.commands[0]
    expect(hex(setup.slice(-7))).toBe('00200020010101')
    expect(hex(setup.slice(5, 14))).toBe('084d7573636c653030')
    expect(setup.slice(14, 17)).toEqual(Uint8Array.of(5, 3, pin.length))
    expect(seed.every((x) => x === 0x39)).toBe(true)
  })

  it('never creates credentials while inspecting a blank card', async () => {
    const card = new Applet()
    card.statusBytes[9] = 0
    card.statusBytes[10] = 0
    await expect(new SatochipProtocol(card).inspect()).resolves.toMatchObject({
      ready: false,
      seeded: false,
      setupDone: false,
    })
    expect(card.commands).toHaveLength(0)
  })

  it('rejects unsupported policy before sending PIN data', async () => {
    const card = new Applet()
    card.statusBytes[14] = 1
    await expect(new SatochipProtocol(card).connect(pin)).rejects.toThrow('untweaked Schnorr')
    expect(card.commands).toHaveLength(0)
  })

  it('cancels a pending response without reviving the session or retrying', async () => {
    const card = new Applet()
    const client = new SatochipProtocol(card)
    await client.connect(pin)
    card.pauseInstruction = 0x6d
    const signing = client.signSchnorr(digest, null)
    await vi.waitFor(() => expect(card.release).toBeTypeOf('function'))
    await client.disconnect()
    card.release!()
    await expect(signing).rejects.toMatchObject({ code: 'CANCELLED' })
    expect(card.commands.some((x) => x[1] === 0x7b)).toBe(false)
    expect(card.disconnect).toHaveBeenCalledOnce()
  })

  it('rejects concurrent signing while retaining the active operation', async () => {
    const card = new Applet()
    const client = new SatochipProtocol(card)
    await client.connect(pin)
    card.pauseInstruction = 0x6d
    const signing = client.signSchnorr(digest, null)
    await vi.waitFor(() => expect(card.release).toBeTypeOf('function'))
    await expect(client.signEcdsa(digest)).rejects.toMatchObject({ code: 'BUSY' })
    card.release!()
    await expect(signing).resolves.toHaveLength(64)
    expect(card.disconnect).not.toHaveBeenCalled()
  })
})
