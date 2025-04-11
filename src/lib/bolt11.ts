import { bech32 } from '@scure/base'
import BN from 'bn.js'

interface Network {
  bech32: string
  pubKeyHash: number
  scriptHash: number
  validWitnessVersions: number[]
}

interface Tag {
  tagName: string
  data: any
}

interface DecodedPaymentRequest {
  paymentRequest: string
  complete: boolean
  prefix: string
  wordsTemp: string
  network: Network
  satoshis: number | null
  millisatoshis: string | null
  timestamp: number
  timestampString: string
  payeeNodeKey: string
  signature: string
  recoveryFlag: number
  tags: Tag[]
  timeExpireDate?: number
  timeExpireDateString?: string
}

interface FeatureBits {
  word_length: number
  [key: string]:
    | {
        required: boolean
        supported: boolean
      }
    | number
    | {
        start_bit: number
        bits: boolean[]
        has_required: boolean
      }
}

interface Route {
  pubkey: string
  short_channel_id: string
  fee_base_msat: number
  fee_proportional_millionths: number
  cltv_expiry_delta: number
}

interface FallbackAddress {
  code: number
  address: string | null
  addressHash: string
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
const DEFAULTEXPIRETIME = 3600
const DEFAULTCLTVEXPIRY = 9
const DEFAULTDESCRIPTION = ''
const DEFAULTFEATUREBITS = {
  word_length: 4, // last bit set default is 15
  var_onion_optin: {
    required: false,
    supported: true,
  },
  payment_secret: {
    required: false,
    supported: true,
  },
}

const FEATUREBIT_ORDER = [
  'option_data_loss_protect',
  'initial_routing_sync',
  'option_upfront_shutdown_script',
  'gossip_queries',
  'var_onion_optin',
  'gossip_queries_ex',
  'option_static_remotekey',
  'payment_secret',
  'basic_mpp',
  'option_support_large_channel',
  'option_anchor_outputs',
  'option_anchors_zero_fee_htlc_tx',
  'option_route_blinding',
  'option_shutdown_anysegwit',
  'option_channel_type',
  'option_scid_alias',
  'option_payment_metadata',
  'option_zeroconf',
  'option_dual_fund',
  'option_onion_messages',
  'option_channel_upgrade',
  'option_gossip_queries',
  'option_keysend',
  'option_wumbo',
  'option_amp',
]

const DIVISORS: Record<string, BN> = {
  m: new BN(1e3, 10),
  u: new BN(1e6, 10),
  n: new BN(1e9, 10),
  p: new BN(1e12, 10),
}

const MAX_MILLISATS = new BN('2100000000000000000', 10)

const MILLISATS_PER_BTC = new BN(1e11, 10)
const MILLISATS_PER_MILLIBTC = new BN(1e8, 10)
const MILLISATS_PER_MICROBTC = new BN(1e5, 10)
const MILLISATS_PER_NANOBTC = new BN(1e2, 10)
const PICOBTC_PER_MILLISATS = new BN(10, 10)

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

  const valueBN = new BN(value, 10)

  const millisatoshisBN = divisor
    ? valueBN.mul(MILLISATS_PER_BTC).div(DIVISORS[divisor])
    : valueBN.mul(MILLISATS_PER_BTC)

  if ((divisor === 'p' && !valueBN.mod(new BN(10, 10)).eq(new BN(0, 10))) || millisatoshisBN.gt(MAX_MILLISATS)) {
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
      const millisatoshisBN = hrpToMillisat(value + divisor, false) as BN
      if (!millisatoshisBN.mod(new BN(1000, 10)).eq(new BN(0, 10))) {
        throw new Error('Amount is outside of valid range')
      }
      satoshis = millisatoshisBN.div(new BN(1000, 10)).toNumber()
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
