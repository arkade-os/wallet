import { DefaultVtxo, SingleKey, type ExtendedVirtualCoin } from '@arkade-os/sdk'
import { schnorr } from '@noble/curves/secp256k1.js'
import { hex } from '@scure/base'
import type { ReceiverClaim } from '../../lib/receiverClaims'
import { COVENANT_ADDRESS, KEYS, WIRE_ASSET_ID } from './receiverTaxiFixtures'

// A real key and default script, so a planned coin survives the Taxi client's own input mapping.
const BOB_SECRET = '11'.repeat(32)
export const BOB = SingleKey.fromHex(BOB_SECRET)
const SERVER = hex.decode(KEYS.server)
const BOB_SCRIPT = new DefaultVtxo.Script({
  pubKey: schnorr.getPublicKey(hex.decode(BOB_SECRET)),
  serverPubKey: SERVER,
  csvTimelock: DefaultVtxo.Script.DEFAULT_TIMELOCK,
})
export const BOB_ADDRESS = BOB_SCRIPT.address('tark', SERVER).encode()
export const BOB_PK_SCRIPT = hex.encode(BOB_SCRIPT.pkScript)

const claimOf = (currency: 'sats' | 'asset', units: bigint): ReceiverClaim => ({
  transferId: `tr-${currency}-${units}`,
  receiverAddress: BOB_ADDRESS,
  state: 'locked',
  claimable: true,
  updatedAt: 1_700_000_000,
  claim: {
    params: {
      receiverKey: hex.encode(BOB_SCRIPT.tweakedPublicKey),
      senderKey: KEYS.maker,
      operatorKey: KEYS.operator,
      dust: '330',
      topup: '330',
      locktime: '3800000000',
      assetId: WIRE_ASSET_ID,
      recoveryRecipient: 'receiver',
      claimMode: 'recycle',
      receiverFare: { currency, units: units.toString() },
    },
    covenantAddress: COVENANT_ADDRESS,
    outpoint: { txid: 'd'.repeat(64), vout: 0 },
    assetUnits: '500',
    fare: { currency: 'sats', units: '0' },
    batchExpiry: { kind: 'time', value: '4000000000' },
    recoveryLocktime: { kind: 'time', value: '3800000000' },
    unclaimedMode: 'reclaim',
  },
})

export const satsFareClaim = (units: bigint) => claimOf('sats', units)
export const assetFareClaim = (units: bigint) => claimOf('asset', units)

/** Spendable coins at the claim's receiver address, one per value. */
export const coins = (values: bigint[], pkScript = BOB_PK_SCRIPT): ExtendedVirtualCoin[] =>
  values.map(
    (value, vout) =>
      ({
        txid: 'c'.repeat(64),
        vout,
        value: Number(value),
        tapTree: BOB_SCRIPT.encode(),
        forfeitTapLeafScript: BOB_SCRIPT.forfeit(),
        intentTapLeafScript: BOB_SCRIPT.forfeit(),
        script: pkScript,
        virtualStatus: { state: 'settled' },
        status: { confirmed: true },
        createdAt: new Date(1_700_000_000_000),
        expiresAt: new Date(4_000_000_000_000),
        isUnrolled: false,
        isSpent: false,
      }) as unknown as ExtendedVirtualCoin,
  )
