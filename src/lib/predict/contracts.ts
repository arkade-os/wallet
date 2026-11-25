import {
  arkade,
  ArkAddress,
  asset,
  buildOffchainTx,
  ConditionWitness,
  DefaultVtxo,
  EmulatorPacket,
  Extension,
  P2A,
  PrevArkTxField,
  setArkPsbtField,
  Transaction,
  UnknownPacket,
  type ArkTxInput,
  type CSVMultisigTapscript,
  type EmulatorProvider,
  type ExtensionPacket,
} from '@arkade-os/sdk'
import { base64 } from '@scure/base'
import beaconArtifact from './artifacts/attestation_beacon.artifact.json'
import intentArtifact from './artifacts/option_intent.artifact.json'
import predictArtifact from './artifacts/predict_vault.artifact.json'
import {
  BEACON_READ_FEE,
  DUST_SATS,
  MUTINYNET_EXIT,
  MUTINYNET_FALLBACK_DELAY,
  MUTINYNET_FINAL_EXIT_DELAY,
  PREDICT_VOID_AFTER,
  PRICE_MAX,
  type PredictKind,
} from './constants'
import { bytesToHex, hexToBytes, xOnly } from './hex'
import { holderPayoff, settlementOutputs } from './pricing'

export const STATE_TYPE = 32
export const STATE_SIZE = 329
export const SLOT_COUNT = 8
export const SLOT_SIZE = 40
export const SLOTS_AT = 9
const SLOT_OFFSETS = Array.from({ length: SLOT_COUNT }, (_, i) => SLOTS_AT + SLOT_SIZE * i)

export type BeaconId = { txid: Uint8Array; gidx: bigint }

export interface BeaconSlot {
  expiry: bigint
  value: Uint8Array
}

export interface BeaconState {
  version: number
  round: bigint
  slots: BeaconSlot[]
}

export interface BeaconSpec {
  assetId: string
  address: string
  domain: Uint8Array
  expiryLag: bigint
  readFee: bigint
  adminPk: Uint8Array
  exit: bigint
}

export interface PredictTerms {
  kind: PredictKind
  strike: bigint
  collateral: bigint
  stake: bigint
  expiry: bigint
  deadline: bigint
  exit: bigint
  writerPk: Uint8Array
  holderPk: Uint8Array
  holderPayoutKey?: Uint8Array
  backupPk?: Uint8Array
  voidAfter?: bigint
  fallbackDelay?: bigint
  finalExitDelay?: bigint
  beacon: BeaconId
  readFee?: bigint
  serverKey: Uint8Array
  emulatorKey: Uint8Array
  hrp: string
}

export interface BoundPredictContracts {
  intentAddress: string
  vaultAddress: string
  writerPkScript: Uint8Array
  holderPkScript: Uint8Array
  userPkScript: Uint8Array
  solverPkScript: Uint8Array
  vaultPkScript: Uint8Array
  intentPkScript: Uint8Array
  intent: Record<string, bigint | Uint8Array>
  vault: Record<string, bigint | Uint8Array>
}

export function exitSequence(seconds: bigint): bigint {
  if (seconds <= 0n || seconds % 512n !== 0n) {
    throw new Error(`exit must be a positive multiple of 512 seconds, got ${seconds}`)
  }
  const units = seconds / 512n
  if (units > 0xffffn) throw new Error(`exit ${seconds} exceeds BIP68 seconds range`)
  return (1n << 22n) | units
}

export function beaconIdOf(id: asset.AssetId): BeaconId {
  return { txid: Uint8Array.from(id.txid).reverse(), gidx: BigInt(id.groupIndex) }
}

export function predictVaultProgram() {
  return arkade.programFromArtifact(predictArtifact as unknown as arkade.ContractArtifact)
}

export function intentProgram() {
  return arkade.programFromArtifact(intentArtifact as unknown as arkade.ContractArtifact)
}

export function beaconProgram() {
  return arkade.programFromArtifact(beaconArtifact as unknown as arkade.ContractArtifact)
}

export function payoutVtxo(pubKey: Uint8Array, serverKey: Uint8Array, exit: bigint) {
  return new DefaultVtxo.Script({
    pubKey: xOnly(pubKey),
    serverPubKey: xOnly(serverKey),
    csvTimelock: { type: 'seconds', value: exit },
  })
}

function directPayout(key: Uint8Array): { tweakedPublicKey: Uint8Array; pkScript: Uint8Array } {
  const tweakedPublicKey = xOnly(key)
  const pkScript = new Uint8Array(34)
  pkScript[0] = 0x51
  pkScript[1] = 0x20
  pkScript.set(tweakedPublicKey, 2)
  return { tweakedPublicKey, pkScript }
}

function scriptArg(name: string, program: Uint8Array): Record<string, bigint | Uint8Array> {
  return { [`${name}.program`]: program, [`${name}.version`]: 1n }
}

export function verifiedSignerKey(
  address: string,
  pubkey: string | undefined,
  serverKey: Uint8Array,
  exit: bigint,
): Uint8Array | undefined {
  const hex = pubkey?.trim().toLowerCase() ?? ''
  if (!/^[0-9a-f]{64}$/.test(hex) || hex === '0'.repeat(64)) return undefined
  const decoded = ArkAddress.decode(address.trim())
  const candidate = hexToBytes(hex)
  return bytesToHex(payoutVtxo(candidate, serverKey, exit).pkScript) === bytesToHex(decoded.pkScript)
    ? candidate
    : undefined
}

export function backupKeyMatches(
  quoteBackupPk: string,
  deskPk: string,
  emulatorKey: Uint8Array,
  pinned: string | null,
  network: string,
): boolean {
  const candidate = quoteBackupPk.trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(candidate)) return false
  if (candidate === deskPk.trim().toLowerCase()) return false
  const pinnedClean = pinned?.trim().toLowerCase() || ''
  if ((network === 'bitcoin' || network === 'mainnet') && !pinnedClean) return false
  const expected = pinnedClean || bytesToHex(xOnly(emulatorKey))
  return candidate === expected
}

export function bindPredictContracts(terms: PredictTerms): BoundPredictContracts {
  const serverKey = xOnly(terms.serverKey)
  const writerPk = xOnly(terms.writerPk)
  const holderPk = xOnly(terms.holderPk)
  if (terms.emulatorKey.length !== 33) throw new Error('emulatorKey must be 33 bytes')
  if (terms.beacon.txid.length !== 32) throw new Error('beacon txid must be 32 bytes')

  const writer = payoutVtxo(writerPk, serverKey, terms.exit)
  const holder = terms.holderPayoutKey
    ? directPayout(terms.holderPayoutKey)
    : payoutVtxo(holderPk, serverKey, terms.exit)
  const keys = { serverKey, emulatorKey: terms.emulatorKey }

  const voidAfter = terms.voidAfter ?? PREDICT_VOID_AFTER
  const fallbackDelay = terms.fallbackDelay ?? MUTINYNET_FALLBACK_DELAY
  const finalExitDelay = terms.finalExitDelay ?? MUTINYNET_FINAL_EXIT_DELAY
  if (voidAfter <= 0n) throw new Error('voidAfter must be positive')
  if (fallbackDelay < terms.exit) throw new Error('fallbackDelay must be at least exit')
  if (finalExitDelay <= fallbackDelay) throw new Error('finalExitDelay must exceed fallbackDelay')

  const backupPk = xOnly(terms.backupPk ?? terms.emulatorKey)
  const vaultArgs: Record<string, bigint | Uint8Array> = {
    kind: BigInt(terms.kind),
    writerPk,
    holderPk,
    ...scriptArg('writerScript', writer.tweakedPublicKey),
    ...scriptArg('holderScript', holder.tweakedPublicKey),
    strike: terms.strike,
    collateral: terms.collateral,
    stake: terms.stake,
    expiry: terms.expiry,
    beaconTxid: terms.beacon.txid,
    beaconGidx: terms.beacon.gidx,
    readFee: terms.readFee ?? BEACON_READ_FEE,
    backupPk,
    voidAfter,
    fallbackDelay: exitSequence(fallbackDelay),
    finalExitDelay: exitSequence(finalExitDelay),
    server: serverKey,
  }
  const vaultScript = new arkade.ArkadeProgramScript(predictVaultProgram(), vaultArgs, keys)

  const intentArgs: Record<string, bigint | Uint8Array> = {
    userPk: holderPk,
    ...scriptArg('userScript', holder.tweakedPublicKey),
    ...scriptArg('solverScript', writer.tweakedPublicKey),
    ...scriptArg('optionScript', vaultScript.tweakedPublicKey),
    side: 1n,
    collateral: terms.collateral,
    premium: terms.stake,
    deadline: terms.deadline,
    exit: exitSequence(terms.exit),
    server: serverKey,
  }
  const intentScript = new arkade.ArkadeProgramScript(intentProgram(), intentArgs, keys)

  return {
    intentAddress: intentScript.address(terms.hrp, serverKey).encode(),
    vaultAddress: vaultScript.address(terms.hrp, serverKey).encode(),
    writerPkScript: writer.pkScript,
    holderPkScript: holder.pkScript,
    userPkScript: holder.pkScript,
    solverPkScript: writer.pkScript,
    vaultPkScript: vaultScript.pkScript,
    intentPkScript: intentScript.pkScript,
    intent: intentArgs,
    vault: vaultArgs,
  }
}

export function bin2num(bytes: Uint8Array): bigint {
  if (bytes.length === 0) return 0n
  let value = 0n
  for (let i = bytes.length - 1; i >= 0; i--) {
    value = (value << 8n) | BigInt(i === bytes.length - 1 ? bytes[i]! & 0x7f : bytes[i]!)
  }
  return bytes[bytes.length - 1]! & 0x80 ? -value : value
}

export function decodeState(bytes: Uint8Array): BeaconState {
  if (bytes.length !== STATE_SIZE) throw new Error(`state is ${bytes.length} bytes, want ${STATE_SIZE}`)
  return {
    version: bytes[0]!,
    round: bin2num(bytes.subarray(1, 9)),
    slots: SLOT_OFFSETS.map((at) => ({
      expiry: bin2num(bytes.subarray(at, at + 8)),
      value: bytes.slice(at + 8, at + SLOT_SIZE),
    })),
  }
}

export function statePacketOf(tx: Transaction): Uint8Array {
  const packet = Extension.fromTx(tx).getPacketByType(STATE_TYPE)
  if (!packet) throw new Error('state packet missing')
  return packet.serialize()
}

export function slotFixing(state: Uint8Array, expiry: bigint): { price: bigint; time: bigint } | null {
  let decoded: BeaconState
  try {
    decoded = decodeState(state)
  } catch {
    return null
  }
  if (decoded.version !== 1) return null
  const slot = decoded.slots.find((item) => item.expiry === expiry)
  if (!slot || slot.value.length < 16) return null
  const price = bin2num(slot.value.subarray(0, 8))
  const time = bin2num(slot.value.subarray(8, 16))
  if (price <= 0n || price > PRICE_MAX || time < expiry || time > expiry + 60n) return null
  return { price, time }
}

export function slotPrice(state: Uint8Array, expiry: bigint): bigint | null {
  return slotFixing(state, expiry)?.price ?? null
}

export function parseOracleBeacon(
  body: unknown,
  beaconTxid?: string,
  gidx = 0,
  expectedHrp?: string,
): { ok: true; beacon: BeaconSpec } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'oracle status' }
  const root = body as Record<string, unknown>
  const issue = typeof root.issueTxid === 'string' ? root.issueTxid.toLowerCase() : ''
  if (!/^[0-9a-f]{64}$/.test(issue)) return { ok: false, error: 'oracle beacon' }
  if (beaconTxid && issue !== beaconTxid.toLowerCase()) return { ok: false, error: 'oracle beacon' }
  if (typeof root.assetId !== 'string') return { ok: false, error: 'oracle asset' }
  let parsed: ReturnType<typeof asset.AssetId.fromString>
  try {
    parsed = asset.AssetId.fromString(root.assetId)
  } catch {
    return { ok: false, error: 'oracle asset' }
  }
  if (bytesToHex(parsed.txid) !== issue) return { ok: false, error: 'oracle asset' }
  if (beaconTxid && Number(parsed.groupIndex) !== gidx) return { ok: false, error: 'oracle beacon' }
  const addr = typeof root.address === 'string' ? root.address : ''
  const validAddr = expectedHrp
    ? addr.startsWith(`${expectedHrp}1`)
    : addr.startsWith('ark1') || addr.startsWith('tark1')
  if (!validAddr) return { ok: false, error: 'oracle address' }
  const args = root.args as Record<string, unknown> | undefined
  if (!args || typeof args !== 'object') return { ok: false, error: 'oracle args' }
  const ctrl = typeof args.ctrlTxid === 'string' ? args.ctrlTxid.toLowerCase() : ''
  if (ctrl !== bytesToHex(beaconIdOf(parsed).txid)) return { ok: false, error: 'ctrl txid' }

  const toBig = (val: unknown): bigint | null => {
    if (typeof val === 'number' && Number.isSafeInteger(val) && val >= 0) return BigInt(val)
    if (typeof val === 'string' && /^[0-9]+$/.test(val)) return BigInt(val)
    return null
  }
  const expiryLag = toBig(args.expiryLag)
  const readFee = toBig(args.readFee)
  const exit = toBig(args.exit)
  const domainHex = typeof args.domain === 'string' ? args.domain : ''
  const adminPkHex = typeof args.adminPk === 'string' ? args.adminPk : ''
  if (
    expiryLag == null ||
    readFee == null ||
    exit == null ||
    domainHex.length === 0 ||
    domainHex.length % 2 !== 0 ||
    !/^[0-9a-fA-F]+$/.test(domainHex) ||
    !/^[0-9a-fA-F]{64}$/.test(adminPkHex)
  ) {
    return { ok: false, error: 'oracle args' }
  }
  return {
    ok: true,
    beacon: {
      assetId: parsed.toString(),
      address: addr,
      domain: hexToBytes(domainHex),
      expiryLag,
      readFee,
      adminPk: hexToBytes(adminPkHex),
      exit,
    },
  }
}

export function bindBeacon(input: {
  id: BeaconId
  domain: Uint8Array
  expiryLag: bigint
  readFee: bigint
  adminPk: Uint8Array
  exit?: bigint
  hrp: string
  serverKey: Uint8Array
  emulatorKey: Uint8Array
}) {
  const serverKey = xOnly(input.serverKey)
  const args: Record<string, bigint | Uint8Array> = {
    ctrlTxid: input.id.txid,
    ctrlGidx: input.id.gidx,
    domain: input.domain,
    expiryLag: input.expiryLag,
    readFee: input.readFee,
    adminPk: xOnly(input.adminPk),
    exit: exitSequence(input.exit ?? MUTINYNET_EXIT),
    server: serverKey,
  }
  const script = new arkade.ArkadeProgramScript(beaconProgram(), args, {
    serverKey,
    emulatorKey: input.emulatorKey,
  })
  return {
    address: script.address(input.hrp, serverKey).encode(),
    pkScript: script.pkScript,
    script,
  }
}

// --- Cospend builders for manual settle & void refund ---

type ProgramScript = InstanceType<typeof arkade.ArkadeProgramScript>
type CoinRef = { txid: string; vout: number; value: number | bigint; prevTx: Uint8Array }

interface BuiltCospend {
  arkTx: Transaction
  checkpoints: Transaction[]
}

function anchorIndex(tx: Transaction): number {
  for (let i = tx.outputsLength - 1; i >= 0; i--) {
    const script = tx.getOutput(i)?.script
    if (script && bytesToHex(script) === bytesToHex(P2A.script)) return i
  }
  throw new Error('anchor output missing')
}

function buildCovenantTx(
  spends: { script: ProgramScript; fn: string; callArgs?: Record<string, bigint | Uint8Array>; coin: CoinRef }[],
  outputs: { script: Uint8Array; amount: bigint }[],
  packets: ExtensionPacket[],
  checkpoint: CSVMultisigTapscript.Type,
): BuiltCospend {
  const inputs: ArkTxInput[] = []
  const entries: { vin: number; script: Uint8Array; witness: Uint8Array }[] = []
  const conditions = new Map<number, Uint8Array[]>()

  spends.forEach((spend, vin) => {
    const fn = spend.script.functionByName(spend.fn)
    if (!fn || !fn.arkadeScript) throw new Error(`${spend.script.program.name}.${spend.fn} is not a covenant`)
    const callArgs = spend.callArgs ?? {}
    const stack = (fn.def.arkadeScript?.witness ?? []).map((ref) =>
      arkade.witnessRefToBytes(ref, callArgs, spend.script.args),
    )
    const condition = (fn.def.tapscript.witness ?? []).map((ref) =>
      arkade.witnessRefToBytes(ref, callArgs, spend.script.args),
    )
    inputs.push({
      txid: spend.coin.txid,
      vout: spend.coin.vout,
      value: Number(spend.coin.value),
      tapLeafScript: fn.tapLeafScript,
      tapTree: spend.script.encode(),
    })
    entries.push({ vin, script: fn.arkadeScript, witness: ConditionWitness.encode(stack)[1] })
    if (condition.length > 0) conditions.set(vin, condition)
  })

  const { arkTx, checkpoints } = buildOffchainTx(inputs, outputs, checkpoint)
  spends.forEach((spend, vin) => {
    setArkPsbtField(arkTx, vin, PrevArkTxField, spend.coin.prevTx)
    const condition = conditions.get(vin)
    if (condition) {
      setArkPsbtField(arkTx, vin, ConditionWitness, condition)
      setArkPsbtField(checkpoints[vin]!, 0, ConditionWitness, condition)
    }
  })

  const extOut = Extension.create([...packets, EmulatorPacket.create(entries)]).txOut()
  const anchor = anchorIndex(arkTx)
  const last = arkTx.getOutput(anchor)
  arkTx.updateOutput(anchor, { script: extOut.script, amount: extOut.amount })
  arkTx.addOutput({ script: last!.script!, amount: last!.amount ?? 0n })

  return { arkTx, checkpoints }
}

export function settlePayouts(input: {
  kind: PredictKind
  price: bigint
  strike: bigint
  collateral: bigint
  locked: bigint
  readFee?: bigint
  holderScript: Uint8Array
  writerScript: Uint8Array
}): { payouts: { script: Uint8Array; amount: bigint }[] } | { error: string } {
  if (input.locked < input.collateral) return { error: 'underfunded' }
  const readFee = input.readFee ?? BEACON_READ_FEE
  if (input.locked < readFee) return { error: 'fee' }
  const gross = holderPayoff(input.kind, input.price, input.strike, input.collateral)
  const split = settlementOutputs(gross, input.locked, readFee)
  if (split.mode === 'split') {
    return {
      payouts: [
        { script: input.holderScript, amount: split.holder },
        { script: input.writerScript, amount: split.writer },
      ],
    }
  }
  if (split.mode === 'writer') return { payouts: [{ script: input.writerScript, amount: split.writer }] }
  return { payouts: [{ script: input.holderScript, amount: split.holder }] }
}

export function buildSettleTx(input: {
  vault: { script: ProgramScript; coin: CoinRef }
  beacon: { script: ProgramScript; coin: CoinRef; state: Uint8Array; id: asset.AssetId }
  readFee: bigint
  payouts: { script: Uint8Array; amount: bigint }[]
  checkpoint: CSVMultisigTapscript.Type
}): BuiltCospend {
  const unitTransfer = asset.Packet.create([
    asset.AssetGroup.create(
      input.beacon.id,
      null,
      [asset.AssetInput.create(1, 1n)],
      [asset.AssetOutput.create(0, 1n)],
      [],
    ),
  ])
  return buildCovenantTx(
    [
      { script: input.vault.script, fn: 'settle', coin: input.vault.coin },
      { script: input.beacon.script, fn: 'read', callArgs: { selfIndex: 1n }, coin: input.beacon.coin },
    ],
    [
      { script: input.beacon.script.pkScript, amount: BigInt(input.beacon.coin.value) + input.readFee },
      ...input.payouts,
    ],
    [unitTransfer, new UnknownPacket(STATE_TYPE, input.beacon.state)],
    input.checkpoint,
  )
}

export function refundOutputs(
  locked: bigint,
  stake: bigint,
  holderScript: Uint8Array,
  writerScript: Uint8Array,
): { script: Uint8Array; amount: bigint }[] {
  if (stake <= DUST_SATS) throw new Error('stake must exceed dust')
  if (locked < stake) throw new Error('vault underfunded for stake refund')
  const house = locked - stake
  if (house > DUST_SATS) {
    return [
      { script: holderScript, amount: stake },
      { script: writerScript, amount: house },
    ]
  }
  return [{ script: holderScript, amount: locked }]
}

export function buildRefundTx(input: {
  vault: { script: ProgramScript; coin: CoinRef }
  stake: bigint
  holderScript: Uint8Array
  writerScript: Uint8Array
  checkpoint: CSVMultisigTapscript.Type
}): BuiltCospend {
  const outputs = refundOutputs(BigInt(input.vault.coin.value), input.stake, input.holderScript, input.writerScript)
  return buildCovenantTx(
    [{ script: input.vault.script, fn: 'refund', coin: input.vault.coin }],
    outputs,
    [],
    input.checkpoint,
  )
}

export async function submitCospend(
  built: BuiltCospend,
  emulator: Pick<EmulatorProvider, 'submitTx'>,
): Promise<{ txid: string; signedArkTx: string }> {
  const res = await emulator.submitTx(
    base64.encode(built.arkTx.toPSBT()),
    built.checkpoints.map((cp) => base64.encode(cp.toPSBT())),
  )
  return { txid: Transaction.fromPSBT(base64.decode(res.signedArkTx)).id, signedArkTx: res.signedArkTx }
}
