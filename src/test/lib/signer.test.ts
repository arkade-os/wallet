import { describe, expect, it } from 'vitest'
import { DefaultVtxo } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { emptyAspInfo } from '../../lib/asp'
import {
  buildSignerSet,
  classifyCoin,
  extractServerPubKey,
  partitionByExpiredSigner,
  signerKeyTail,
  SignerCoin,
} from '../../lib/signer'

// x-only pubkeys must be valid curve points, so derive them from fixed privkeys
const xOnlyKey = (fill: number) => secp256k1.getPublicKey(new Uint8Array(32).fill(fill), true).slice(1)
const userKey = xOnlyKey(1)
const activeServerKey = xOnlyKey(2)
const deprecatedServerKey = xOnlyKey(3)

const activeServerHex = hex.encode(activeServerKey)
const deprecatedServerHex = hex.encode(deprecatedServerKey)

const nowSeconds = Math.floor(Date.now() / 1000)
const futureCutoff = BigInt(nowSeconds + 3600)
const pastCutoff = BigInt(nowSeconds - 3600)

const makeScript = (serverPubKey: Uint8Array) =>
  new DefaultVtxo.Script({
    pubKey: userKey,
    serverPubKey,
    csvTimelock: { value: BigInt(144), type: 'blocks' },
  })

const makeCoin = (serverPubKey: Uint8Array): SignerCoin => {
  const script = makeScript(serverPubKey)
  return { tapTree: script.encode(), forfeitTapLeafScript: script.forfeit() }
}

// arkd advertises compressed (33-byte) keys; the helpers must normalize.
const makeAspInfo = (cutoffDate: bigint) => ({
  ...emptyAspInfo,
  signerPubkey: '02' + activeServerHex,
  deprecatedSigners: [{ pubkey: '02' + deprecatedServerHex, cutoffDate }],
})

describe('signerKeyTail', () => {
  it('returns the last 8 hex chars', () => {
    expect(signerKeyTail(activeServerHex)).toBe(activeServerHex.slice(-8))
    expect(signerKeyTail(activeServerHex)).toHaveLength(8)
  })
})

describe('buildSignerSet', () => {
  it('returns null on a blank signer pubkey', () => {
    expect(buildSignerSet(emptyAspInfo)).toBeNull()
    expect(buildSignerSet(undefined)).toBeNull()
    expect(buildSignerSet(null)).toBeNull()
  })

  it('builds a set from a populated aspInfo', () => {
    const set = buildSignerSet(makeAspInfo(futureCutoff))
    expect(set?.active).toBe(activeServerHex)
    expect(set?.deprecated.get(deprecatedServerHex)).toBe(futureCutoff)
  })
})

describe('extractServerPubKey', () => {
  const signerSet = buildSignerSet(makeAspInfo(futureCutoff))

  it('extracts the server key from the forfeit tap leaf', () => {
    const script = makeScript(activeServerKey)
    const coin: SignerCoin = { forfeitTapLeafScript: script.forfeit() }
    expect(extractServerPubKey(coin, signerSet)).toBe(activeServerHex)
  })

  it('extracts the server key from the tapTree when no forfeit leaf is present', () => {
    const script = makeScript(deprecatedServerKey)
    const coin: SignerCoin = { tapTree: script.encode() }
    expect(extractServerPubKey(coin, signerSet)).toBe(deprecatedServerHex)
  })

  it('falls back to excluding the user key when the signer set is unavailable', () => {
    const coin = makeCoin(activeServerKey)
    // compressed user key exercises the toXOnlyHex normalization
    expect(extractServerPubKey(coin, null, '03' + hex.encode(userKey))).toBe(activeServerHex)
  })

  it('falls back to the last forfeit pubkey without signer set or user key', () => {
    const coin = makeCoin(activeServerKey)
    expect(extractServerPubKey(coin, null)).toBe(activeServerHex)
  })

  it('returns null on garbage input without throwing', () => {
    expect(extractServerPubKey({ tapTree: new Uint8Array([1, 2, 3]) })).toBeNull()
    expect(extractServerPubKey({})).toBeNull()
  })
})

describe('classifyCoin', () => {
  it('classifies a coin under the active signer as CURRENT', () => {
    const info = classifyCoin(makeCoin(activeServerKey), buildSignerSet(makeAspInfo(futureCutoff)))
    expect(info).toEqual({ serverPubKey: activeServerHex, status: 'CURRENT' })
  })

  it('classifies a deprecated signer before its cutoff as MIGRATABLE', () => {
    const info = classifyCoin(makeCoin(deprecatedServerKey), buildSignerSet(makeAspInfo(futureCutoff)))
    expect(info?.status).toBe('MIGRATABLE')
  })

  it('classifies a deprecated signer without cutoff as DUE_NOW', () => {
    const info = classifyCoin(makeCoin(deprecatedServerKey), buildSignerSet(makeAspInfo(BigInt(0))))
    expect(info?.status).toBe('DUE_NOW')
  })

  it('classifies a deprecated signer past its cutoff as EXPIRED', () => {
    const info = classifyCoin(makeCoin(deprecatedServerKey), buildSignerSet(makeAspInfo(pastCutoff)))
    expect(info?.status).toBe('EXPIRED')
  })

  it('returns a null status when the signer set is unavailable', () => {
    const info = classifyCoin(makeCoin(activeServerKey), null, '02' + hex.encode(userKey))
    expect(info).toEqual({ serverPubKey: activeServerHex, status: null })
  })

  it('returns null when the key cannot be extracted', () => {
    expect(classifyCoin({ tapTree: new Uint8Array([1, 2, 3]) }, buildSignerSet(makeAspInfo(pastCutoff)))).toBeNull()
  })
})

describe('partitionByExpiredSigner', () => {
  const currentCoin = makeCoin(activeServerKey)
  const expiredCoin = makeCoin(deprecatedServerKey)

  it('keeps current coins and excludes past-cutoff deprecated ones', () => {
    const { keep, excluded } = partitionByExpiredSigner(
      [currentCoin, expiredCoin],
      buildSignerSet(makeAspInfo(pastCutoff)),
    )
    expect(keep).toEqual([currentCoin])
    expect(excluded).toEqual([expiredCoin])
  })

  it('keeps migratable (pre-cutoff) deprecated coins', () => {
    const { keep, excluded } = partitionByExpiredSigner(
      [currentCoin, expiredCoin],
      buildSignerSet(makeAspInfo(futureCutoff)),
    )
    expect(keep).toEqual([currentCoin, expiredCoin])
    expect(excluded).toEqual([])
  })

  it('keeps coins whose key cannot be extracted (fail-open)', () => {
    const undecodable = { tapTree: new Uint8Array([1, 2, 3]) }
    const { keep, excluded } = partitionByExpiredSigner([undecodable], buildSignerSet(makeAspInfo(pastCutoff)))
    expect(keep).toEqual([undecodable])
    expect(excluded).toEqual([])
  })

  it('filters nothing without a signer set', () => {
    const { keep, excluded } = partitionByExpiredSigner([currentCoin, expiredCoin], null)
    expect(keep).toEqual([currentCoin, expiredCoin])
    expect(excluded).toEqual([])
  })
})
