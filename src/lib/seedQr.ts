import { entropyToMnemonic, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { decodeBytewordsMinimal, decodeCbor, isCborTagged, parseUrHeader, UrError, type CborValue } from './ur'

/**
 * Recovery-backup QR formats this wallet can read.
 *
 * These are the four ways a BIP-39 seed actually travels on a QR in the wild.
 * All of them are lossless and offline: nothing here contacts a server, and
 * nothing here needs a companion device — a phone camera and a metal plate or a
 * signer's screen are the whole system.
 */
export type SeedQrFormat = 'standard' | 'compact' | 'ur' | 'plain'

export const SEED_QR_FORMAT_LABEL: Record<SeedQrFormat, string> = {
  standard: 'SeedQR',
  compact: 'CompactSeedQR',
  ur: 'UR seed',
  plain: 'Recovery phrase',
}

export interface SeedQrScan {
  /** The BIP-39 mnemonic the QR carried, checksum already verified. */
  mnemonic: string
  format: SeedQrFormat
  words: number
}

export class SeedQrError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SeedQrError'
  }
}

/** Entropy sizes BIP-39 admits, in bytes: 12, 15, 18, 21 and 24 words. */
const ENTROPY_SIZES = new Set([16, 20, 24, 28, 32])

/** Standard SeedQR digit counts — four zero-padded digits per word. */
const SEEDQR_DIGIT_COUNTS = new Set([48, 60, 72, 84, 96])

/** UR types that carry a seed. The `crypto-` prefix was dropped in 2023; both remain in circulation. */
const SEED_UR_TYPES = new Set(['seed', 'crypto-seed'])

/**
 * UR types that are valid backups of something else. Naming them lets the error
 * say what the user actually scanned, which is the difference between "try
 * again" and knowing to go export a different QR from the same device.
 */
const WATCH_ONLY_UR_TYPES = new Set([
  'hdkey',
  'crypto-hdkey',
  'account-descriptor',
  'crypto-account',
  'output',
  'crypto-output',
])

/**
 * The scanner hands us a string, so binary QR payloads (CompactSeedQR is raw
 * entropy in byte mode) arrive latin1-encoded: one character per byte, code
 * point equal to the byte. Returns null when the string holds anything above
 * U+00FF, which means it was real text and never a byte payload.
 */
function latin1ToBytes(text: string): Uint8Array | null {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code > 0xff) return null
    bytes[i] = code
  }
  return bytes
}

/** Inverse of {@link latin1ToBytes} — the decoder the seed scanner installs. */
export function bytesToLatin1(bytes: Uint8Array): string {
  let text = ''
  for (const byte of bytes) text += String.fromCharCode(byte)
  return text
}

const mnemonicFromEntropy = (entropy: Uint8Array): string => entropyToMnemonic(entropy, wordlist)

const scan = (mnemonic: string, format: SeedQrFormat): SeedQrScan => ({
  mnemonic,
  format,
  words: mnemonic.split(' ').length,
})

/**
 * Standard SeedQR (SeedSigner): every BIP-39 index as four zero-padded digits,
 * concatenated. Numeric QR mode makes it dense enough to transcribe by hand,
 * and any QR reader shows the digits, so the backup stays recoverable even
 * without this wallet.
 */
function decodeStandardSeedQr(digits: string): SeedQrScan {
  const words = (digits.match(/.{4}/g) ?? []).map((group) => {
    const index = Number(group)
    if (index > 2047) throw new SeedQrError(`"${group}" is not a BIP-39 word index — indexes run 0000 to 2047`)
    return wordlist[index]
  })
  const mnemonic = words.join(' ')
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new SeedQrError('That SeedQR decoded to an invalid recovery phrase — its checksum does not match')
  }
  return scan(mnemonic, 'standard')
}

/**
 * CompactSeedQR (SeedSigner): the raw entropy in byte mode, checksum bits
 * dropped because BIP-39 derives them. Roughly 40% fewer modules than Standard,
 * which is why punched metal plates use it — and why the seed scanner needs a
 * byte-accurate decoder rather than a UTF-8 one.
 */
function decodeCompactSeedQr(entropy: Uint8Array): SeedQrScan {
  return scan(mnemonicFromEntropy(entropy), 'compact')
}

/** Pulls the seed payload out of a decoded `ur:seed` CBOR map (BCR-2020-006 key 1). */
function seedPayloadFromCbor(value: CborValue): Uint8Array {
  const body = isCborTagged(value) ? value.value : value
  if (!(body instanceof Map)) throw new SeedQrError('That UR seed is malformed — expected a CBOR map')
  const payload = body.get(1)
  if (!(payload instanceof Uint8Array)) throw new SeedQrError('That UR seed carries no seed payload')
  return payload
}

/**
 * Blockchain Commons UR — what Jade, Keystone, Passport and Krux export and
 * what Nunchuk reads. Single-part only, by design: see the note in `ur.ts`.
 */
function decodeUrSeed(text: string): SeedQrScan {
  // Type and sequence are read from the URI first, so a PSBT or an animation
  // frame is named as such even when its body would fail the checksum.
  const { type, sequence, encoded } = parseUrHeader(text)

  if (sequence) {
    throw new SeedQrError(
      `That is frame ${sequence.index} of a ${sequence.total}-frame animated QR. A seed fits in one QR — export a static one.`,
    )
  }
  if (WATCH_ONLY_UR_TYPES.has(type)) {
    throw new SeedQrError(
      `That QR holds a public key (ur:${type}), not a seed. Arkade needs the recovery phrase itself to restore a spendable wallet.`,
    )
  }
  if (!SEED_UR_TYPES.has(type)) throw new SeedQrError(`Unsupported UR type: ur:${type}`)

  const entropy = seedPayloadFromCbor(decodeCbor(decodeBytewordsMinimal(encoded)))
  if (!ENTROPY_SIZES.has(entropy.length)) {
    throw new SeedQrError(`That UR seed carries ${entropy.length} bytes of entropy, which is not a BIP-39 seed size`)
  }
  return scan(mnemonicFromEntropy(entropy), 'ur')
}

/**
 * Reads any supported recovery backup off a scanned QR.
 *
 * `scanned` must come from a byte-accurate scanner: CompactSeedQR is raw
 * entropy, so a UTF-8 decoder would replace invalid sequences with U+FFFD and
 * destroy the seed. {@link bytesToLatin1} is the decoder that preserves it.
 *
 * @throws {SeedQrError} when the payload is not a recovery backup, naming what
 * it appeared to be whenever that is recoverable from the payload itself.
 */
export function decodeSeedQr(scanned: string): SeedQrScan {
  const text = scanned.trim()
  if (!text) throw new SeedQrError('That QR was empty')

  if (/^ur:/i.test(text)) {
    try {
      return decodeUrSeed(text)
    } catch (err) {
      throw err instanceof UrError ? new SeedQrError(`${err.message} — that UR is not readable as a seed`) : err
    }
  }

  if (/^\d+$/.test(text)) {
    if (SEEDQR_DIGIT_COUNTS.has(text.length)) return decodeStandardSeedQr(text)
    throw new SeedQrError(
      `That QR holds ${text.length} digits. A SeedQR holds four digits per word — 48 for 12 words, 96 for 24.`,
    )
  }

  // A mnemonic written straight into a QR: lowercase words, any whitespace.
  const words = text.toLowerCase().split(/\s+/)
  if (words.length >= 12 && words.length <= 24 && words.every((word) => /^[a-z]+$/.test(word))) {
    const mnemonic = words.join(' ')
    if (validateMnemonic(mnemonic, wordlist)) return scan(mnemonic, 'plain')
    throw new SeedQrError('That looks like a recovery phrase, but it is not a valid BIP-39 phrase')
  }

  const entropy = latin1ToBytes(text)
  if (entropy && ENTROPY_SIZES.has(entropy.length)) return decodeCompactSeedQr(entropy)

  // U+FFFD is what a UTF-8 decoder leaves behind when it is handed raw entropy,
  // so a scanner wired up without `binary` fails here rather than mystifyingly.
  if (text.includes('�')) {
    throw new SeedQrError('That QR holds binary data this scanner could not read losslessly')
  }

  if (/^([xyzvtu]pub|[xyzvtu]prv)[1-9A-HJ-NP-Za-km-z]{50,}$/.test(text)) {
    throw new SeedQrError(
      'That QR holds an extended key, not a seed. Arkade needs the recovery phrase itself to restore a spendable wallet.',
    )
  }

  throw new SeedQrError('That QR is not a recovery backup. Scan a SeedQR, CompactSeedQR or UR seed.')
}
