import {
  arkade,
  ArkAddress,
  asset,
  InMemoryContractRepository,
  InMemoryWalletRepository,
  RestArkProvider,
  RestEmulatorProvider,
  RestIndexerProvider,
  SingleKey,
  Transaction,
  type EmulatorProvider,
} from '@arkade-os/sdk'
import { base64 } from '@scure/base'
import {
  BEACON_READ_FEE,
  DUST_SATS,
  PREDICT_VOID_AFTER,
  type PredictBeaconStatus,
  type PredictNetworkProfile,
} from './constants'
import {
  beaconIdOf,
  bindBeacon,
  bindPredictContracts,
  buildRefundTx,
  buildSettleTx,
  decodeState,
  intentProgram,
  parseOracleBeacon,
  predictVaultProgram,
  refundOutputs,
  settlePayouts,
  slotFixing,
  slotPrice,
  statePacketOf,
  submitCospend,
  verifiedSignerKey,
  type PredictTerms,
} from './contracts'
import { bytesToHex, hexToBytes, xOnly } from './hex'
import type { PredictPosition, PredictPositionPhase } from './storage'

export interface CoinView {
  value: bigint
  spent: boolean
  spentBy: string
  txid?: string
}

export interface TxOutput {
  amount: bigint
  script: string
}

export interface IntentView {
  phase: Exclude<PredictPositionPhase, 'settled'>
  refundable: boolean
  fundingTxid: string
  closeTxid: string
}

const TXID_RE = /^[0-9a-f]{64}$/

function cleanTxid(value: string | undefined): string {
  const id = (value ?? '').toLowerCase()
  return TXID_RE.test(id) ? id : ''
}

/** Predict side (side = 1): user's coin is the stake; a fill funds the vault with collateral. */
export function classifyPredictIntent(input: {
  coins: CoinView[]
  spends: Record<string, TxOutput[]>
  collateral: bigint
  stake: bigint
  holderScript: string
  vaultScript: string
  now: number
  deadline: number
}): IntentView {
  const holder = input.holderScript.toLowerCase()
  const vault = input.vaultScript.toLowerCase()
  const liveAboveDust = input.coins.find((coin) => !coin.spent && coin.value > DUST_SATS)
  const pastDeadline = input.now >= input.deadline

  const sumTo = (outputs: TxOutput[], script: string) =>
    outputs.reduce((sum, out) => (script && out.script.toLowerCase() === script ? sum + out.amount : sum), 0n)

  const spent = input.coins
    .filter((coin) => coin.spent && coin.value >= input.stake && coin.spentBy)
    .sort((a, b) => Number(b.value - a.value))

  for (const coin of spent) {
    const outputs = input.spends[coin.spentBy] ?? []
    if (sumTo(outputs, holder) >= coin.value) continue
    if (sumTo(outputs, vault) >= input.collateral) {
      return {
        phase: 'filled',
        refundable: Boolean(liveAboveDust && pastDeadline),
        fundingTxid: cleanTxid(coin.txid),
        closeTxid: cleanTxid(coin.spentBy),
      }
    }
  }

  const live = input.coins.find((coin) => !coin.spent && coin.value >= input.stake)
  if (live) {
    return {
      phase: pastDeadline ? 'expired' : 'funded',
      refundable: pastDeadline,
      fundingTxid: cleanTxid(live.txid),
      closeTxid: '',
    }
  }

  for (const coin of spent) {
    const outputs = input.spends[coin.spentBy] ?? []
    if (sumTo(outputs, holder) >= coin.value) {
      return {
        phase: 'refunded',
        refundable: Boolean(liveAboveDust && pastDeadline),
        fundingTxid: cleanTxid(coin.txid),
        closeTxid: cleanTxid(coin.spentBy),
      }
    }
  }

  if (liveAboveDust && pastDeadline) {
    return {
      phase: 'expired',
      refundable: true,
      fundingTxid: cleanTxid(liveAboveDust.txid),
      closeTxid: '',
    }
  }

  const spentSmall = input.coins
    .filter((coin) => coin.spent && coin.value > DUST_SATS && coin.value < input.stake && coin.spentBy)
    .sort((a, b) => Number(b.value - a.value))
  for (const coin of spentSmall) {
    const outputs = input.spends[coin.spentBy] ?? []
    if (sumTo(outputs, holder) >= coin.value) {
      return {
        phase: 'refunded',
        refundable: false,
        fundingTxid: cleanTxid(coin.txid),
        closeTxid: cleanTxid(coin.spentBy),
      }
    }
  }

  return {
    phase: input.now < input.deadline ? 'open' : 'expired',
    refundable: false,
    fundingTxid: '',
    closeTxid: '',
  }
}

// --- Lightweight PSBT output reader ---

function readVarint(bytes: Uint8Array, at: number): [number, number] {
  const first = bytes[at] ?? 0
  if (first < 0xfd) return [first, at + 1]
  if (first === 0xfd) return [(bytes[at + 1] ?? 0) | ((bytes[at + 2] ?? 0) << 8), at + 3]
  const view = new DataView(bytes.buffer, bytes.byteOffset + at + 1, 4)
  return [view.getUint32(0, true), at + 5]
}

function readAmount(bytes: Uint8Array, at: number): bigint {
  let value = 0n
  for (let i = 0; i < 8; i++) value |= BigInt(bytes[at + i] ?? 0) << BigInt(8 * i)
  return value
}

function readTxOut(bytes: Uint8Array, at: number): [TxOutput, number] {
  const amount = readAmount(bytes, at)
  at += 8
  const [scriptLen, next] = readVarint(bytes, at)
  const script = bytes.slice(next, next + scriptLen)
  return [{ amount, script: bytesToHex(script) }, next + scriptLen]
}

export function psbtOutputs(b64: string): TxOutput[] {
  const bytes = base64.decode(b64)
  if (bytes[0] !== 0x70 || bytes[1] !== 0x73 || bytes[2] !== 0x62 || bytes[3] !== 0x74) {
    throw new Error('not a psbt')
  }
  let unsigned: Uint8Array | null = null
  let at = 5
  while (at < bytes.length && bytes[at] !== 0) {
    const [keyLen, keyAt] = readVarint(bytes, at)
    const key = bytes.subarray(keyAt, keyAt + keyLen)
    const [valLen, valAt] = readVarint(bytes, keyAt + keyLen)
    if (key.length === 1 && key[0] === 0) unsigned = bytes.subarray(valAt, valAt + valLen)
    at = valAt + valLen
  }
  if (!unsigned) return []
  let pos = 4
  if (unsigned[pos] === 0 && unsigned[pos + 1] === 1) pos += 2
  const [inputCount, afterInputs] = readVarint(unsigned, pos)
  pos = afterInputs
  for (let i = 0; i < inputCount; i++) {
    pos += 36
    const [scriptLen, next] = readVarint(unsigned, pos)
    pos = next + scriptLen + 4
  }
  const [outputCount, afterCount] = readVarint(unsigned, pos)
  pos = afterCount
  const parsed: TxOutput[] = []
  for (let i = 0; i < outputCount; i++) {
    const [out, next] = readTxOut(unsigned, pos)
    parsed.push(out)
    pos = next
  }
  return parsed
}

export function virtualTxsById(raws: readonly string[]): Map<string, string> {
  const found = new Map<string, string>()
  for (const raw of raws) {
    if (!raw) continue
    try {
      found.set(Transaction.fromPSBT(base64.decode(raw)).id.toLowerCase(), raw)
    } catch {
      continue
    }
  }
  return found
}

export function splitPayouts(
  outputs: TxOutput[],
  holderScript: string,
  deskScript?: string,
): { user: bigint; desk: bigint } | null {
  const want = holderScript.toLowerCase()
  const wantDesk = (deskScript ?? '').toLowerCase()
  let user = 0n
  let desk = 0n
  let matched = false
  const firstScript = outputs[0]?.script.toLowerCase() ?? ''
  const startIndex = firstScript === want || (wantDesk !== '' && firstScript === wantDesk) ? 0 : 1
  outputs.forEach((output, index) => {
    if (index < startIndex || output.amount <= 0n) return
    const script = output.script.toLowerCase()
    if (script === '51024e73' || script.startsWith('6a')) return
    if (script === want) {
      user += output.amount
      matched = true
    } else if (wantDesk && script === wantDesk) {
      desk += output.amount
      matched = true
    } else {
      desk += output.amount
    }
  })
  return matched ? { user, desk } : null
}

function pkScriptHex(address: string): string {
  return bytesToHex(ArkAddress.decode(address).pkScript)
}

function randomEphemeralKey(): SingleKey {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  if (bytes.every((b) => b === 0)) bytes[0] = 1
  return SingleKey.fromHex(bytesToHex(bytes))
}

/** Isolated Arkade client (in-memory repos so it never contends with the wallet service worker's IndexedDB). */
export async function connectPredictClient(profile: PredictNetworkProfile) {
  const ark = new RestArkProvider(profile.arkUrl)
  const indexer = new RestIndexerProvider(profile.arkUrl)
  const emulator = new RestEmulatorProvider(profile.emulatorUrl)
  const contractManager = await arkade.Arkade.connect({
    arkade: ark,
    indexer,
    emulator,
    identity: randomEphemeralKey(),
    network: profile.network,
    contractRepository: new InMemoryContractRepository(),
    walletRepository: new InMemoryWalletRepository(),
  } as Parameters<typeof arkade.Arkade.connect>[0])
  return { client: contractManager, indexer, emulator }
}

function termsFromPosition(
  pos: PredictPosition,
  profile: PredictNetworkProfile,
  serverKey: Uint8Array,
  emulatorKey: Uint8Array,
): PredictTerms {
  const decoded = ArkAddress.decode(pos.holderAddress)
  const exit = BigInt(pos.exit || Number(profile.exit))
  const signerKey = verifiedSignerKey(pos.holderAddress, pos.holderPubkey, serverKey, exit)
  const payoutKey = xOnly(decoded.vtxoTaprootKey)
  return {
    kind: pos.kind,
    strike: BigInt(pos.strikeCents),
    collateral: BigInt(pos.payoutSats),
    stake: BigInt(pos.stakeSats),
    expiry: BigInt(pos.expiry),
    deadline: BigInt(pos.deadline),
    exit,
    writerPk: hexToBytes(pos.deskPkHex),
    holderPk: signerKey ?? payoutKey,
    holderPayoutKey: signerKey ? undefined : payoutKey,
    backupPk: pos.backupPkHex ? hexToBytes(pos.backupPkHex) : undefined,
    voidAfter: BigInt(pos.voidAfter || Number(profile.voidAfter)),
    fallbackDelay: BigInt(pos.fallbackDelay || Number(profile.fallbackDelay)),
    finalExitDelay: BigInt(pos.finalExitDelay || Number(profile.finalExitDelay)),
    beacon: beaconIdOf(asset.AssetId.create(pos.beaconTxid, pos.beaconGidx)),
    readFee: BEACON_READ_FEE,
    serverKey,
    emulatorKey,
    hrp: profile.hrp,
  }
}

export async function refreshLivePosition(
  pos: PredictPosition,
  profile: PredictNetworkProfile,
): Promise<PredictPosition> {
  const indexer = new RestIndexerProvider(profile.arkUrl)
  const holderScript = pkScriptHex(pos.holderAddress)
  const vaultScript = pkScriptHex(pos.vaultAddress)
  const intentScript = pkScriptHex(pos.intentAddress)

  const intentPage = await indexer.getVtxos({ scripts: [intentScript] })
  const coins: CoinView[] = (intentPage.vtxos ?? []).map((coin) => ({
    value: BigInt(coin.value),
    spent: Boolean(coin.isSpent || coin.spentBy),
    spentBy: coin.arkTxId || coin.spentBy || '',
    txid: coin.txid || '',
  }))

  const spentIds = [...new Set(coins.flatMap((c) => (c.spent && c.spentBy ? [c.spentBy] : [])))]
  const spends: Record<string, TxOutput[]> = {}
  if (spentIds.length > 0) {
    const page = await indexer.getVirtualTxs(spentIds)
    const byId = virtualTxsById(page.txs ?? [])
    for (const id of spentIds) {
      const raw = byId.get(id.toLowerCase())
      if (!raw) continue
      try {
        spends[id] = psbtOutputs(raw)
      } catch {
        // ignore non-PSBT checkpoint ids
      }
    }
  }

  const view = classifyPredictIntent({
    coins,
    spends,
    collateral: BigInt(pos.payoutSats),
    stake: BigInt(pos.stakeSats),
    holderScript,
    vaultScript,
    now: Math.floor(Date.now() / 1000),
    deadline: pos.deadline,
  })

  let phase: PredictPositionPhase = view.phase
  let fillTxid = pos.fillTxid
  let settleTxid = pos.settleTxid
  let settleCents = pos.settleCents
  let userPayoutSats = pos.userPayoutSats
  let deskPayoutSats = pos.deskPayoutSats

  if (view.phase === 'filled' && view.closeTxid) {
    fillTxid = view.closeTxid
  }

  // Check vault vtxos directly too (covers Nostr-replayed filled positions even if intent history aged out).
  if (phase === 'filled' || pos.phase === 'filled' || pos.phase === 'settled') {
    const vaultPage = await indexer.getVtxos({ scripts: [vaultScript] })
    const spentVault = (vaultPage.vtxos ?? []).find((c) => c.isSpent || c.spentBy)
    if (spentVault) {
      const txid = cleanTxid(spentVault.arkTxId || spentVault.spentBy)
      if (txid) {
        settleTxid = txid
        phase = 'settled'
        try {
          const txPage = await indexer.getVirtualTxs([txid])
          const raw = virtualTxsById(txPage.txs ?? []).get(txid)
          if (raw) {
            const split = splitPayouts(psbtOutputs(raw), holderScript)
            if (split) {
              userPayoutSats = split.user.toString()
              deskPayoutSats = split.desk.toString()
            }
            try {
              const cents = slotPrice(statePacketOf(Transaction.fromPSBT(base64.decode(raw))), BigInt(pos.expiry))
              if (cents != null) settleCents = cents.toString()
            } catch {
              // refund tx has no beacon state packet
            }
          }
        } catch {
          // keep settled phase even if details fetch fails transiently
        }
      }
    } else if ((vaultPage.vtxos ?? []).some((c) => !c.isSpent && !c.spentBy)) {
      phase = 'filled'
    }
  }

  return {
    ...pos,
    phase,
    refundable: view.refundable,
    fundingTxid: view.fundingTxid || pos.fundingTxid,
    fillTxid,
    closeTxid: view.closeTxid || pos.closeTxid,
    settleTxid,
    settleCents,
    userPayoutSats,
    deskPayoutSats,
  }
}

export async function cancelLivePredictIntent(
  pos: PredictPosition,
  profile: PredictNetworkProfile,
): Promise<{ txid: string }> {
  const { client, indexer } = await connectPredictClient(profile)
  if (!client.emulatorKey) throw new Error('Emulator key unavailable')
  const terms = termsFromPosition(pos, profile, client.serverKey, client.emulatorKey)
  const bound = bindPredictContracts(terms)
  const intent = client.contract(intentProgram(), bound.intent)
  const page = await indexer.getVtxos({ scripts: [bytesToHex(bound.intentPkScript)], spendableOnly: true })
  const coins = (page.vtxos ?? []).filter((c) => !c.isSpent && !c.spentBy && BigInt(c.value) > DUST_SATS)
  if (!coins.length) throw new Error('No refundable coin found on this prediction address')
  let lastTxid = ''
  for (const coin of coins) {
    const sent = await intent.functions
      .cancel()
      .from(coin as never)
      .to(bound.userPkScript, BigInt(coin.value))
      .send()
    lastTxid = sent.txid
  }
  return { txid: lastTxid }
}

export async function settleLivePredictVault(
  pos: PredictPosition,
  profile: PredictNetworkProfile,
  beaconStatus: PredictBeaconStatus,
): Promise<{ result: string; txid?: string; payoutSats?: bigint; settleCents?: bigint }> {
  const parsed = parseOracleBeacon(beaconStatus, pos.beaconTxid, pos.beaconGidx, profile.hrp)
  if (!parsed.ok) throw new Error(`Beacon mismatch: ${parsed.error}`)
  const { client, indexer, emulator } = await connectPredictClient(profile)
  if (!client.emulatorKey) throw new Error('Emulator key unavailable')
  const terms = termsFromPosition(pos, profile, client.serverKey, client.emulatorKey)
  const bound = bindPredictContracts(terms)

  const now = Math.floor(Date.now() / 1000)
  if (now < pos.expiry) return { result: 'waiting' }

  const vaultScriptHex = bytesToHex(bound.vaultPkScript)
  const live = await indexer.getVtxos({ scripts: [vaultScriptHex], spendableOnly: true })
  const vaults = (live.vtxos ?? []).filter((c) => !c.isSpent && !c.spentBy && BigInt(c.value) >= terms.collateral)
  if (!vaults.length) {
    const hist = await indexer.getVtxos({ scripts: [vaultScriptHex], spentOnly: true })
    const gone = (hist.vtxos ?? [])[0]
    if (gone) return { result: 'settled', txid: cleanTxid(gone.arkTxId || gone.spentBy) }
    return { result: 'waiting' }
  }
  const vaultCoin = vaults.find((c) => c.txid === pos.fillTxid) ?? vaults[0]!

  const beaconId = beaconIdOf(asset.AssetId.fromString(parsed.beacon.assetId))
  const beaconBound = bindBeacon({
    id: beaconId,
    domain: parsed.beacon.domain,
    expiryLag: parsed.beacon.expiryLag,
    readFee: parsed.beacon.readFee,
    adminPk: parsed.beacon.adminPk,
    exit: parsed.beacon.exit,
    hrp: profile.hrp,
    serverKey: client.serverKey,
    emulatorKey: client.emulatorKey,
  })
  if (beaconBound.address !== parsed.beacon.address) throw new Error('Beacon address derivation mismatch')

  const foundBeacon = await indexer.getVtxos({ scripts: [bytesToHex(beaconBound.pkScript)], spendableOnly: true })
  const holders = (foundBeacon.vtxos ?? []).filter(
    (c) =>
      !c.isSpent &&
      !c.spentBy &&
      (c.assets ?? []).some(
        (a) => a.assetId.toLowerCase() === parsed.beacon.assetId.toLowerCase() && BigInt(a.amount) === 1n,
      ),
  )
  if (!holders.length) return { result: 'waiting' }

  const ids = [...new Set([vaultCoin.txid, ...holders.map((c) => c.txid)])]
  const rawPage = await indexer.getVirtualTxs(ids)
  const byId = virtualTxsById(rawPage.txs ?? [])

  const vaultRaw = byId.get(vaultCoin.txid.toLowerCase())
  if (!vaultRaw) return { result: 'waiting' }
  const vaultPrev = Transaction.fromPSBT(base64.decode(vaultRaw))

  let bestBeacon: { coin: (typeof holders)[number]; prev: Transaction; state: Uint8Array; round: bigint } | null = null
  for (const coin of holders) {
    const raw = byId.get(coin.txid.toLowerCase())
    if (!raw) continue
    try {
      const prev = Transaction.fromPSBT(base64.decode(raw))
      const state = statePacketOf(prev)
      const decoded = decodeState(state)
      if (!bestBeacon || decoded.round > bestBeacon.round) {
        bestBeacon = { coin, prev, state, round: decoded.round }
      }
    } catch {
      continue
    }
  }
  if (!bestBeacon) return { result: 'waiting' }

  const fixing = slotFixing(bestBeacon.state, terms.expiry)
  if (!fixing) return { result: 'unfixed' }

  const payout = settlePayouts({
    kind: terms.kind,
    price: fixing.price,
    strike: terms.strike,
    collateral: terms.collateral,
    locked: BigInt(vaultCoin.value),
    readFee: parsed.beacon.readFee,
    holderScript: bound.holderPkScript,
    writerScript: bound.writerPkScript,
  })
  if ('error' in payout) throw new Error(payout.error)

  const vaultScript = new arkade.ArkadeProgramScript(predictVaultProgram(), bound.vault, {
    serverKey: client.serverKey,
    emulatorKey: client.emulatorKey,
  })
  const built = buildSettleTx({
    vault: {
      script: vaultScript,
      coin: {
        txid: vaultCoin.txid,
        vout: vaultCoin.vout,
        value: vaultCoin.value,
        prevTx: vaultPrev.toBytes(true, true),
      },
    },
    beacon: {
      script: beaconBound.script,
      coin: {
        txid: bestBeacon.coin.txid,
        vout: bestBeacon.coin.vout,
        value: bestBeacon.coin.value,
        prevTx: bestBeacon.prev.toBytes(true, true),
      },
      state: bestBeacon.state,
      id: asset.AssetId.fromString(parsed.beacon.assetId),
    },
    readFee: parsed.beacon.readFee,
    payouts: payout.payouts,
    checkpoint: client.checkpoint,
  })

  const submitted = await submitCospend(built, emulator as EmulatorProvider)
  const holderHex = bytesToHex(bound.holderPkScript)
  const holderOut = payout.payouts.find((o) => bytesToHex(o.script) === holderHex)
  return {
    result: 'settled',
    txid: submitted.txid,
    payoutSats: holderOut?.amount ?? 0n,
    settleCents: fixing.price,
  }
}

export async function refundLivePredictVault(
  pos: PredictPosition,
  profile: PredictNetworkProfile,
): Promise<{ result: string; txid?: string }> {
  const now = Math.floor(Date.now() / 1000)
  const voidAfter = pos.voidAfter || Number(PREDICT_VOID_AFTER)
  if (now < pos.expiry + voidAfter) return { result: 'early' }

  const { client, indexer, emulator } = await connectPredictClient(profile)
  if (!client.emulatorKey) throw new Error('Emulator key unavailable')
  const terms = termsFromPosition(pos, profile, client.serverKey, client.emulatorKey)
  const bound = bindPredictContracts(terms)

  const vaultScriptHex = bytesToHex(bound.vaultPkScript)
  const live = await indexer.getVtxos({ scripts: [vaultScriptHex], spendableOnly: true })
  const liveVaults = (live.vtxos ?? []).filter((c) => !c.isSpent && !c.spentBy && BigInt(c.value) >= terms.stake)
  if (!liveVaults.length) return { result: 'waiting' }
  const vaultCoin = liveVaults.find((c) => c.txid === pos.fillTxid) ?? liveVaults[0]!

  const rawPage = await indexer.getVirtualTxs([vaultCoin.txid])
  const vaultRaw = virtualTxsById(rawPage.txs ?? []).get(vaultCoin.txid.toLowerCase())
  if (!vaultRaw) return { result: 'waiting' }
  const vaultPrev = Transaction.fromPSBT(base64.decode(vaultRaw))

  const vaultScript = new arkade.ArkadeProgramScript(predictVaultProgram(), bound.vault, {
    serverKey: client.serverKey,
    emulatorKey: client.emulatorKey,
  })
  // Validate outputs before building
  refundOutputs(BigInt(vaultCoin.value), terms.stake, bound.holderPkScript, bound.writerPkScript)
  const built = buildRefundTx({
    vault: {
      script: vaultScript,
      coin: {
        txid: vaultCoin.txid,
        vout: vaultCoin.vout,
        value: vaultCoin.value,
        prevTx: vaultPrev.toBytes(true, true),
      },
    },
    stake: terms.stake,
    holderScript: bound.holderPkScript,
    writerScript: bound.writerPkScript,
    checkpoint: client.checkpoint,
  })
  const submitted = await submitCospend(built, emulator as EmulatorProvider)
  return { result: 'refunded', txid: submitted.txid }
}

export async function reboardLivePredictVault(
  pos: PredictPosition,
  profile: PredictNetworkProfile,
): Promise<{ result: 'reboarded' | 'missing'; commitmentTxid?: string }> {
  const { client, indexer } = await connectPredictClient(profile)
  if (!client.emulatorKey) throw new Error('Emulator key unavailable')
  const terms = termsFromPosition(pos, profile, client.serverKey, client.emulatorKey)
  const bound = bindPredictContracts(terms)
  const contract = client.contract(predictVaultProgram(), bound.vault)
  const page = await indexer.getVtxos({ scripts: [bytesToHex(bound.vaultPkScript)] })
  const coins = (page.vtxos ?? []).filter((c) => !c.isSpent && !c.spentBy)
  const target = (pos.fillTxid ? coins.find((c) => c.txid === pos.fillTxid) : undefined) ?? coins[0]
  if (!target) return { result: 'missing' }
  const res = await arkade.renewProgramContractOutputs(client, [{ contract, coin: target as never, fn: 'reboard' }])
  return { result: 'reboarded', commitmentTxid: res.commitmentTxid }
}
