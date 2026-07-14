import {
  classifyAgainstSignerSet,
  decodeTapscript,
  MultisigTapscript,
  signerSetFromInfo,
  VtxoScript,
  type SignerSet,
  type SignerStatus,
  type TapLeafScript,
} from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { AspInfo } from '../providers/asp'
import { toXOnlyHex } from './keys'

/**
 * Minimal coin shape accepted by the helpers below, satisfied by
 * ExtendedCoin, ExtendedVirtualCoin and Vtxo alike.
 */
export type SignerCoin = {
  tapTree?: Uint8Array
  forfeitTapLeafScript?: TapLeafScript
}

export type CoinSignerInfo = {
  serverPubKey: string // x-only, 64 hex chars
  status: SignerStatus | null // null when the signer set is unavailable
}

/**
 * Trailing digits shown in the UI. The x-only tail is identical to the
 * compressed-key tail arkd prints in INVALID_VTXO_SCRIPT errors, so users can
 * match rows against server error messages.
 */
export const signerKeyTail = (xOnlyHex: string): string => xOnlyHex.slice(-8)

/** Null-safe signer set builder (signerSetFromInfo throws on blank signerPubkey). */
export const buildSignerSet = (aspInfo?: AspInfo | null): SignerSet | null => {
  if (!aspInfo?.signerPubkey) return null
  try {
    return signerSetFromInfo(aspInfo)
  } catch {
    return null
  }
}

// A TapLeafScript's second element is the raw script plus a trailing leaf
// version byte (mirrors the SDK's internal scriptFromTapLeafScript).
const scriptFromTapLeaf = (leaf: TapLeafScript): Uint8Array => leaf[1].subarray(0, leaf[1].length - 1)

/**
 * Collect x-only hex pubkeys from plain-multisig (forfeit-shaped) leaves.
 * Primary source is the coin's own forfeitTapLeafScript — exactly the leaf
 * whose server key must cosign a settle. Fallback: scan all tapTree leaves.
 */
const forfeitKeyLists = (coin: SignerCoin): string[][] => {
  const lists: string[][] = []
  const pushIfMultisig = (script: Uint8Array) => {
    try {
      const tapscript = decodeTapscript(script)
      if (MultisigTapscript.is(tapscript)) {
        lists.push(tapscript.params.pubkeys.map((pk) => toXOnlyHex(hex.encode(pk))))
      }
    } catch {
      // non-ark or unparseable leaf — skip
    }
  }
  if (coin.forfeitTapLeafScript) pushIfMultisig(scriptFromTapLeaf(coin.forfeitTapLeafScript))
  if (lists.length === 0 && coin.tapTree) {
    for (const script of VtxoScript.decode(coin.tapTree).scripts) pushIfMultisig(script)
  }
  return lists
}

/**
 * Extract the server signer pubkey (x-only hex) embedded in a coin's script.
 * Preference order: the key that classifies as a known (active or deprecated)
 * signer, then any key that is not the user's own, then the last pubkey of the
 * first forfeit leaf (DefaultVtxo encodes [user, server]).
 * Returns null on any decode failure — never throws.
 */
export const extractServerPubKey = (
  coin: SignerCoin,
  signerSet?: SignerSet | null,
  userPubKeyHex?: string,
): string | null => {
  try {
    const lists = forfeitKeyLists(coin)
    if (lists.length === 0) return null
    const allKeys = lists.flat()
    if (signerSet) {
      for (const key of allKeys) {
        try {
          if (classifyAgainstSignerSet(key, signerSet).status !== 'UNKNOWN_SIGNER') return key
        } catch {
          // malformed key — keep looking
        }
      }
    }
    const userXOnly = userPubKeyHex ? toXOnlyHex(userPubKeyHex) : undefined
    if (userXOnly) {
      const notUser = allKeys.find((key) => key !== userXOnly)
      if (notUser) return notUser
    }
    const first = lists[0]
    return first[first.length - 1] ?? null
  } catch {
    return null
  }
}

/**
 * Extract and classify a coin's embedded server signer against the operator's
 * advertised signer set. Returns null when the key cannot be extracted;
 * status is null when no signer set is available.
 */
export const classifyCoin = (
  coin: SignerCoin,
  signerSet: SignerSet | null,
  userPubKeyHex?: string,
): CoinSignerInfo | null => {
  const serverPubKey = extractServerPubKey(coin, signerSet, userPubKeyHex)
  if (!serverPubKey) return null
  if (!signerSet) return { serverPubKey, status: null }
  try {
    return { serverPubKey, status: classifyAgainstSignerSet(serverPubKey, signerSet).status }
  } catch {
    return null
  }
}

/**
 * Split coins into cosignable vs excluded. Only EXPIRED (past-cutoff
 * deprecated signer) coins are excluded: arkd refuses to cosign them, and the
 * SDK recovers them automatically after the server sweeps their batch.
 * MIGRATABLE/DUE_NOW coins can still be cosigned pre-cutoff and stay in;
 * UNKNOWN_SIGNER stays in (fail-open). Without a signer set nothing is
 * filtered, matching previous behavior.
 */
export const partitionByExpiredSigner = <T extends SignerCoin>(
  coins: T[],
  signerSet: SignerSet | null,
): { keep: T[]; excluded: T[] } => {
  if (!signerSet) return { keep: coins, excluded: [] }
  const keep: T[] = []
  const excluded: T[] = []
  for (const coin of coins) {
    if (classifyCoin(coin, signerSet)?.status === 'EXPIRED') excluded.push(coin)
    else keep.push(coin)
  }
  return { keep, excluded }
}
