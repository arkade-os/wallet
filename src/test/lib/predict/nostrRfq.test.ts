import { asset, networks } from '@arkade-os/sdk'
import { describe, expect, it } from 'vitest'
import {
  BEACON_READ_FEE,
  MAINNET_BACKUP_PUBKEY,
  MAINNET_BEACON_STATUS,
  MAINNET_DESK,
  MAINNET_EXIT,
  MAINNET_FALLBACK_DELAY,
  MAINNET_FINAL_EXIT_DELAY,
  PAIR,
  PREDICT_VAULT_PROGRAM_ID,
  PREDICT_VOID_AFTER,
} from '../../../lib/predict/constants'
import { beaconIdOf, bindPredictContracts } from '../../../lib/predict/contracts'
import { bytesToHex, hexToBytes } from '../../../lib/predict/hex'
import { parseNostrPredictPosition, parseRfqReply } from '../../../lib/predict/nostrRfq'

describe('predict Nostr RFQ wire compatibility', () => {
  it('parses a real COINFLIP desk rfq_quote payload without kind/strike/expiry in profile', () => {
    const raw = {
      v: 1,
      type: 'rfq_quote',
      rfq_id: 'bb'.repeat(32),
      pair: PAIR,
      from_amount: '10000',
      to_amount: '31600',
      solver_pubkey: MAINNET_DESK.pubkey,
      valid_until: 1795616802,
      profile: {
        writer_pubkey: MAINNET_DESK.pubkey,
        writer_pk_script: '51208633dd23f452ea7cca529c86cff8b4e83f3e9b5d8e2a51d76a4992a7466d88f0',
        backup_pubkey: MAINNET_BACKUP_PUBKEY,
        void_after: Number(PREDICT_VOID_AFTER),
        fallback_delay: Number(MAINNET_FALLBACK_DELAY),
        final_exit_delay: Number(MAINNET_FINAL_EXIT_DELAY),
        beacon_txid: MAINNET_BEACON_STATUS.issueTxid,
        beacon_gidx: 0,
        deadline: 1795616832,
        exit: Number(MAINNET_EXIT),
        intent_address:
          'ark1qzpq904am6clw3pgqwyh4p02708fy4xs0hcpwt7rwfdttuxsjamececp98hy9fmarg039rjm69hvwxa5z05wz56rtzsyw2scv58aaa07hjesxq',
        vault_address:
          'ark1qzpq904am6clw3pgqwyh4p02708fy4xs0hcpwt7rwfdttuxsjamechu55pqk5tyj2len6cl30x2sx936g55u04qkvjgdl4umeqjx7pcu3v7xdh',
      },
    }

    const parsed = parseRfqReply(raw)
    expect(parsed).not.toBeNull()
    expect(parsed?.type).toBe('rfq_quote')
    if (parsed?.type === 'rfq_quote') {
      expect(parsed.to_amount).toBe('31600')
      expect(parsed.profile.intent_address).toBe(raw.profile.intent_address)
      expect(parsed.profile.vault_address).toBe(raw.profile.vault_address)

      // Prove exact address & script parity with the live coinflip-mainnet desk.
      const bound = bindPredictContracts({
        kind: 2,
        strike: 5_834_115n,
        collateral: BigInt(parsed.to_amount),
        stake: BigInt(parsed.from_amount),
        expiry: 1_795_617_000n,
        deadline: BigInt(parsed.profile.deadline),
        exit: MAINNET_EXIT,
        writerPk: hexToBytes(parsed.profile.writer_pubkey),
        holderPk: hexToBytes('1b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f'),
        backupPk: hexToBytes(parsed.profile.backup_pubkey),
        voidAfter: BigInt(parsed.profile.void_after),
        fallbackDelay: BigInt(parsed.profile.fallback_delay),
        finalExitDelay: BigInt(parsed.profile.final_exit_delay),
        beacon: beaconIdOf(asset.AssetId.create(parsed.profile.beacon_txid, parsed.profile.beacon_gidx)),
        readFee: BEACON_READ_FEE,
        serverKey: hexToBytes('038202bebddeb1f7442803897a85eaf3ce9254d07df0172fc3725ab5f0d097779c'),
        emulatorKey: hexToBytes('0239c196415da47b26456a101daaa12ba9e445bfe153197f1e2b750bf40e52092e'),
        hrp: networks.bitcoin.hrp,
      })
      expect(bound.intentAddress).toBe(parsed.profile.intent_address)
      expect(bound.vaultAddress).toBe(parsed.profile.vault_address)
      expect(bytesToHex(bound.writerPkScript)).toBe(parsed.profile.writer_pk_script)
    }
  })

  it('parses an rfq_refusal reply', () => {
    const parsed = parseRfqReply({
      v: 1,
      type: 'rfq_refusal',
      rfq_id: 'aa'.repeat(32),
      reason: 'window line not set',
    })
    expect(parsed).toEqual({
      v: 1,
      type: 'rfq_refusal',
      rfq_id: 'aa'.repeat(32),
      reason: 'window line not set',
    })
  })

  it('parses a COINFLIP option_position event with string strike', () => {
    const raw = {
      v: 1,
      type: 'option_position',
      program_id: PREDICT_VAULT_PROGRAM_ID,
      rfq_id: 'cc'.repeat(32),
      pair: PAIR,
      kind: 2,
      collateral: '31600',
      stake: '10000',
      strike: '5834115',
      expiry: 1795617000,
      exit: Number(MAINNET_EXIT),
      writer_pubkey: MAINNET_DESK.pubkey,
      writer_pk_script: '51208633dd23f452ea7cca529c86cff8b4e83f3e9b5d8e2a51d76a4992a7466d88f0',
      holder_pubkey: '1b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f',
      holder_pk_script: '5120954ab5a2fdcf7704a5f335bc05d870ccf63f10a045e620dbe1c22418887ecb99',
      backup_pubkey: MAINNET_BACKUP_PUBKEY,
      void_after: Number(PREDICT_VOID_AFTER),
      fallback_delay: Number(MAINNET_FALLBACK_DELAY),
      final_exit_delay: Number(MAINNET_FINAL_EXIT_DELAY),
      beacon_txid: MAINNET_BEACON_STATUS.issueTxid,
      beacon_gidx: 0,
      vault_address:
        'ark1qzpq904am6clw3pgqwyh4p02708fy4xs0hcpwt7rwfdttuxsjamechu55pqk5tyj2len6cl30x2sx936g55u04qkvjgdl4umeqjx7pcu3v7xdh',
      fill_txid: 'dd'.repeat(32),
    }

    const parsed = parseNostrPredictPosition(raw)
    expect(parsed).not.toBeNull()
    expect(parsed?.strike).toBe(5834115)
    expect(parsed?.fill_txid).toBe('dd'.repeat(32))
  })
})
