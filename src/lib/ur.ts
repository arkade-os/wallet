/**
 * Minimal decoder for Blockchain Commons Uniform Resources (UR) — the format
 * air-gapped signers (Jade, Keystone, Passport, Krux) use to move key material
 * across a camera gap, and the one Nunchuk speaks when it adds an air-gapped key.
 *
 * Scope is deliberately narrow: a SINGLE-PART UR. Multi-part (animated) URs use
 * Luby-transform fountain codes, which exist because PSBTs and output descriptors
 * do not fit in one symbol. A seed does: 16–32 bytes of entropy wrapped in CBOR
 * and Bytewords lands around 50–80 characters, well inside a version-4 QR. So a
 * seed backup is never legitimately animated, and refusing multi-part here costs
 * no interoperability while saving the fountain decoder entirely.
 *
 * Specs: BCR-2020-005 (UR), BCR-2020-006 (type registry), BCR-2020-012 (Bytewords).
 */

/**
 * The 256 Bytewords, in index order (BCR-2020-012). Every word is four letters
 * and every (first, last) letter pair is unique across the list — that pair IS
 * the "minimal" encoding used inside URs, two characters per byte.
 */
// prettier-ignore
export const BYTEWORDS =
  'ableacidalsoapexaquaarchatomaunt' +
  'awayaxisbackbaldbarnbeltbetabias' +
  'bluebodybragbrewbulbbuzzcalmcash' +
  'catschefcityclawcodecolacookcost' +
  'cruxcurlcuspcyandarkdatadaysdeli' +
  'dicedietdoordowndrawdropdrumdull' +
  'dutyeacheasyechoedgeepicevenexam' +
  'exiteyesfactfairfernfigsfilmfish' +
  'fizzflapflewfluxfoxyfreefrogfuel' +
  'fundgalagamegeargemsgiftgirlglow' +
  'goodgraygrimgurugushgyrohalfhang' +
  'hardhawkheathelphighhillholyhope' +
  'hornhutsicedideaidleinchinkyinto' +
  'irisironitemjadejazzjoinjoltjowl' +
  'judojugsjumpjunkjurykeepkenokept' +
  'keyskickkilnkingkitekiwiknoblamb' +
  'lavalazyleaflegsliarlimplionlist' +
  'logoloudloveluaulucklungmainmany' +
  'mathmazememomenumeowmildmintmiss' +
  'monknailnavyneednewsnextnoonnote' +
  'numbobeyoboeomitonyxopenovalowls' +
  'paidpartpeckplaypluspoempoolpose' +
  'puffpumapurrquadquizracerampreal' +
  'redorichroadrockroofrubyruinruns' +
  'rustsafesagascarsetssilkskewslot' +
  'soapsolosongstubsurfswantacotask' +
  'taxitenttiedtimetinytoiltombtoys' +
  'triptunatwinuglyundouniturgeuser' +
  'vastveryvetovialvibeviewvisavoid' +
  'vowswallwandwarmwaspwavewaxywebs' +
  'whatwhenwhizwolfworkyankyawnyell' +
  'yogayurtzapszerozestzinczonezoom'

/** Two-letter minimal code -> byte value. Built once from {@link BYTEWORDS}. */
const MINIMAL_BYTEWORDS: Map<string, number> = new Map(
  Array.from({ length: BYTEWORDS.length / 4 }, (_, i) => {
    const word = BYTEWORDS.slice(i * 4, i * 4 + 4)
    return [word[0] + word[3], i] as const
  }),
)

/** CRC-32/ISO-HDLC table (reflected polynomial 0xEDB88320). */
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

/** CRC-32 of `bytes`, as an unsigned 32-bit number. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** Raised when a payload is not a well-formed UR. */
export class UrError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UrError'
  }
}

/**
 * Decodes minimal-style Bytewords and strips the trailing CRC-32, which is
 * verified against the body. The checksum is what makes a hand-transcribed or
 * partially-obscured UR fail loudly instead of yielding the wrong key.
 */
export function decodeBytewordsMinimal(encoded: string): Uint8Array {
  if (encoded.length % 2 !== 0) throw new UrError('Bytewords payload has an odd length')
  if (encoded.length < 10) throw new UrError('Bytewords payload is too short to carry a checksum')

  const bytes = new Uint8Array(encoded.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    const code = encoded.slice(i * 2, i * 2 + 2)
    const value = MINIMAL_BYTEWORDS.get(code)
    if (value === undefined) throw new UrError(`Unknown Bytewords pair "${code}"`)
    bytes[i] = value
  }

  const body = bytes.subarray(0, bytes.length - 4)
  const checksum = new DataView(bytes.buffer, bytes.byteOffset + body.length, 4).getUint32(0, false)
  if (crc32(body) !== checksum) throw new UrError('Bytewords checksum mismatch')
  return body.slice()
}

export interface UrHeader {
  /** UR type, lowercased — e.g. `seed`, `crypto-seed`, `hdkey`. */
  type: string
  /** Present only for multi-part URs: the 1-based frame index and frame count. */
  sequence?: { index: number; total: number }
  /** The undecoded Bytewords body. */
  encoded: string
}

const UR_PATTERN = /^ur:([a-z][a-z0-9-]*)\/(?:(\d+)-(\d+)\/)?([a-z]+)$/

/**
 * Reads the `ur:<type>/[<seq>-<count>/]<bytewords>` envelope without decoding
 * the body. Type and sequence live in the URI, so a caller can reject a PSBT or
 * a single animation frame by name — even when the body would not survive its
 * checksum, which is exactly when a generic "unreadable" error helps least.
 *
 * URs are case-insensitive by design: encoders uppercase them so the QR can use
 * alphanumeric mode, which is denser than byte mode, so we lowercase first.
 */
export function parseUrHeader(text: string): UrHeader {
  const match = UR_PATTERN.exec(text.trim().toLowerCase())
  if (!match) throw new UrError('Not a well-formed UR')
  const [, type, index, total, encoded] = match
  return { type, sequence: index ? { index: Number(index), total: Number(total) } : undefined, encoded }
}

export type CborValue =
  | number
  | Uint8Array
  | string
  | boolean
  | null
  | undefined
  | CborValue[]
  | Map<CborValue, CborValue>
  | CborTagged

export interface CborTagged {
  tag: number
  value: CborValue
}

export const isCborTagged = (value: CborValue): value is CborTagged =>
  typeof value === 'object' && value !== null && 'tag' in value

/**
 * Just enough CBOR (RFC 8949) to read a UR body: definite-length items only,
 * which is all the UR registry emits. Indefinite-length items and 64-bit
 * integers beyond Number.MAX_SAFE_INTEGER are rejected rather than approximated
 * — this parser handles key material, so a wrong answer is worse than no answer.
 */
export function decodeCbor(bytes: Uint8Array): CborValue {
  const reader = new CborReader(bytes)
  const value = reader.read()
  if (!reader.done) throw new UrError('Trailing bytes after CBOR item')
  return value
}

class CborReader {
  private offset = 0
  private readonly view: DataView

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  get done(): boolean {
    return this.offset === this.bytes.length
  }

  read(): CborValue {
    const initial = this.byte()
    const major = initial >> 5
    const minor = initial & 0x1f

    switch (major) {
      case 0:
        return this.argument(minor)
      case 1:
        return -1 - this.argument(minor)
      case 2:
        return this.slice(this.argument(minor))
      case 3:
        return new TextDecoder().decode(this.slice(this.argument(minor)))
      case 4:
        return Array.from({ length: this.argument(minor) }, () => this.read())
      case 5: {
        const size = this.argument(minor)
        const map = new Map<CborValue, CborValue>()
        for (let i = 0; i < size; i++) map.set(this.read(), this.read())
        return map
      }
      case 6:
        return { tag: this.argument(minor), value: this.read() }
      default:
        return this.simple(minor)
    }
  }

  /** Reads the argument that follows an initial byte (RFC 8949 §3). */
  private argument(minor: number): number {
    if (minor < 24) return minor
    switch (minor) {
      case 24:
        return this.byte()
      case 25:
        return this.uint(2)
      case 26:
        return this.uint(4)
      case 27: {
        const value = this.view.getBigUint64(this.take(8), false)
        if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new UrError('CBOR integer exceeds safe range')
        return Number(value)
      }
      default:
        throw new UrError('Indefinite-length CBOR items are not supported')
    }
  }

  private simple(minor: number): CborValue {
    switch (minor) {
      case 20:
        return false
      case 21:
        return true
      case 22:
        return null
      case 23:
        return undefined
      case 25:
        return this.float16()
      case 26:
        return this.view.getFloat32(this.take(4), false)
      case 27:
        return this.view.getFloat64(this.take(8), false)
      default:
        throw new UrError(`Unsupported CBOR simple value ${minor}`)
    }
  }

  private float16(): number {
    const bits = this.uint(2)
    const sign = bits & 0x8000 ? -1 : 1
    const exponent = (bits >> 10) & 0x1f
    const fraction = bits & 0x3ff
    if (exponent === 0) return sign * 2 ** -24 * fraction
    if (exponent === 0x1f) return fraction ? NaN : sign * Infinity
    return sign * 2 ** (exponent - 25) * (1024 + fraction)
  }

  private byte(): number {
    return this.bytes[this.take(1)]
  }

  private uint(size: 2 | 4): number {
    const at = this.take(size)
    return size === 2 ? this.view.getUint16(at, false) : this.view.getUint32(at, false)
  }

  private slice(length: number): Uint8Array {
    return this.bytes.slice(this.take(length), this.offset)
  }

  /** Reserves `length` bytes and returns the offset they start at. */
  private take(length: number): number {
    if (this.offset + length > this.bytes.length) throw new UrError('Truncated CBOR item')
    const at = this.offset
    this.offset += length
    return at
  }
}
