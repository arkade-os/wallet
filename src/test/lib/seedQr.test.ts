// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mnemonicToEntropy } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import encodeQR from 'qr'
import decodeQR from 'qr/decode.js'
import { bytesToLatin1, decodeSeedQr, SeedQrError } from '../../lib/seedQr'
import { BYTEWORDS, crc32, decodeBytewordsMinimal, decodeCbor, parseUrHeader, UrError } from '../../lib/ur'

/**
 * Vectors here are external wherever one exists, because a codec that only
 * agrees with itself proves nothing about interoperability — and the whole
 * point of this feature is reading a backup some OTHER device wrote.
 *
 *  - Standard SeedQR: the worked example in SeedSigner's own `docs/seed_qr`.
 *  - UR seed: Blockchain Commons' "Yinmn Blue" test vector, the one published
 *    at developer.blockchaincommons.com/ur/vectors/seeds.
 *  - CompactSeedQR: no canonical published string exists (it is raw bytes), so
 *    the entropy comes from @scure/bip39, an independent implementation.
 */

/** SeedSigner's documented example seed and its Standard SeedQR digit stream. */
const SEEDSIGNER_MNEMONIC = 'vacuum bridge buddy supreme exclude milk consider tail expand wasp pattern nuclear'
const SEEDSIGNER_DIGITS = '192402220235174306311124037817700641198012901210'

/** Blockchain Commons "Yinmn Blue Acid Exam" — a 128-bit seed with name, note and date. */
const YINMN_BLUE_UR =
  'ur:seed/oxadgdhkwzdtfthptokigtvwnnjsqzcxknsktdaosecyidbbwnnnaxjyhkinjtjnjtcxfwjzkpihcxfpiainiecxfekshsjnaaksdighisinjkcxinjkcxjlkpjpcxjkjyhsjtiehsjpiecxeheyetdpidinjycxjyihjkjycxjkihihiedmksjpaate'
const YINMN_BLUE_SEED = '59f2293a5bce7d4de59e71b4207ac5d2'

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

describe('Bytewords and UR', () => {
  /**
   * BCR-2020-012 guarantees 256 four-letter words whose (first, last) letter
   * pairs are all distinct — that uniqueness is what makes minimal encoding
   * decodable at all. A transcription slip in the table would collapse two
   * pairs onto one byte and silently decode the wrong seed, so pin it here.
   */
  it('carries all 256 Bytewords with unique minimal pairs', () => {
    expect(BYTEWORDS).toMatch(/^[a-z]{1024}$/)
    const words = BYTEWORDS.match(/.{4}/g) ?? []
    expect(words).toHaveLength(256)
    expect(new Set(words).size).toBe(256)
    expect(new Set(words.map((word) => word[0] + word[3])).size).toBe(256)
  })

  it('CRC-32 matches the ISO-HDLC check value', () => {
    // "123456789" -> 0xCBF43926, the standard CRC-32 check vector.
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('parses the Blockchain Commons seed vector down to its CBOR map', () => {
    const { type, sequence, encoded } = parseUrHeader(YINMN_BLUE_UR)
    expect(type).toBe('seed')
    expect(sequence).toBeUndefined()

    const map = decodeCbor(decodeBytewordsMinimal(encoded))
    expect(map).toBeInstanceOf(Map)
    const fields = map as Map<number, unknown>
    expect(toHex(fields.get(1) as Uint8Array)).toBe(YINMN_BLUE_SEED)
    expect(fields.get(3)).toBe('Yinmn Blue Acid Exam')
    expect(fields.get(4)).toBe('This is our standard 128-bit test seed.')
    expect(fields.get(2)).toEqual({ tag: 1, value: 1645539742 })
  })

  it('accepts URs uppercased for alphanumeric QR mode', () => {
    expect(parseUrHeader(YINMN_BLUE_UR.toUpperCase()).type).toBe('seed')
  })

  it('rejects a UR whose payload was corrupted in transit', () => {
    // Swap two adjacent Bytewords so the length survives but the CRC-32 does not.
    const corrupted = parseUrHeader(YINMN_BLUE_UR.replace('hkwzdtft', 'dtfthkwz')).encoded
    expect(() => decodeBytewordsMinimal(corrupted)).toThrow(UrError)
    expect(() => decodeBytewordsMinimal(corrupted)).toThrow(/checksum/i)
  })

  it('rejects Bytewords pairs outside the 256-word list', () => {
    expect(() => decodeBytewordsMinimal('qqqqqqqqqqqq')).toThrow(/Unknown Bytewords pair/)
  })
})

describe('decodeSeedQr — Standard SeedQR', () => {
  it("reads SeedSigner's documented digit stream", () => {
    expect(decodeSeedQr(SEEDSIGNER_DIGITS)).toEqual({
      mnemonic: SEEDSIGNER_MNEMONIC,
      format: 'standard',
      words: 12,
    })
  })

  it('reads a 24-word SeedQR', () => {
    // BIP-39's own 256-bit test vector (all-0xff entropy).
    const mnemonic =
      'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo ' + 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote'
    const digits = mnemonic
      .split(' ')
      .map((word) => String(wordlist.indexOf(word)).padStart(4, '0'))
      .join('')
    expect(digits).toHaveLength(96)
    expect(decodeSeedQr(digits)).toEqual({ mnemonic, format: 'standard', words: 24 })
  })

  it('rejects a digit stream whose BIP-39 checksum does not match', () => {
    // Bump the last word's index; length and every index stay in range.
    const tampered = SEEDSIGNER_DIGITS.slice(0, -4) + '1211'
    expect(() => decodeSeedQr(tampered)).toThrow(/checksum/i)
  })

  it('rejects an out-of-range word index', () => {
    expect(() => decodeSeedQr('9999' + SEEDSIGNER_DIGITS.slice(4))).toThrow(/not a BIP-39 word index/)
  })

  it('explains a digit payload of the wrong length', () => {
    expect(() => decodeSeedQr('1234567890')).toThrow(/four digits per word/)
  })
})

describe('decodeSeedQr — CompactSeedQR', () => {
  it('reads raw entropy delivered as latin1 bytes', () => {
    const entropy = mnemonicToEntropy(SEEDSIGNER_MNEMONIC, wordlist)
    expect(entropy).toHaveLength(16)
    expect(decodeSeedQr(bytesToLatin1(entropy))).toEqual({
      mnemonic: SEEDSIGNER_MNEMONIC,
      format: 'compact',
      words: 12,
    })
  })

  it('reads every BIP-39 entropy size', () => {
    for (const [size, words] of [
      [16, 12],
      [20, 15],
      [24, 18],
      [28, 21],
      [32, 24],
    ] as const) {
      const entropy = new Uint8Array(size).fill(0x2a)
      const result = decodeSeedQr(bytesToLatin1(entropy))
      expect(result.format).toBe('compact')
      expect(result.words).toBe(words)
      expect(mnemonicToEntropy(result.mnemonic, wordlist)).toEqual(entropy)
    }
  })

  it('rejects a byte payload that is not a BIP-39 entropy size', () => {
    expect(() => decodeSeedQr(bytesToLatin1(new Uint8Array(18).fill(0xff)))).toThrow(SeedQrError)
  })

  /**
   * The end-to-end proof, and the reason the seed scanner runs in `binary` mode:
   * a real byte-mode QR is encoded, rasterised and pushed through the same
   * decoder the scanner uses, wired to the same `bytesToLatin1`. Testing
   * `decodeSeedQr` alone cannot catch a decoder that mangles bytes on the way
   * in — this can, and it is the failure that would silently lose a seed.
   */
  it('survives a round trip through the real QR encoder and decoder', () => {
    const entropy = mnemonicToEntropy(SEEDSIGNER_MNEMONIC, wordlist)
    const latin1ToBytes = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0))

    const matrix = encodeQR(bytesToLatin1(entropy), 'raw', {
      ecc: 'low',
      encoding: 'byte',
      textEncoder: latin1ToBytes,
      border: 4,
    })

    // Rasterise the module matrix into the RGBA image decodeQR expects.
    const scale = 4
    const size = matrix.length * scale
    const data = new Uint8Array(size * size * 4).fill(0xff)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!matrix[(y / scale) | 0][(x / scale) | 0]) continue
        const at = (y * size + x) * 4
        data[at] = data[at + 1] = data[at + 2] = 0
      }
    }

    const scanned = decodeQR({ width: size, height: size, data }, { textDecoder: bytesToLatin1 })
    expect(decodeSeedQr(scanned)).toEqual({
      mnemonic: SEEDSIGNER_MNEMONIC,
      format: 'compact',
      words: 12,
    })
  })
})

describe('decodeSeedQr — UR seed', () => {
  it('reads the Blockchain Commons vector as a mnemonic', () => {
    const result = decodeSeedQr(YINMN_BLUE_UR)
    expect(result.format).toBe('ur')
    expect(result.words).toBe(12)
    expect(toHex(mnemonicToEntropy(result.mnemonic, wordlist))).toBe(YINMN_BLUE_SEED)
  })

  it('accepts the legacy ur:crypto-seed type name', () => {
    // Only the type label changed in 2023; the Bytewords body and its CRC did not.
    const legacy = YINMN_BLUE_UR.replace('ur:seed/', 'ur:crypto-seed/')
    expect(decodeSeedQr(legacy).format).toBe('ur')
  })

  it('says which frame it saw when handed an animated QR', () => {
    const framed = YINMN_BLUE_UR.replace('ur:seed/', 'ur:seed/2-7/')
    expect(() => decodeSeedQr(framed)).toThrow(/frame 2 of a 7-frame animated QR/)
  })

  it('names a watch-only export rather than calling it unreadable', () => {
    const hdkey = YINMN_BLUE_UR.replace('ur:seed/', 'ur:crypto-hdkey/')
    expect(() => decodeSeedQr(hdkey)).toThrow(/public key \(ur:crypto-hdkey\)/)
  })

  it('rejects an unsupported UR type', () => {
    const psbt = YINMN_BLUE_UR.replace('ur:seed/', 'ur:crypto-psbt/')
    expect(() => decodeSeedQr(psbt)).toThrow(/Unsupported UR type: ur:crypto-psbt/)
  })

  it('names the type even when the body would fail its checksum', () => {
    // A half-captured frame of a PSBT is the realistic version of this: the type
    // is legible from the URI long before the body is, and it is the useful part.
    expect(() => decodeSeedQr('ur:crypto-psbt/hdcxlpkidmadjthpsngdcpgh')).toThrow(/ur:crypto-psbt/)
    expect(() => decodeSeedQr('ur:seed/3-9/hdcxlpkidmadjthpsngdcpgh')).toThrow(/frame 3 of a 9-frame/)
  })

  it('rejects a seed UR whose Bytewords are damaged', () => {
    const corrupted = YINMN_BLUE_UR.replace('hkwzdtft', 'dtfthkwz')
    expect(() => decodeSeedQr(corrupted)).toThrow(SeedQrError)
    expect(() => decodeSeedQr(corrupted)).toThrow(/checksum mismatch/i)
  })
})

describe('decodeSeedQr — plain phrases and rejections', () => {
  it('reads a mnemonic written straight into a QR, normalising whitespace and case', () => {
    const messy = `  ${SEEDSIGNER_MNEMONIC.toUpperCase().replace(/ /g, '\n')}  `
    expect(decodeSeedQr(messy)).toEqual({
      mnemonic: SEEDSIGNER_MNEMONIC,
      format: 'plain',
      words: 12,
    })
  })

  it('rejects a phrase-shaped payload that fails BIP-39 validation', () => {
    const wrong = SEEDSIGNER_MNEMONIC.replace('nuclear', 'vacuum')
    expect(() => decodeSeedQr(wrong)).toThrow(/not a valid BIP-39 phrase/)
  })

  it('names an extended key', () => {
    const xpub =
      'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8'
    expect(() => decodeSeedQr(xpub)).toThrow(/extended key, not a seed/)
  })

  it('rejects an empty QR and unrelated payloads', () => {
    expect(() => decodeSeedQr('   ')).toThrow(/empty/)
    expect(() => decodeSeedQr('https://arkade.computer')).toThrow(/not a recovery backup/)
  })

  it('says so when entropy arrived through a UTF-8 decoder', () => {
    // What a scanner without byte-accurate decoding hands back for a CompactSeedQR.
    const mangled = new TextDecoder().decode(new Uint8Array(16).fill(0x9f))
    expect(() => decodeSeedQr(mangled)).toThrow(/could not read losslessly/)
  })
})
