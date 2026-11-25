import type { arkade } from '@arkade-os/sdk'
import intentArtifact from './artifacts/option_intent.artifact.json'
import predictArtifact from './artifacts/predict_vault.artifact.json'
import { bytesToHex, xOnly } from './hex'

export interface BoundContractArgs {
  intent: Record<string, bigint | Uint8Array>
  vault: Record<string, bigint | Uint8Array>
}

interface Delegation {
  templateId: string
  variables: Record<string, string>
}

function scriptNumHex(n: bigint): string {
  const out: number[] = []
  for (let v = n; v > 0n; v >>= 8n) out.push(Number(v & 0xffn))
  if (out.length && out[out.length - 1]! & 0x80) out.push(0)
  return out.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function compressedEvenKeyHex(xOnlyKey: Uint8Array): string {
  return `02${bytesToHex(xOnly(xOnlyKey))}`
}

// executord rejects composite ScriptPubKey constructor inputs; flatten them to .program + .version.
function flattenExecutorArtifact(artifact: arkade.ContractArtifact): Record<string, unknown> {
  const raw = artifact as unknown as { constructorInputs?: { name: string; type: string }[] }
  return {
    ...raw,
    constructorInputs: (raw.constructorInputs ?? []).flatMap((input) =>
      input.type === 'ScriptPubKey'
        ? [
            { name: `${input.name}.program`, type: 'bytes32' },
            { name: `${input.name}.version`, type: 'int' },
          ]
        : [input],
    ),
  }
}

function cancelIntentTemplate(artifactId: string) {
  return {
    format: 'template/v1',
    type: 'virtual',
    variables: {
      user_pk: 'pubkey',
      user_program: 'bytes32',
      solver_program: 'bytes32',
      option_program: 'bytes32',
      side: 'int',
      collateral: 'int',
      premium: 'int',
      deadline: 'int',
      exit: 'int',
    },
    inputs: [
      {
        name: 'intent',
        contract: {
          definition: { artifact: artifactId },
          arguments: {
            userPk: '<user_pk>',
            'userScript.program': '<user_program>',
            'userScript.version': '01',
            'solverScript.program': '<solver_program>',
            'solverScript.version': '01',
            'optionScript.program': '<option_program>',
            'optionScript.version': '01',
            side: '<side>',
            collateral: '<collateral>',
            premium: '<premium>',
            deadline: '<deadline>',
            exit: '<exit>',
          },
        },
        spend: { function: 'cancelAuto', leaf: 'cancelCltv' },
      },
    ],
    outputs: [
      {
        name: 'refund',
        index: 0,
        value: { from: 'intent' },
        locking: '5120<user_program>',
      },
    ],
    packets: { output_index: 1 },
  }
}

function reboardVaultTemplate(artifactId: string, renewalWindowSeconds = 86_400n) {
  return {
    format: 'template/v1',
    type: 'proof',
    variables: {
      kind: 'int',
      writer_pk: 'pubkey',
      holder_pk: 'pubkey',
      writer_program: 'bytes32',
      holder_program: 'bytes32',
      strike: 'int',
      collateral: 'int',
      stake: 'int',
      expiry: 'int',
      beacon_txid: 'bytes32',
      beacon_gidx: 'int',
      read_fee: 'int',
      backup_pk: 'pubkey',
      void_after: 'int',
      fallback_delay: 'int',
      final_exit_delay: 'int',
    },
    inputs: [
      {
        name: 'vault',
        contract: {
          definition: { artifact: artifactId },
          arguments: {
            kind: '<kind>',
            writerPk: '<writer_pk>',
            holderPk: '<holder_pk>',
            'writerScript.program': '<writer_program>',
            'writerScript.version': '01',
            'holderScript.program': '<holder_program>',
            'holderScript.version': '01',
            strike: '<strike>',
            collateral: '<collateral>',
            stake: '<stake>',
            expiry: '<expiry>',
            beaconTxid: '<beacon_txid>',
            beaconGidx: '<beacon_gidx>',
            readFee: '<read_fee>',
            backupPk: '<backup_pk>',
            voidAfter: '<void_after>',
            fallbackDelay: '<fallback_delay>',
            finalExitDelay: '<final_exit_delay>',
          },
        },
        spend: { function: 'reboard', leaf: 'reboard' },
      },
    ],
    outputs: [
      {
        name: 'renewed',
        value: { from: 'vault' },
        locking: { from: 'vault' },
      },
    ],
    packets: { unmatched: 'drop' },
    delegation: {
      schedule: {
        vault: { before_expiry_seconds: Number(renewalWindowSeconds) },
      },
    },
  }
}

class PredictExecutor {
  private readonly url: string
  private readonly templates = new Map<string, string>()

  private constructor(url: string) {
    this.url = url.replace(/\/+$/, '')
  }

  static async connect(
    url: string,
    keys: { serverKey: Uint8Array; emulatorKey: Uint8Array },
  ): Promise<PredictExecutor | undefined> {
    const clean = url.trim().replace(/\/+$/, '')
    if (!clean || clean === 'none') return undefined
    try {
      const res = await fetch(`${clean}/v1/info`, { signal: AbortSignal.timeout(5_000) })
      if (!res.ok) return undefined
      const info = (await res.json()) as Record<string, string | undefined>
      const tail = (key = '') => key.trim().toLowerCase().slice(-64)
      if (tail(info.serverPubkey) !== bytesToHex(xOnly(keys.serverKey))) return undefined
      if (tail(info.emulatorPubkey) !== bytesToHex(xOnly(keys.emulatorKey))) return undefined
      return new PredictExecutor(clean)
    } catch {
      return undefined
    }
  }

  async ensureTemplate(
    name: string,
    artifact: arkade.ContractArtifact,
    buildTemplate: (artifactId: string) => Record<string, unknown>,
  ): Promise<string | null> {
    const cached = this.templates.get(name)
    if (cached) return cached
    try {
      const aRes = await fetch(`${this.url}/v1/artifact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ document: JSON.stringify(flattenExecutorArtifact(artifact)) }),
        signal: AbortSignal.timeout(8_000),
      })
      if (!aRes.ok) return null
      const aBody = (await aRes.json()) as { artifact?: { id?: string }; id?: string }
      const artifactId = aBody.artifact?.id ?? aBody.id
      if (!artifactId) return null

      const tRes = await fetch(`${this.url}/v1/template`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ document: JSON.stringify(buildTemplate(artifactId)) }),
        signal: AbortSignal.timeout(8_000),
      })
      if (!tRes.ok) return null
      const tBody = (await tRes.json()) as { template?: { id?: string }; id?: string }
      const templateId = tBody.template?.id ?? tBody.id
      if (!templateId) return null

      this.templates.set(name, templateId)
      return templateId
    } catch {
      return null
    }
  }

  async delegate(delegation: Delegation): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/v1/delegation`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(delegation),
        signal: AbortSignal.timeout(8_000),
      })
      return res.ok
    } catch {
      return false
    }
  }
}

const executorCache = new Map<string, Promise<PredictExecutor | undefined>>()

/** Best-effort registration with executord for automatic intent refund & vault reboard. */
export async function registerPredictExecutorDelegations(input: {
  executorUrl: string
  serverKey: Uint8Array
  emulatorKey: Uint8Array
  bound: BoundContractArgs
}): Promise<{ cancel: boolean; reboard: boolean }> {
  const cleanUrl = input.executorUrl.trim().replace(/\/+$/, '')
  if (!cleanUrl || cleanUrl === 'none') return { cancel: false, reboard: false }
  try {
    let pending = executorCache.get(cleanUrl)
    if (!pending) {
      pending = PredictExecutor.connect(cleanUrl, {
        serverKey: input.serverKey,
        emulatorKey: input.emulatorKey,
      })
      executorCache.set(cleanUrl, pending)
    }
    const executor = await pending
    if (!executor) {
      executorCache.delete(cleanUrl)
      return { cancel: false, reboard: false }
    }
    const cancelId = await executor.ensureTemplate(
      'cancel_intent',
      intentArtifact as unknown as arkade.ContractArtifact,
      cancelIntentTemplate,
    )
    const cancel = cancelId
      ? await executor.delegate({
          templateId: cancelId,
          variables: {
            user_pk: compressedEvenKeyHex(input.bound.intent.userPk as Uint8Array),
            user_program: bytesToHex(input.bound.intent['userScript.program'] as Uint8Array),
            solver_program: bytesToHex(input.bound.intent['solverScript.program'] as Uint8Array),
            option_program: bytesToHex(input.bound.intent['optionScript.program'] as Uint8Array),
            side: scriptNumHex(input.bound.intent.side as bigint),
            collateral: scriptNumHex(input.bound.intent.collateral as bigint),
            premium: scriptNumHex(input.bound.intent.premium as bigint),
            deadline: scriptNumHex(input.bound.intent.deadline as bigint),
            exit: scriptNumHex(input.bound.intent.exit as bigint),
          },
        })
      : false

    const reboardId = await executor.ensureTemplate(
      'reboard_vault',
      predictArtifact as unknown as arkade.ContractArtifact,
      reboardVaultTemplate,
    )
    const reboard = reboardId
      ? await executor.delegate({
          templateId: reboardId,
          variables: {
            kind: scriptNumHex(input.bound.vault.kind as bigint),
            writer_pk: compressedEvenKeyHex(input.bound.vault.writerPk as Uint8Array),
            holder_pk: compressedEvenKeyHex(input.bound.vault.holderPk as Uint8Array),
            writer_program: bytesToHex(input.bound.vault['writerScript.program'] as Uint8Array),
            holder_program: bytesToHex(input.bound.vault['holderScript.program'] as Uint8Array),
            strike: scriptNumHex(input.bound.vault.strike as bigint),
            collateral: scriptNumHex(input.bound.vault.collateral as bigint),
            stake: scriptNumHex(input.bound.vault.stake as bigint),
            expiry: scriptNumHex(input.bound.vault.expiry as bigint),
            beacon_txid: bytesToHex(input.bound.vault.beaconTxid as Uint8Array),
            beacon_gidx: scriptNumHex(input.bound.vault.beaconGidx as bigint),
            read_fee: scriptNumHex(input.bound.vault.readFee as bigint),
            backup_pk: compressedEvenKeyHex(input.bound.vault.backupPk as Uint8Array),
            void_after: scriptNumHex(input.bound.vault.voidAfter as bigint),
            fallback_delay: scriptNumHex(input.bound.vault.fallbackDelay as bigint),
            final_exit_delay: scriptNumHex(input.bound.vault.finalExitDelay as bigint),
          },
        })
      : false

    return { cancel, reboard }
  } catch {
    return { cancel: false, reboard: false }
  }
}
