import { asset, networks } from '@arkade-os/sdk'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { describe, expect, it } from 'vitest'
import {
  BEACON_READ_FEE,
  MAINNET_BACKUP_PUBKEY,
  MAINNET_BEACON_STATUS,
  MAINNET_DESK,
  MAINNET_EXIT,
  MAINNET_FALLBACK_DELAY,
  MAINNET_FINAL_EXIT_DELAY,
  MUTINYNET_BEACON_STATUS,
  MUTINYNET_EXIT,
  PREDICT_VOID_AFTER,
} from '../../../lib/predict/constants'
import {
  backupKeyMatches,
  beaconIdOf,
  bindPredictContracts,
  decodeState,
  exitSequence,
  parseOracleBeacon,
  slotFixing,
  STATE_SIZE,
} from '../../../lib/predict/contracts'
import { bytesToHex, hexToBytes } from '../../../lib/predict/hex'

const SERVER_KEY = secp256k1.getPublicKey(hexToBytes('11'.repeat(32)), true).subarray(1)
const EMULATOR_KEY = secp256k1.getPublicKey(hexToBytes('22'.repeat(32)), true)
const HOLDER_KEY = secp256k1.getPublicKey(hexToBytes('33'.repeat(32)), true).subarray(1)

describe('predict PredictVaultV2 contracts & beacon parsing', () => {
  it('derives deterministic mainnet ark1 OptionIntent and PredictVaultV2 addresses', () => {
    const beacon = beaconIdOf(asset.AssetId.create(MAINNET_BEACON_STATUS.issueTxid, 0))
    const bound = bindPredictContracts({
      kind: 2,
      strike: 6_500_000n,
      collateral: 19_000n,
      stake: 10_000n,
      expiry: 1_800_000_000n,
      deadline: 1_799_999_700n,
      exit: MAINNET_EXIT,
      writerPk: hexToBytes(MAINNET_DESK.pubkey),
      holderPk: HOLDER_KEY,
      backupPk: hexToBytes(MAINNET_BACKUP_PUBKEY),
      voidAfter: PREDICT_VOID_AFTER,
      fallbackDelay: MAINNET_FALLBACK_DELAY,
      finalExitDelay: MAINNET_FINAL_EXIT_DELAY,
      beacon,
      readFee: BEACON_READ_FEE,
      serverKey: SERVER_KEY,
      emulatorKey: EMULATOR_KEY,
      hrp: networks.bitcoin.hrp,
    })

    expect(bound.intentAddress.startsWith('ark1')).toBe(true)
    expect(bound.vaultAddress.startsWith('ark1')).toBe(true)
    expect(bound.intentAddress).not.toBe(bound.vaultAddress)
    expect(bound.intentPkScript).toHaveLength(34)
    expect(bound.vaultPkScript).toHaveLength(34)
  })

  it('enforces fail-closed backup key matching on mainnet', () => {
    expect(
      backupKeyMatches(MAINNET_BACKUP_PUBKEY, MAINNET_DESK.pubkey, EMULATOR_KEY, MAINNET_BACKUP_PUBKEY, 'bitcoin'),
    ).toBe(true)
    // Mainnet must reject when no backup key is pinned
    expect(backupKeyMatches(MAINNET_BACKUP_PUBKEY, MAINNET_DESK.pubkey, EMULATOR_KEY, null, 'bitcoin')).toBe(false)
    // Backup key cannot equal desk key
    expect(
      backupKeyMatches(MAINNET_DESK.pubkey, MAINNET_DESK.pubkey, EMULATOR_KEY, MAINNET_DESK.pubkey, 'bitcoin'),
    ).toBe(false)
    // Mutinynet allows emulator x-only key when no backup pin is provided
    expect(
      backupKeyMatches(bytesToHex(EMULATOR_KEY.subarray(1)), MAINNET_DESK.pubkey, EMULATOR_KEY, null, 'mutinynet'),
    ).toBe(true)
  })

  it('validates pinned mainnet and mutinynet oracle beacon specs', () => {
    const main = parseOracleBeacon(MAINNET_BEACON_STATUS, MAINNET_BEACON_STATUS.issueTxid, 0, 'ark')
    expect(main.ok).toBe(true)
    if (main.ok) {
      expect(main.beacon.exit).toBe(MAINNET_EXIT)
      expect(main.beacon.readFee).toBe(1000n)
    }

    const mut = parseOracleBeacon(MUTINYNET_BEACON_STATUS, MUTINYNET_BEACON_STATUS.issueTxid, 0, 'tark')
    expect(mut.ok).toBe(true)
    if (mut.ok) {
      expect(mut.beacon.exit).toBe(MUTINYNET_EXIT)
    }
  })

  it('decodes 329-byte beacon state packet and extracts valid slot fixing', () => {
    const bytes = new Uint8Array(STATE_SIZE)
    bytes[0] = 1 // version
    bytes[1] = 3 // round = 3
    const writeU64 = (offset: number, val: bigint) => {
      let rest = val
      for (let i = 0; i < 8; i++) {
        bytes[offset + i] = Number(rest & 0xffn)
        rest >>= 8n
      }
    }
    const expiry = 1_800_000_000n
    writeU64(9, expiry) // slot 0 expiry
    writeU64(17, 6_543_210n) // slot 0 price
    writeU64(25, expiry + 12n) // slot 0 sample time

    const state = decodeState(bytes)
    expect(state.version).toBe(1)
    expect(state.round).toBe(3n)
    expect(slotFixing(bytes, expiry)).toEqual({ price: 6_543_210n, time: expiry + 12n })
    expect(slotFixing(bytes, expiry + 300n)).toBeNull()
  })

  it('encodes BIP68 time-based exit sequence', () => {
    expect(exitSequence(2048n)).toBe((1n << 22n) | 4n)
    expect(() => exitSequence(100n)).toThrow()
  })
})
