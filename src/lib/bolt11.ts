import { bech32 } from '@scure/base'

interface Network {
  bech32: string
  pubKeyHash: number
  scriptHash: number
  validWitnessVersions: number[]
}

const DEFAULTNETWORK: Network = {
  bech32: 'bc',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  validWitnessVersions: [0, 1],
}
const TESTNETWORK: Network = {
  bech32: 'tb',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  validWitnessVersions: [0, 1],
}
const REGTESTNETWORK: Network = {
  bech32: 'bcrt',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  validWitnessVersions: [0, 1],
}
const SIMNETWORK: Network = {
  bech32: 'sb',
  pubKeyHash: 0x3f,
  scriptHash: 0x7b,
  validWitnessVersions: [0, 1],
}

const DIVISORS: Record<string, bigint> = {
  m: BigInt(1e3),
  u: BigInt(1e6),
  n: BigInt(1e9),
  p: BigInt(1e12),
}

const MAX_MILLISATS = BigInt('2100000000000000000')

const MILLISATS_PER_BTC = BigInt(1e11)

const TAGCODES: Record<string, number> = {
  payment_hash: 1,
  payment_secret: 16,
  description: 13,
  payee_node_key: 19,
  purpose_commit_hash: 23, // commit to longer descriptions (like a website)
  expire_time: 6, // default: 3600 (1 hour)
  min_final_cltv_expiry: 24, // default: 9
  fallback_address: 9,
  routing_info: 3, // for extra routing info (private etc.)
  feature_bits: 5,
}

// reverse the keys and values of TAGCODES and insert into TAGNAMES
const TAGNAMES: Record<string, string> = {}
for (let i = 0, keys = Object.keys(TAGCODES); i < keys.length; i++) {
  const currentName = keys[i]
  const currentCode = TAGCODES[keys[i]].toString()
  TAGNAMES[currentCode] = currentName
}

function wordsToIntBE(words: number[]): number {
  return words.reverse().reduce((total: number, item: number, index: number) => {
    return total + item * Math.pow(32, index)
  }, 0)
}

function convert(data: number[], inBits: number, outBits: number): number[] {
  let value = 0
  let bits = 0
  const maxV = (1 << outBits) - 1

  const result: number[] = []
  for (let i = 0; i < data.length; ++i) {
    value = (value << inBits) | data[i]
    bits += inBits

    while (bits >= outBits) {
      bits -= outBits
      result.push((value >> bits) & maxV)
    }
  }

  if (bits > 0) {
    result.push((value << (outBits - bits)) & maxV)
  }

  return result
}

function wordsToBuffer(words: number[], trim: boolean): Uint8Array {
  let buffer = new Uint8Array(convert(words, 5, 8))
  if (trim && (words.length * 5) % 8 !== 0) {
    buffer = buffer.slice(0, -1)
  }
  return buffer
}

function hrpToMillisat(hrpString: string, outputString: boolean) {
  let divisor: string | undefined
  let value: string

  if (hrpString.slice(-1).match(/^[munp]$/)) {
    divisor = hrpString.slice(-1)
    value = hrpString.slice(0, -1)
  } else if (hrpString.slice(-1).match(/^[^munp0-9]$/)) {
    throw new Error('Not a valid multiplier for the amount')
  } else {
    value = hrpString
  }

  if (!value.match(/^\d+$/)) throw new Error('Not a valid human readable amount')

  const valueBN = BigInt(value)

  const millisatoshisBN = divisor ? (valueBN * MILLISATS_PER_BTC) / DIVISORS[divisor] : valueBN * MILLISATS_PER_BTC

  if ((divisor === 'p' && valueBN % BigInt(10) !== BigInt(0)) || millisatoshisBN > MAX_MILLISATS) {
    throw new Error('Amount is outside of valid range')
  }

  return outputString ? millisatoshisBN.toString() : millisatoshisBN
}

// decode will only have extra comments that aren't covered in encode comments.
// also if anything is hard to read I'll comment.
export function decode(paymentRequest: string, network?: Network) {
  if (typeof paymentRequest !== 'string') throw new Error('Lightning Payment Request must be string')
  if (paymentRequest.slice(0, 2).toLowerCase() !== 'ln') throw new Error('Not a proper lightning payment request')
  const decoded = bech32.decodeUnsafe(paymentRequest, Number.MAX_SAFE_INTEGER)
  if (!decoded) throw new Error('Invalid payment request')
  paymentRequest = paymentRequest.toLowerCase()
  const prefix = decoded.prefix
  let words = decoded.words

  // signature is always 104 words on the end
  // cutting off at the beginning helps since there's no way to tell
  // ahead of time how many tags there are.
  const sigWords = words.slice(-104)
  // grabbing a copy of the words for later, words will be sliced as we parse.
  const wordsNoSig = words.slice(0, -104)
  words = words.slice(0, -104)

  let sigBuffer = wordsToBuffer(sigWords, true)
  const recoveryFlag = sigBuffer.slice(-1)[0]
  sigBuffer = sigBuffer.slice(0, -1)

  if (!(recoveryFlag in [0, 1, 2, 3]) || sigBuffer.length !== 64) {
    throw new Error('Signature is missing or incorrect')
  }

  // Without reverse lookups, can't say that the multipier at the end must
  // have a number before it, so instead we parse, and if the second group
  // doesn't have anything, there's a good chance the last letter of the
  // coin type got captured by the third group, so just re-regex without
  // the number.
  let prefixMatches = prefix.match(/^ln(\S+?)(\d*)([a-zA-Z]?)$/)
  if (prefixMatches && !prefixMatches[2]) prefixMatches = prefix.match(/^ln(\S+)$/)
  if (!prefixMatches) {
    throw new Error('Not a proper lightning payment request')
  }

  const bech32Prefix = prefixMatches[1]
  let coinNetwork
  if (!network) {
    switch (bech32Prefix) {
      case DEFAULTNETWORK.bech32:
        coinNetwork = DEFAULTNETWORK
        break
      case TESTNETWORK.bech32:
        coinNetwork = TESTNETWORK
        break
      case REGTESTNETWORK.bech32:
        coinNetwork = REGTESTNETWORK
        break
      case SIMNETWORK.bech32:
        coinNetwork = SIMNETWORK
        break
    }
  } else {
    if (
      network.bech32 === undefined ||
      network.pubKeyHash === undefined ||
      network.scriptHash === undefined ||
      !Array.isArray(network.validWitnessVersions)
    )
      throw new Error('Invalid network')
    coinNetwork = network
  }
  if (!coinNetwork || coinNetwork.bech32 !== bech32Prefix) {
    throw new Error('Unknown coin bech32 prefix')
  }

  const value = prefixMatches[2]
  let satoshis, millisatoshis, removeSatoshis
  if (value) {
    const divisor = prefixMatches[3]
    try {
      const millisatoshisBN = hrpToMillisat(value + divisor, false) as bigint
      if (millisatoshisBN % BigInt(1000) !== BigInt(0)) {
        throw new Error('Amount is outside of valid range')
      }
      satoshis = Number(millisatoshisBN / BigInt(1000))
    } catch (e) {
      satoshis = null
      removeSatoshis = true
    }
    millisatoshis = hrpToMillisat(value + divisor, true) as string
  } else {
    satoshis = null
    millisatoshis = null
  }

  // reminder: left padded 0 bits
  const timestamp = wordsToIntBE(words.slice(0, 7))
  const timestampString = new Date(timestamp * 1000).toISOString()
  words = words.slice(7) // trim off the left 7 words

  let finalResult = {
    paymentRequest,
    complete: true,
    prefix,
    wordsTemp: bech32.encode('temp', wordsNoSig.concat(sigWords), Number.MAX_SAFE_INTEGER),
    network: coinNetwork,
    satoshis,
    millisatoshis,
    timestamp,
    timestampString,
    recoveryFlag,
  }

  if (removeSatoshis) {
    delete (finalResult as any).satoshis
  }

  return finalResult
}
